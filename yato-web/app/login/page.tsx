
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/panel";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("No se pudo iniciar sesión. Revisa tus datos.");
      setLoading(false);
      return;
    }

    window.location.href =
      redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? redirectTo
        : "/panel";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101014] px-5 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#191920] p-8 shadow-2xl">
        <a href="/" className="text-sm text-violet-400">
          ← Volver al inicio
        </a>

        <div className="mb-8 mt-8 text-center">
          <h1 className="text-3xl font-bold tracking-widest text-violet-400">
            MULGYMO LAB SCAN
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Inicia sesión en tu cuenta
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#101014] px-4 py-3 outline-none focus:border-violet-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#101014] px-4 py-3 outline-none focus:border-violet-500"
              placeholder="Tu contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 px-4 py-3 font-semibold transition hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>

          {message && (
            <p className="text-center text-sm text-red-400">{message}</p>
          )}
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#101014] text-white">
          Cargando...
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
