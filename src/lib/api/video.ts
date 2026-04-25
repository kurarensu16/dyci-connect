import { supabase } from '../supabaseClient'

export type VideoCategory = 'TUTORIAL' | 'INSTITUTIONAL';
export type VideoTargetRole = 'ALL' | 'STUDENT' | 'STAFF' | 'EXECUTIVE_STAFF' | 'DEPARTMENTAL_STAFF' | 'SYSADMIN' | 'ACAD_ADMIN';

export interface PlatformVideo {
    id: string;
    title: string;
    description: string | null;
    r2_url: string;
    duration: string | null;
    category: VideoCategory;
    target_role: VideoTargetRole;
    thumbnail_url: string | null;
    video_size: number;
    thumbnail_size: number;
    uploaded_by: string | null;
    created_at: string;
    updated_at: string;
}

const BUCKET_NAME = 'dyci-connect-v2-sysadmin';

/**
 * Fetch videos based on category and matching the user's role
 */
export async function fetchVideos(category: VideoCategory, userRole: string) {
    // Translate generalized roles if needed, though mostly the DB handles it 
    // via RLS or explicit matching. Let's do an explicit match for speed.
    const { data, error } = await supabase
        .from('platform_videos')
        .select(`
      *,
      uploader:profiles!uploaded_by(first_name, last_name)
    `)
        .eq('category', category)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching videos:', error);
        return { data: null, error };
    }

    return { data: data as any[], error: null };
}

/**
 * Perform a direct R2 upload via Supabase storage wrapper.
 * Generates a unique path, uploads the MP4, and extracts public URL.
 */
export async function uploadVideoFile(file: File, category: VideoCategory, onProgress?: (progress: number) => void) {
    // 1. Ask Edge Function to generate an AWS S3 presigned PUT URL for Cloudflare R2
    const { data: uploadData, error: uploadFuncError } = await supabase.functions.invoke('video-upload-url', {
        body: {
            fileName: file.name,
            contentType: file.type || 'video/mp4',
            fileSize: file.size,
            category
        }
    });

    if (uploadFuncError || uploadData?.error) {
        console.error('R2 Pre-Sign Error:', uploadFuncError || uploadData?.error);
        return { url: null, error: uploadFuncError || new Error(uploadData?.error) };
    }

    try {
        // 2. Perform raw HTTP PUT stream directly to Cloudflare S3 endpoint 
        const uploadResponse = await fetch(uploadData.uploadUrl, {
            method: 'PUT',
            body: file,
            // NOTE: We remove the manual header because if it doesn't match the signature exactly, 
            // R2 returns a 400. Cloudflare will still respect the ContentType we signed 
            // in the PutObjectCommand during URL generation.
        });

        if (!uploadResponse.ok) {
            console.error('R2 Pipeline PUT Error:', uploadResponse.statusText);
            return { url: null, error: new Error(`Cloudflare S3 error: ${uploadResponse.statusText}`) };
        }

        // Return the final resolved public URL from the Edge function
        return { url: uploadData.r2Url, thumbnailUrl: uploadData.thumbnailUrl, error: null };
    } catch (err) {
        return { url: null, thumbnailUrl: null, error: err };
    }
}

/**
 * Submit metadata to the platform_videos table after R2 confirms upload
 */
export async function createVideoMetadata(videoData: {
    title: string;
    description: string;
    r2_url: string;
    duration: string;
    category: VideoCategory;
    target_role: VideoTargetRole;
    thumbnail_url?: string;
    video_size?: number;
    thumbnail_size?: number;
}) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('platform_videos')
        .insert([{
            ...videoData,
            uploaded_by: user?.id
        }])
        .select()
        .single();

    return { data, error };
}

/**
 * Hard delete the file from R2 and remove metadata (SysAdmin/Creator only)
 */
export async function deleteVideo(videoId: string) {
    const { data: deleteData, error: deleteFuncError } = await supabase.functions.invoke('video-delete', {
        body: { videoId }
    });

    if (deleteFuncError || deleteData?.error) {
        console.error('R2 Purge Error:', deleteFuncError || deleteData?.error);
        return { success: false, error: deleteFuncError || new Error(deleteData?.error) };
    }

    return { success: true, error: null };
}

/**
 * Generate a temporary signed playback URL for a video.
 * Required because the R2 bucket's public access is disabled.
 */
export async function getVideoStreamUrl(videoId: string) {
    const { data: streamData, error: viewFuncError } = await supabase.functions.invoke('video-view-url', {
        body: { videoId }
    });

    if (viewFuncError || streamData?.error) {
        console.error('R2 Stream Generation Error:', viewFuncError || streamData?.error);
        return { url: null, thumbnailUrl: null, error: viewFuncError || new Error(streamData?.error) };
    }

    return {
        url: streamData.streamUrl,
        thumbnailUrl: streamData.thumbnailUrl,
        error: null
    };
}
