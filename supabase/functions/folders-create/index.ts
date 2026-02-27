import { createClient } from "npm:@supabase/supabase-js@2";

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

const sanitizeFolderName = (value: string) =>
  value
    .replace(/[\\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

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
    if (!authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header. Starts with:", authHeader.substring(0, 10));
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

    // For DB operations, we still use the adminClient or a regular client.
    // Since we verified the user, we can trust user.id.
    const authClient = adminClient;
    const body = await req.json();
    const nameRaw = String(body?.name ?? "");
    const parentId = body?.parentId ? String(body.parentId) : null;

    const name = sanitizeFolderName(nameRaw);
    if (!name) {
      return json(400, { error: "Folder name is required" });
    }



    let parentPath = "";

    if (parentId) {
      const { data: parent, error: parentError } = await authClient
        .from("folders")
        .select("id, path")
        .eq("id", parentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (parentError) {
        return json(500, { error: "Failed to validate parent folder" });
      }

      if (!parent) {
        return json(404, { error: "Parent folder not found" });
      }

      parentPath = parent.path;
    }

    const duplicateQuery = authClient
      .from("folders")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", name);

    const { data: duplicates, error: duplicateError } = parentId
      ? await duplicateQuery.eq("parent_id", parentId).limit(1)
      : await duplicateQuery.is("parent_id", null).limit(1);

    if (duplicateError) {
      return json(500, { error: "Failed to check duplicate folders" });
    }

    if ((duplicates ?? []).length > 0) {
      return json(409, { error: "A folder with this name already exists" });
    }

    const path = parentPath ? `${parentPath}/${name}` : name;

    const { data: inserted, error: insertError } = await authClient
      .from("folders")
      .insert({
        user_id: user.id,
        name,
        parent_id: parentId,
        path,
      })
      .select("id, user_id, name, parent_id, path, created_at")
      .single();

    if (insertError) {
      return json(500, { error: "Failed to create folder" });
    }

    return json(200, { folder: inserted });
  } catch (error) {
    console.error("folders-create error", error);
    return json(500, { error: "Internal server error" });
  }
});
