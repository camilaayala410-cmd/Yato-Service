"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const navigation = [
  { label: "Inicio", href: "/", icon: "⌂" },
  { label: "Mangas", href: "/conexion", icon: "▤" },
  { label: "Novedades", href: "/conexion", icon: "✧" },
  { label: "Mi biblioteca", href: "/mi-biblioteca", icon: "▣" },
];

export default function Sidebar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAccess(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) {
      if (!mounted) return;

      setIsLoggedIn(!!session);

      if (!session) {
        setCanManage(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (!mounted) return;

      if (error) {
        console.error("Error al consultar permisos:", error);
        setCanManage(false);
        return;
      }

      setCanManage(
        (data || []).some((item) =>
          ["owner", "admin", "moderator"].includes(item.role)
        )
      );
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      void loadAccess(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadAccess(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleAuthAction() {
    setMenuOpen(false);

    if (isLoggedIn) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("No se pudo cerrar la sesión:", error);
        return;
      }
      window.location.href = "/";
      return;
    }

    window.location.href = "/login";
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[70] flex h-[76px] items-center gap-4 border-b border-purple-400/20 bg-[#15151d]/90 px-5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-purple-400/30 bg-[#242431] transition hover:border-lime-300/50"
        >
          <span
            className={`h-0.5 w-5 rounded-full bg-lime-300 transition ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`h-0.5 w-5 rounded-full bg-lime-300 transition ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-0.5 w-5 rounded-full bg-lime-300 transition ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>

        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-lg font-extrabold tracking-wide text-lime-300">
            MULGYMO
          </span>
          <span className="text-xs font-bold tracking-[0.25em] text-purple-400">
            LAB SCAN
          </span>
        </Link>

        {canManage && (
          <Link
            href="/panel"
            className="ml-2 rounded-lg border border-lime-300/30 bg-lime-300/10 px-4 py-2 text-sm font-semibold text-lime-300 transition hover:border-lime-300/60 hover:bg-lime-300/20"
          >
            Administrar
          </Link>
        )}
      </header>

      {menuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-[65] flex w-72 max-w-[85vw] flex-col border-r border-purple-400/20 bg-[#191923]/95 p-6 pt-24 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-purple-300">
          Laboratorio
        </p>

        <nav className="flex flex-col gap-2">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-4 rounded-xl px-4 py-3 text-sm text-gray-400 transition hover:bg-purple-400/10 hover:text-purple-200"
            >
              <span className="w-5 text-center text-lg">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-purple-400/20 bg-purple-400/5 p-4">
          <p className="text-xs font-bold text-purple-300">
            MULGYMO LAB
          </p>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            Un espacio para descubrir, traducir y compartir historias.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAuthAction}
          className="mt-5 rounded-lg border border-white/10 px-4 py-3 text-center text-sm text-gray-300 transition hover:border-lime-300/30 hover:text-lime-300"
        >
          {isLoggedIn ? "Cerrar sesión" : "Iniciar sesión"}
        </button>
      </aside>
    </>
  );
}
