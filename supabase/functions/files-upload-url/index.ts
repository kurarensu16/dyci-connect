import { createClient } from "npm:@supabase/supabase-js@2";
import { PutObjectCommand } from "npm:@aws-sdk/client-s3@3.758.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.758.0";
import { bucket, r2 } from "../_shared/r2.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_STORAGE_BYTES = 500 * 1024 * 1024;
const URL_EXPIRY_SECONDS = 300;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const sanitizeFileName = (value: string) =>
  value
    .replace(/[\\/]/g, "_")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .trim()
    .slice(0, 120) || "file";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(' ')[1];
        const [header] = token.split('.');
        const decodedHeader = JSON.parse(atob(header));
        console.log("Token Algorithm (alg):", decodedHeader.alg);
      } catch (e) {
        console.error("Failed to parse JWT header for algorithm log");
      }
    }
    if (authHeader) {
      console.log("Auth Header Type:", authHeader.split(' ')[0]);
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header. Header starts with:", authHeader.substring(0, 10));
      return json(401, { error: "Missing or invalid Authorization header" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return json(500, { error: "Supabase environment configuration missing" });
    }

    // Use Service Role key to bypass local JWT algorithm checks (HS256 vs ES256)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !authData.user) {
      console.error("Auth.getUser error:", authError);
      return json(401, { error: "Unauthorized", details: authError });
    }

    const user = authData.user;
    const authClient = adminClient;

    const body = await req.json();
    const fileName = String(body?.fileName ?? "");
    const contentType = String(body?.contentType ?? "application/octet-stream");
    const fileSize = Number(body?.fileSize ?? 0);
    const folderId = body?.folderId ? String(body.folderId) : null;

    if (!fileName) {
      return json(400, { error: "fileName is required" });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return json(400, { error: "fileSize must be a positive number" });
    }

    if (fileSize > MAX_FILE_BYTES) {
      return json(400, { error: "File exceeds 25 MB limit" });
    }



    if (folderId) {
      const { data: folder, error: folderError } = await authClient
        .from("folders")
        .select("id")
        .eq("id", folderId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (folderError) {
        return json(500, { error: "Failed to validate folder" });
      }

      if (!folder) {
        return json(404, { error: "Folder not found" });
      }
    }

    const { data: userFiles, error: filesError } = await authClient
      .from("files")
      .select("size")
      .eq("user_id", user.id);

    if (filesError) {
      return json(500, { error: "Failed to calculate storage usage" });
    }

    const usedBytes = (userFiles ?? []).reduce(
      (sum: number, f: { size: number | null }) => sum + Number(f.size ?? 0),
      0,
    );

    if (usedBytes + fileSize > MAX_STORAGE_BYTES) {
      return json(400, {
        error: "Storage quota exceeded (500 MB per student)",
        usedBytes,
        maxBytes: MAX_STORAGE_BYTES,
      });
    }

    const safeName = sanitizeFileName(fileName);
    const objectKey = `students/${user.id}/${crypto.randomUUID()}-${safeName}`;

    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: contentType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(r2, putCommand, {
      expiresIn: URL_EXPIRY_SECONDS,
    });

    return json(200, {
      uploadUrl,
      objectKey,
      expiresIn: URL_EXPIRY_SECONDS,
      maxFileBytes: MAX_FILE_BYTES,
      maxStorageBytes: MAX_STORAGE_BYTES,
      usedBytes,
    });
  } catch (error) {
    console.error("files-upload-url error", error);
    return json(500, { error: "Internal server error" });
  }
});
