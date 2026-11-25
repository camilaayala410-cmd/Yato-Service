
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type UserRole = "owner" | "admin" | "moderator" | "reader";

export default function PanelPage() {
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPanel() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email || "");

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error al consultar los roles:", error);
        window.location.href = "/";
        return;
      }

      const userRoles = (data || []).map((item) => item.role as UserRole);
      setRoles(userRoles);

      const canAccessPanel = userRoles.some((role) =>
        ["owner", "admin", "moderator"].includes(role)
      );

      if (!canAccessPanel) {
        window.location.href = "/";
        return;
      }

      setLoading(false);
    }

    loadPanel();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const isOwner = roles.includes("owner");
  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101014] text-white">
        Cargando tu panel...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101014] px-6 py-10 text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold tracking-widest text-violet-400"
        >
          YATO SERVICE
        </Link>

        <button
          onClick={handleLogout}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
        >
          Cerrar sesión
        </button>
      </header>

      <section className="mx-auto mt-16 max-w-5xl">
        <p className="text-sm text-gray-400">Panel de usuario</p>

        <h2 className="mt-2 text-3xl font-bold">
          Bienvenido a Yato Service
        </h2>

        <p className="mt-3 text-gray-400">{email}</p>

        <div className="mt-8 rounded-xl border border-white/10 bg-[#191920] p-6">
          <h3 className="text-lg font-semibold">Tus permisos</h3>

          <div className="mt-4 flex flex-wrap gap-2">
            {roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-violet-600/20 px-4 py-2 text-sm text-violet-300"
              >
                {role}
              </span>
            ))}
          </div>

          {roles.length === 0 && (
            <p className="mt-3 text-sm text-gray-400">
              Esta cuenta todavía no tiene roles asignados.
            </p>
          )}
        </div>

        {(isOwner || isAdmin) && (
          <section className="mt-8">
            <h3 className="text-2xl font-semibold">Administración</h3>

            <p className="mt-2 text-sm text-gray-400">
              Gestiona el catálogo y el contenido de Yato Service.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link
                href="/panel/mangas"
                className="rounded-xl border border-violet-500/30 bg-[#191920] p-6 transition hover:border-violet-400 hover:bg-violet-500/10"
              >
                <h4 className="text-lg font-semibold">Mangas</h4>
                <p className="mt-2 text-sm text-gray-400">
                  Crear, editar y administrar mangas, portadas y capítulos.
                </p>
                <span className="mt-4 inline-block text-sm text-violet-300">
                  Abrir biblioteca de administración →
                </span>
              </Link>

              <Link
                href="/panel/generos"
                className="rounded-xl border border-white/10 bg-[#191920] p-6 transition hover:border-violet-400 hover:bg-violet-500/10"
              >
                <h4 className="text-lg font-semibold">Géneros</h4>
                <p className="mt-2 text-sm text-gray-400">
                  Consultar y registrar géneros para el catálogo.
                </p>
                <span className="mt-4 inline-block text-sm text-violet-300">
                  Administrar géneros →
                </span>
              </Link>

              {isOwner && (
                <Link
                  href="/panel/usuarios"
                  className="rounded-xl border border-lime-300/20 bg-[#191920] p-6 transition hover:border-lime-300/60 hover:bg-lime-300/5"
                >
                  <h4 className="text-lg font-semibold">Usuarios y permisos</h4>
                  <p className="mt-2 text-sm text-gray-400">
                    Consultar cuentas y administrar roles de acceso.
                  </p>
                  <span className="mt-4 inline-block text-sm text-lime-300">
                    Administrar usuarios →
                  </span>
                </Link>
              )}
            </div>
          </section>
        )}

        {isModerator && !isOwner && !isAdmin && (
          <section className="mt-8 rounded-xl border border-white/10 bg-[#191920] p-6">
            <h3 className="text-xl font-semibold">Moderación</h3>
            <p className="mt-2 text-sm text-gray-400">
              Aquí estarán las herramientas para gestionar comentarios.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
