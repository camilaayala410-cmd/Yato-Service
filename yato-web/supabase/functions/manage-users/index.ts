import { withSupabase } from "npm:@supabase/server@1";

type ManagedRole = "admin" | "moderator" | "reader";

Deno.serve(
  withSupabase({ auth: "user" }, async (req, ctx) => {
    try {
      const callerId = ctx.userClaims?.sub;
      if (!callerId) {
        return Response.json({ error: "No se pudo identificar la sesión." }, { status: 401 });
      }

      const { data: ownerRole, error: ownerError } = await ctx.supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("role", "owner")
        .maybeSingle();

      if (ownerError || !ownerRole) {
        return Response.json({ error: "Solo los propietarios pueden administrar usuarios." }, { status: 403 });
      }

      const body = await req.json().catch(() => ({}));
      const action = body?.action;

      if (action === "list") {
        const allUsers = [];
        for (let page = 1; page <= 20; page++) {
          const { data, error } = await ctx.supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: 1000,
          });
          if (error) throw error;
          allUsers.push(...data.users);
          if (data.users.length < 1000) break;
        }

        const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
          await Promise.all([
            ctx.supabaseAdmin.from("profiles").select("id, username, display_name"),
            ctx.supabaseAdmin.from("user_roles").select("user_id, role"),
          ]);

        if (profilesError) throw profilesError;
        if (rolesError) throw rolesError;

        const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
        const rolesById = new Map<string, string[]>();
        for (const item of roles ?? []) {
          rolesById.set(item.user_id, [...(rolesById.get(item.user_id) ?? []), item.role]);
        }

        return Response.json({
          users: allUsers.map((user) => ({
            id: user.id,
            email: user.email ?? "",
            created_at: user.created_at,
            display_name: profileById.get(user.id)?.display_name ?? "",
            username: profileById.get(user.id)?.username ?? "",
            roles: rolesById.get(user.id) ?? [],
          })),
        });
      }

      if (action === "add" || action === "remove") {
        const userId = body?.user_id;
        const role = body?.role as ManagedRole;
        if (
          typeof userId !== "string" ||
          !["admin", "moderator", "reader"].includes(role)
        ) {
          return Response.json({ error: "Usuario o rol no válido." }, { status: 400 });
        }

        const { data: targetOwner, error: targetOwnerError } = await ctx.supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "owner")
          .maybeSingle();

        if (targetOwnerError) throw targetOwnerError;
        if (targetOwner) {
          return Response.json({ error: "Los permisos de los propietarios no se pueden modificar desde aquí." }, { status: 403 });
        }

        if (action === "add") {
          const { error } = await ctx.supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
          if (error) throw error;
        } else {
          const { error } = await ctx.supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .eq("role", role);
          if (error) throw error;
        }

        return Response.json({ ok: true });
      }

      return Response.json({ error: "Acción no reconocida." }, { status: 400 });
    } catch (error) {
      console.error("manage-users:", error);
      return Response.json({ error: "No se pudo completar la operación." }, { status: 500 });
    }
  }),
);
