import React, { useEffect, useState } from 'react';
import { fetchVideos, deleteVideo, getVideoStreamUrl } from '../../lib/api/video';
import type { VideoCategory, PlatformVideo } from '../../lib/api/video';
import toast from 'react-hot-toast';
import { FaPlay, FaClock, FaTimes, FaTrash, FaSpinner } from 'react-icons/fa';

interface VideoCarouselProps {
    category: VideoCategory;
    userRole: string; // The currently logged in user's role
    title: string;
    subtitle?: string;
    allowDelete?: boolean; // Let SysAdmins/AcadAdmins delete videos from the carousel
}

const SignedThumbnail: React.FC<{ videoId: string; initialUrl: string | null; category: string }> = ({ videoId, initialUrl, category }) => {
    const [currentUrl, setCurrentUrl] = useState<string | null>(initialUrl);
    const [isSigned, setIsSigned] = useState(false);

    const handleImageError = async () => {
        if (isSigned) return; // Don't loop if signing still fails

        console.log(`[SignedThumbnail] Initial access failed for ${videoId}. Requesting secure bridge...`);
        const { url, thumbnailUrl } = await getVideoStreamUrl(videoId);

        if (thumbnailUrl) {
            setCurrentUrl(thumbnailUrl);
            setIsSigned(true);
        } else {
            // If even signed URL fails, fallback to null to show gradient
            setCurrentUrl(null);
        }
    };

    if (!currentUrl) {
        return <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent animate-pulse" />;
    }

    return (
        <img
            src={currentUrl}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
            alt=""
            onError={handleImageError}
        />
    );
};

export const VideoCarousel: React.FC<VideoCarouselProps> = ({ category, userRole, title, subtitle, allowDelete }) => {
    const [videos, setVideos] = useState<PlatformVideo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState<PlatformVideo | null>(null);
    const [activeStreamUrl, setActiveStreamUrl] = useState<string | null>(null);
    const [isGeneratingStream, setIsGeneratingStream] = useState(false);

    useEffect(() => {
        loadVideos();
    }, [category, userRole]);

    const loadVideos = async () => {
        setIsLoading(true);
        const { data } = await fetchVideos(category, userRole);
        if (data) setVideos(data);
        setIsLoading(false);
    };

    const handleDelete = async (video: PlatformVideo, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to permanently delete "${video.title}"?`)) return;

        const toastId = toast.loading('Purging video from R2 network and Database...');
        const { success, error } = await deleteVideo(video.id);
        if (success) {
            toast.success('Video purged successfully.', { id: toastId });
            setVideos(prev => prev.filter(v => v.id !== video.id));
        } else {
            toast.error('Purge failed. Network node rejection.', { id: toastId });
        }
    };

    if (isLoading) {
        return (
            <div className="w-full bg-white rounded-2xl border border-slate-100 p-8 flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dyci-blue"></div>
            </div>
        );
    }

    if (videos.length === 0) return null; // Hide container entirely if no authorized videos

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
            </div>

            {/* Carousel container */}
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-200">
                {videos.map(video => (
                    <div
                        key={video.id}
                        className="snap-start shrink-0 w-[240px] group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer overflow-hidden flex flex-col"
                        onClick={async () => {
                            setSelectedVideo(video);
                            setIsGeneratingStream(true);
                            const { url } = await getVideoStreamUrl(video.id);
                            if (url) {
                                setActiveStreamUrl(url);
                            } else {
                                toast.error('Secure stream link expired. Please re-establish connection.');
                                setSelectedVideo(null);
                            }
                            setIsGeneratingStream(false);
                        }}
                    >
                        {/* Thumbnail Background / Cover Card */}
                        <div className={`h-32 flex items-center justify-center relative overflow-hidden transition-all duration-500
                            ${!video.thumbnail_url ? (video.category === 'INSTITUTIONAL' ? 'bg-gradient-to-br from-indigo-700 via-blue-800 to-indigo-900' : 'bg-gradient-to-br from-rose-500 via-rose-600 to-pink-700') : 'bg-slate-900'}
                        `}>
                            <SignedThumbnail
                                videoId={video.id}
                                initialUrl={video.thumbnail_url}
                                category={video.category}
                            />

                            {/* Overlay effects */}
                            <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/0 transition-colors" />

                            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform shadow-lg z-10">
                                <FaPlay className="text-white ml-1 shadow-sm" />
                            </div>

                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-950/70 backdrop-blur-md rounded-lg text-[9px] font-bold text-white tracking-wider flex items-center space-x-1.5 z-10 border border-white/10 shadow-xl">
                                <FaClock className="text-[8px] text-blue-300" />
                                <span>{video.duration || 'Stream'}</span>
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="p-4 flex-1 flex flex-col">
                            <h4 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">{video.title}</h4>
                            <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-1">
                                {video.description || 'Institutional Broadcast'}
                            </p>

                            <div className="mt-auto pt-3 flex items-center justify-between">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    {(video as any).uploader?.first_name} {(video as any).uploader?.last_name}
                                </span>

                                {allowDelete && (
                                    <button
                                        onClick={(e) => handleDelete(video, e)}
                                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Delete Broadcast"
                                    >
                                        <FaTrash className="text-xs" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Video Player Modal Overlay */}
            {selectedVideo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-200">
                    <div className="w-full max-w-5xl bg-black rounded-3xl overflow-hidden shadow-2xl relative border border-slate-800">

                        {/* Top controls */}
                        <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-start pointer-events-none">
                            <div className="pointer-events-auto">
                                <h2 className="text-white font-bold tracking-wide drop-shadow-md">{selectedVideo.title}</h2>
                                <span className="text-white/70 text-xs font-medium tracking-widest uppercase mt-0.5 inline-block">
                                    {selectedVideo.category} BROADCAST
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedVideo(null);
                                    setActiveStreamUrl(null);
                                }}
                                className="h-10 w-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors pointer-events-auto"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {isGeneratingStream ? (
                            <div className="w-full aspect-video flex flex-col items-center justify-center bg-slate-900 gap-4">
                                <FaSpinner className="animate-spin text-3xl text-dyci-blue" />
                                <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Opening Secure Pipeline...</p>
                            </div>
                        ) : activeStreamUrl ? (
                            <video
                                src={activeStreamUrl}
                                autoPlay
                                controls
                                controlsList="nodownload"
                                className="w-full aspect-video object-contain bg-black"
                            >
                                Your browser does not support the video network stream.
                            </video>
                        ) : (
                            <div className="w-full aspect-video flex items-center justify-center bg-slate-900">
                                <p className="text-rose-500 text-xs font-bold uppercase">Transmission Interrupted</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
