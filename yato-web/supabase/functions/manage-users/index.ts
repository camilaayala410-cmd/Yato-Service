import { createClient } from "npm:@supabase/supabase-js@2";

type ManagedRole = "admin" | "moderator" | "reader";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!url || !serviceRoleKey || !anonKey) {
      console.error("manage-users: faltan variables de entorno requeridas.");
      return json({ error: "La función no está configurada correctamente." }, 500);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return json({ error: "Sesión no válida. Inicia sesión nuevamente." }, 401);

    // Validate the user's access token through Supabase Auth.
    const authClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      return json({ error: "La sesión no es válida o ha caducado. Inicia sesión nuevamente." }, 401);
    }

    const callerId = authData.user.id;
    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: ownerRole, error: ownerError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "owner")
      .maybeSingle();

    if (ownerError) {
      console.error("manage-users: error verificando propietario:", ownerError);
      return json({ error: "No se pudieron verificar los permisos." }, 500);
    }
    if (!ownerRole) return json({ error: "Solo los propietarios pueden administrar usuarios." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "list") {
      const allUsers = [];
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        allUsers.push(...data.users);
        if (data.users.length < 1000) break;
      }

      const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
        await Promise.all([
          admin.from("profiles").select("id, username, display_name"),
          admin.from("user_roles").select("user_id, role"),
        ]);

      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;

      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
      const rolesById = new Map<string, string[]>();
      for (const item of roles ?? []) {
        rolesById.set(item.user_id, [...(rolesById.get(item.user_id) ?? []), item.role]);
      }

      return json({
        users: allUsers.map((user) => ({
          id: user.id,
          email: user.email ?? "",
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          display_name: profileById.get(user.id)?.display_name ?? "",
          username: profileById.get(user.id)?.username ?? "",
          roles: rolesById.get(user.id) ?? [],
        })),
      });
    }

    if (action === "add" || action === "remove") {
      const userId = body?.user_id;
      const role = body?.role as ManagedRole;
      if (typeof userId !== "string" || !["admin", "moderator", "reader"].includes(role)) {
        return json({ error: "Usuario o rol no válido." }, 400);
      }

      const { data: targetOwner, error: targetOwnerError } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "owner")
        .maybeSingle();

      if (targetOwnerError) throw targetOwnerError;
      if (targetOwner) {
        return json({ error: "Los permisos de los propietarios no se pueden modificar desde aquí." }, 403);
      }

      if (action === "add") {
        const { error } = await admin
          .from("user_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
        if (error) throw error;
      } else {
        const { error } = await admin
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;
      }

      return json({ ok: true });
    }

    return json({ error: "Acción no reconocida." }, 400);
  } catch (error) {
    console.error("manage-users:", error);
    return json({ error: "No se pudo completar la operación." }, 500);
  }
});
