import { createClient } from "npm:@supabase/supabase-js@2";
import { DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.758.0";
import { bucket, r2 } from "../_shared/r2.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    console.log("Authorization Header Present:", !!authHeader);
    if (!authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
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
    const fileId = String(body?.fileId ?? "");

    if (!fileId) {
      return json(400, { error: "fileId is required" });
    }



    const { data: fileRow, error: fileError } = await authClient
      .from("files")
      .select("id, object_key")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fileError) {
      return json(500, { error: "Failed to load file" });
    }

    if (!fileRow) {
      return json(404, { error: "File not found" });
    }

    if (fileRow.object_key) {
      await r2.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: fileRow.object_key,
        }),
      );
    }

    const { error: deleteError } = await authClient
      .from("files")
      .delete()
      .eq("id", fileId)
      .eq("user_id", user.id);

    if (deleteError) {
      return json(500, { error: "Failed to delete file metadata" });
    }

    return json(200, { success: true, fileId });
  } catch (error) {
    console.error("files-delete error", error);
    return json(500, { error: "Internal server error" });
  }
});
