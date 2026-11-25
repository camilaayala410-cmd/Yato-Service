"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function LoginForm() {
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirect") || "/panel";
  const redirectTo =
    requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/panel";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    searchParams.get("verified") === "1"
      ? "Correo confirmado. Ya puedes iniciar sesión."
      : ""
  );
  const [messageType, setMessageType] = useState<"success" | "error">(
    searchParams.get("verified") === "1" ? "success" : "error"
  );

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessageType("error");
      setMessage("No se pudo iniciar sesión. Revisa tus datos.");
      setLoading(false);
      return;
    }

    window.location.href = redirectTo;
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessageType("error");
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?verified=1`,
        data: {
          display_name: displayName.trim(),
        },
      },
    });

    if (error) {
      setMessageType("error");
      setMessage("No se pudo crear la cuenta. Revisa los datos e inténtalo nuevamente.");
      setLoading(false);
      return;
    }

    if (data.session) {
      window.location.href = "/mi-biblioteca";
      return;
    }

    setMessageType("success");
    setMessage(
      "Tu cuenta fue creada. Revisa tu correo electrónico y confirma la dirección antes de iniciar sesión."
    );
    setMode("login");
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101014] px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#191920] p-8 shadow-2xl">
        <a href="/" className="text-sm text-violet-400">
          ← Volver al inicio
        </a>

        <div className="mb-8 mt-8 text-center">
          <h1 className="text-3xl font-bold tracking-widest text-violet-400">
            MULGYMO LAB SCAN
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            {mode === "login"
              ? "Inicia sesión en tu cuenta"
              : "Crea tu cuenta de lector"}
          </p>
        </div>

        <form
          onSubmit={mode === "login" ? handleLogin : handleSignup}
          className="space-y-5"
        >
          {mode === "signup" && (
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Nombre para mostrar (opcional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                autoComplete="nickname"
                className="w-full rounded-lg border border-white/10 bg-[#101014] px-4 py-3 outline-none focus:border-violet-500"
                placeholder="Cómo te llamaremos"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-lg border border-white/10 bg-[#101014] px-4 py-3 outline-none focus:border-violet-500"
              placeholder={mode === "login" ? "Tu contraseña" : "Mínimo 8 caracteres"}
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-white/10 bg-[#101014] px-4 py-3 outline-none focus:border-violet-500"
                placeholder="Repite tu contraseña"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 px-4 py-3 font-semibold transition hover:bg-violet-500 disabled:opacity-50"
          >
            {loading
              ? mode === "login"
                ? "Ingresando..."
                : "Creando cuenta..."
              : mode === "login"
                ? "Iniciar sesión"
                : "Crear cuenta"}
          </button>

          {message && (
            <p
              role="status"
              className={`text-center text-sm ${
                messageType === "success" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}
        </form>

        <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-gray-400">
          {mode === "login" ? (
            <>
              ¿Todavía no tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="font-semibold text-violet-400 transition hover:text-violet-300"
              >
                Crear cuenta
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes una cuenta?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-semibold text-violet-400 transition hover:text-violet-300"
              >
                Iniciar sesión
              </button>
            </>
          )}
        </div>
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
