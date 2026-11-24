
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Genre = {
  id: string;
  name: string;
  slug: string;
};

export default function GenerosPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadGenres() {
    setLoading(true);

    const { data, error } = await supabase
      .from("genres")
      .select("id, name, slug")
      .order("name");

    if (error) {
      setMessage("No se pudieron cargar los géneros.");
    } else {
      setGenres(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadGenres();
  }, []);

  function makeSlug(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const cleanName = name.trim();

    if (!cleanName) {
      setMessage("Escribe el nombre del género.");
      return;
    }

    setSaving(true);

    const slug = makeSlug(cleanName);

    const { error } = await supabase
      .from("genres")
      .insert({ name: cleanName, slug });

    if (error) {
      setMessage(
        error.code === "23505"
          ? "Ese género ya existe."
          : "No se pudo crear el género: " + error.message
      );
    } else {
      setMessage("Género creado correctamente.");
      setName("");
      await loadGenres();
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#101014] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <a href="/panel" className="text-sm text-violet-400">
          ← Volver al panel
        </a>

        <div className="mt-8">
          <h1 className="text-3xl font-bold">Gestión de géneros</h1>
          <p className="mt-2 text-gray-400">
            Organiza los géneros disponibles para los mangas.
          </p>
        </div>

        {message && (
          <p className="mt-6 rounded-lg border border-white/10 bg-[#191920] p-4 text-sm text-gray-300">
            {message}
          </p>
        )}

        <form
          onSubmit={handleCreate}
          className="mt-8 rounded-xl border border-white/10 bg-[#191920] p-6"
        >
          <h2 className="text-lg font-semibold">Añadir género</h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej. Fantasía"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#101014] px-4 py-3 outline-none focus:border-violet-500"
            />

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-500 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Añadir"}
            </button>
          </div>
        </form>

        <section className="mt-8 rounded-xl border border-white/10 bg-[#191920] p-6">
          <h2 className="text-lg font-semibold">Géneros registrados</h2>

          {loading ? (
            <p className="mt-4 text-gray-400">Cargando...</p>
          ) : genres.length === 0 ? (
            <p className="mt-4 text-gray-400">
              Todavía no hay géneros registrados.
            </p>
          ) : (
            <div className="mt-5 flex flex-wrap gap-3">
              {genres.map((genre) => (
                <span
                  key={genre.id}
                  className="rounded-full border border-violet-500/30 bg-violet-600/10 px-4 py-2 text-sm text-violet-300"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
