"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Role = "owner" | "admin" | "moderator" | "reader";
type ManagedRole = Exclude<Role, "owner">;
type ManagedUser = {
  id: string;
  email: string;
  display_name: string;
  username: string;
  roles: Role[];
};

const assignableRoles: ManagedRole[] = ["admin", "moderator", "reader"];

export default function UsersManagementPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, ManagedRole>>({});
  const [loading, setLoading] = useState(true);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      window.location.href = "/login";
      return;
    }

    const { data: ownRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id);

    if (rolesError || !ownRoles?.some((item) => item.role === "owner")) {
      window.location.href = "/";
      return;
    }

    const { data, error: functionError } = await supabase.functions.invoke("manage-users", {
      body: { action: "list" },
    });

    if (functionError || data?.error) {
      setError(data?.error || functionError?.message || "No se pudo cargar la lista de usuarios.");
      setLoading(false);
      return;
    }

    setUsers((data?.users ?? []) as ManagedUser[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function changeRole(user: ManagedUser, role: ManagedRole, action: "add" | "remove") {
    if (user.roles.includes("owner")) return;
    setBusyUser(user.id);
    setError("");
    setNotice("");

    const { data, error: functionError } = await supabase.functions.invoke("manage-users", {
      body: { action, user_id: user.id, role },
    });

    if (functionError || data?.error) {
      setError(data?.error || functionError?.message || "No se pudo modificar el rol.");
      setBusyUser(null);
      return;
    }

    setNotice(action === "add" ? "Rol asignado correctamente." : "Rol retirado correctamente.");
    await loadUsers();
    setBusyUser(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101014] text-white">
        Cargando usuarios...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101014] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/panel" className="text-sm text-violet-300 transition hover:text-lime-300">
          ← Volver al panel
        </Link>

        <header className="mt-8">
          <p className="text-xs font-semibold tracking-[0.25em] text-lime-300">MULGYMO LAB SCAN</p>
          <h1 className="mt-2 text-3xl font-bold">Usuarios y permisos</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Administra los roles de las cuentas registradas. Los permisos de los propietarios están protegidos y no se pueden modificar desde esta sección.
          </p>
        </header>

        {error && (
          <p role="alert" className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-6 rounded-lg border border-lime-300/20 bg-lime-300/10 p-3 text-sm text-lime-200">
            {notice}
          </p>
        )}

        <section className="mt-8 space-y-4">
          {users.map((user) => {
            const protectedOwner = user.roles.includes("owner");
            const selectedRole = selectedRoles[user.id] ?? "admin";

            return (
              <article key={user.id} className="rounded-xl border border-white/10 bg-[#191920] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="break-all text-base font-semibold">
                      {user.display_name || user.username || user.email || "Cuenta sin nombre"}
                    </h2>
                    <p className="mt-1 break-all text-sm text-gray-400">{user.email}</p>
                    <p className="mt-1 text-xs text-gray-500">ID: {user.id}</p>
                  </div>
                  {protectedOwner && (
                    <span className="w-fit rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs text-violet-200">
                      Propietario protegido
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Roles actuales</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user.roles.length ? user.roles.map((role) => (
                      <span key={role} className="rounded-full bg-violet-500/15 px-3 py-1.5 text-xs text-violet-200">
                        {role}
                      </span>
                    )) : (
                      <span className="text-sm text-gray-500">Sin roles asignados</span>
                    )}
                  </div>
                </div>

                {!protectedOwner && (
                  <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-end">
                    <label className="flex-1 text-xs text-gray-400">
                      Asignar rol
                      <select
                        value={selectedRole}
                        onChange={(event) => setSelectedRoles((current) => ({ ...current, [user.id]: event.target.value as ManagedRole }))}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white outline-none focus:border-lime-300/50"
                      >
                        {assignableRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={busyUser === user.id || user.roles.includes(selectedRole)}
                      onClick={() => void changeRole(user, selectedRole, "add")}
                      className="rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-semibold text-[#101014] transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Asignar
                    </button>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.filter((role): role is ManagedRole => role !== "owner").map((role) => (
                        <button
                          key={role}
                          type="button"
                          disabled={busyUser === user.id}
                          onClick={() => void changeRole(user, role, "remove")}
                          className="rounded-lg border border-red-300/20 px-3 py-2.5 text-xs text-red-200 transition hover:bg-red-300/10 disabled:opacity-40"
                        >
                          Retirar {role}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {users.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-[#191920] p-6 text-sm text-gray-400">
              No hay cuentas registradas para mostrar.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
