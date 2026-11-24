
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Manga = {
  id: string;
  title: string;
  slug: string;
  synopsis: string | null;
  cover_url: string | null;
  is_published: boolean;
};

type Genre = {
  id: string;
  name: string;
  slug: string;
};

export default function MangasPage() {
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);

    const [mangaResult, genreResult] = await Promise.all([
      supabase
        .from("mangas")
        .select("id, title, slug, synopsis, cover_url, is_published")
        .order("title"),
      supabase
        .from("genres")
        .select("id, name, slug")
        .order("name"),
    ]);

    if (mangaResult.error || genreResult.error) {
      setMessage("No se pudieron cargar los datos.");
    } else {
      setMangas(mangaResult.data || []);
      setGenres(genreResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function makeSlug(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function toggleGenre(id: string) {
    setSelectedGenres((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!title.trim()) {
      setMessage("Escribe el título del manga.");
      return;
    }

    if (!cover) {
      setMessage("Selecciona una portada.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(cover.type)) {
      setMessage("La portada debe ser JPG, PNG o WEBP.");
      return;
    }

    setSaving(true);

    try {
      const { data: { user }, error: userError } =
        await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");
      }

      const slug = makeSlug(title);

      if (!slug) {
        throw new Error("El título no permite crear una dirección válida.");
      }

      const { data: existing } = await supabase
        .from("mangas")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existing) {
        throw new Error("Ya existe un manga con ese título o dirección.");
      }

      const extension = cover.type === "image/jpeg"
        ? "jpg"
        : cover.type === "image/png"
          ? "png"
          : "webp";

      const coverPath = `${slug}/portada.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("manga-pages")
        .upload(coverPath, cover, {
          contentType: cover.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error("No se pudo subir la portada: " + uploadError.message);
      }

      const { data: newManga, error: insertError } = await supabase
        .from("mangas")
        .insert({
          title: title.trim(),
          slug,
          synopsis: synopsis.trim() || null,
          cover_url: coverPath,
          status: "ongoing",
          is_published: false,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error("No se pudo registrar el manga: " + insertError.message);
      }

      if (selectedGenres.length > 0) {
        const genreRows = selectedGenres.map((genreId) => ({
          manga_id: newManga.id,
          genre_id: genreId,
        }));

        const { error: genreError } = await supabase
          .from("manga_genres")
          .insert(genreRows);

        if (genreError) {
          throw new Error(
            "El manga se creó, pero no se pudieron guardar sus géneros: " +
            genreError.message
          );
        }
      }

      setMessage("¡Manga registrado correctamente como borrador!");
      setTitle("");
      setSynopsis("");
      setSelectedGenres([]);
      setCover(null);
      setShowForm(false);
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ocurrió un error inesperado."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#101014] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <a href="/panel" className="text-sm text-violet-400">
          ← Volver al panel
        </a>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gestión de mangas</h1>
            <p className="mt-2 text-gray-400">
              Administra los títulos de Yato Service.
            </p>
          </div>

          <button
            onClick={() => {
              setShowForm(!showForm);
              setMessage("");
            }}
            className="rounded-lg bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-500"
          >
            {showForm ? "Cancelar" : "+ Añadir manga"}
          </button>
        </div>

        {message && (
          <p className="mt-6 rounded-lg border border-white/10 bg-[#191920] p-4 text-sm text-gray-300">
            {message}
          </p>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mt-8 space-y-5 rounded-xl border border-violet-500/30 bg-[#191920] p-6"
          >
            <h2 className="text-xl font-semibold">Nuevo manga</h2>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Título
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-[#101014] px-4 py-3 outline-none focus:border-violet-500"
                placeholder="Nombre del manga"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Sinopsis
              </label>
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-[#101014] px-4 py-3 outline-none focus:border-violet-500"
                placeholder="Descripción del manga..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Portada (JPG, PNG o WEBP)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setCover(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-300"
              />
              {cover && (
                <p className="mt-2 text-xs text-gray-400">
                  Archivo seleccionado: {cover.name}
                </p>
              )}
            </div>

            <div>
              <label className="mb-3 block text-sm text-gray-300">
                Géneros
              </label>

              {genres.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Todavía no hay géneros registrados.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <label
                      key={genre.id}
                      className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${
                        selectedGenres.includes(genre.id)
                          ? "border-violet-500 bg-violet-600/20 text-violet-300"
                          : "border-white/10 text-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGenres.includes(genre.id)}
                        onChange={() => toggleGenre(genre.id)}
                        className="sr-only"
                      />
                      {genre.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400">
              El manga se guardará como borrador. No será visible para los lectores.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-violet-600 px-6 py-3 font-semibold hover:bg-violet-500 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar manga"}
            </button>
          </form>
        )}

        <section className="mt-8 rounded-xl border border-white/10 bg-[#191920] p-6">
          <h2 className="text-lg font-semibold">Biblioteca</h2>

          {loading ? (
            <p className="mt-4 text-gray-400">Cargando mangas...</p>
          ) : mangas.length === 0 ? (
            <p className="mt-4 text-gray-400">
              Todavía no hay mangas registrados.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {mangas.map((manga) => (
                <article
                  key={manga.id}
                  className="rounded-lg border border-white/10 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
<a
  href={`/panel/mangas/${manga.id}`}
  className="font-semibold text-violet-300 hover:text-violet-200"
>
  {manga.title}
</a>
                      <p className="mt-1 text-sm text-gray-400">
                        {manga.slug}
                      </p>
                    </div>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                      {manga.is_published ? "Publicado" : "Borrador"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
