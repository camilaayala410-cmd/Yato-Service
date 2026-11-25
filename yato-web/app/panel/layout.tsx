"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Role = "owner" | "admin" | "moderator" | "reader";

export default function PanelLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      setChecking(true);
      setAllowed(false);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        window.location.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!active) return;

      if (error) {
        console.error("No se pudieron verificar los permisos:", error);
        window.location.replace("/");
        return;
      }

      const roles = (data ?? []).map((item) => item.role as Role);
      const isOwner = roles.includes("owner");
      const isAdmin = roles.includes("admin");
      const isModerator = roles.includes("moderator");

      const isUsersSection = pathname === "/panel/usuarios";
      const isContentSection =
        pathname === "/panel/mangas" ||
        pathname === "/panel/generos" ||
        pathname.startsWith("/panel/mangas/");

      const canAccess =
        isUsersSection
          ? isOwner
          : isContentSection
            ? isOwner || isAdmin
            : isOwner || isAdmin || isModerator;

      if (!canAccess) {
        window.location.replace(isModerator ? "/panel" : "/");
        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, [pathname]);

  if (checking || !allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101014] text-white">
        Verificando permisos...
      </main>
    );
  }

  return <>{children}</>;
}
