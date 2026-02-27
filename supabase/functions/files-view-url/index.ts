import { createClient } from "npm:@supabase/supabase-js@2";
import { GetObjectCommand } from "npm:@aws-sdk/client-s3@3.758.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.758.0";
import { bucket, r2 } from "../_shared/r2.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const URL_EXPIRY_SECONDS = 600; // 10 minutes

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { error: "Missing or invalid Authorization header" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return json(500, { error: "Supabase environment configuration missing" });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !authData.user) {
      return json(401, { error: "Unauthorized", details: authError });
    }

    const user = authData.user;

    const body = await req.json();
    const fileId = String(body?.fileId ?? "");

    if (!fileId) {
      return json(400, { error: "fileId is required" });
    }

    // Verify the file belongs to this user
    const { data: fileRecord, error: fileError } = await adminClient
      .from("files")
      .select("id, object_key, name, type")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fileError) {
      return json(500, { error: "Failed to look up file" });
    }

    if (!fileRecord) {
      return json(404, { error: "File not found" });
    }

    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: fileRecord.object_key,
      ResponseContentType: fileRecord.type || "application/octet-stream",
    });

    const viewUrl = await getSignedUrl(r2, getCommand, {
      expiresIn: URL_EXPIRY_SECONDS,
    });

    return json(200, {
      viewUrl,
      fileName: fileRecord.name,
      contentType: fileRecord.type || "application/octet-stream",
      expiresIn: URL_EXPIRY_SECONDS,
    });
  } catch (error) {
    console.error("files-view-url error", error);
    return json(500, { error: "Internal server error" });
  }
});
