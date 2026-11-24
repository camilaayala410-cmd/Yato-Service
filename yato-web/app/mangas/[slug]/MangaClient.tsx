
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type MangaClientProps = {
  params: Promise<{
    slug: string;
  }>;
};

type Manga = {
  id: string;
  title: string;
  slug: string;
  synopsis: string | null;
  cover_url: string | null;
  status: string;
};

type Chapter = {
  id: string;
  chapter_number: number;
  title: string | null;
};

export default function MangaClient({ params }: MangaClientProps) {
  const { slug } = use(params);

  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [cover, setCover] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [inLibrary, setInLibrary] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadManga() {
      setLoading(true);
      setError("");
      setManga(null);
      setChapters([]);
      setGenres([]);
      setCover("");
      setUserId(null);
      setInLibrary(false);
      setLibraryMessage("");

      const { data: mangaData, error: mangaError } = await supabase
        .from("mangas")
        .select("id, title, slug, synopsis, cover_url, status")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (cancelled) return;

      if (mangaError || !mangaData) {
        setError("No se pudo encontrar este manga o todavía no está publicado.");
        setLoading(false);
        return;
      }

      setManga(mangaData);

      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id || null;

      if (cancelled) return;

      setUserId(currentUserId);

      if (currentUserId) {
        const { data: savedManga } = await supabase
          .from("manga_library")
          .select("manga_id")
          .eq("user_id", currentUserId)
          .eq("manga_id", mangaData.id)
          .maybeSingle();

        if (cancelled) return;

        setInLibrary(!!savedManga);
      }

      if (mangaData.cover_url) {
        const { data: coverData } = await supabase.storage
          .from("manga-pages")
          .createSignedUrl(mangaData.cover_url, 3600);

        if (cancelled) return;

        setCover(coverData?.signedUrl || "");
      }

      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("id, chapter_number, title")
        .eq("manga_id", mangaData.id)
        .eq("is_published", true)
        .eq("status", "published")
        .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
        .order("chapter_number", { ascending: false });

      if (cancelled) return;

      if (chapterError) {
        setError("No se pudieron cargar los capítulos.");
        setLoading(false);
        return;
      }

      setChapters(chapterData || []);

      const { data: genreData } = await supabase
        .from("manga_genres")
        .select("genres(name)")
        .eq("manga_id", mangaData.id);

      if (cancelled) return;

      setGenres(
        (genreData || [])
          .map((item: any) => item.genres?.name)
          .filter(Boolean)
      );

      setLoading(false);
    }

    if (slug) {
      loadManga();
    }

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function toggleLibrary() {
    if (!manga || !userId || libraryLoading) return;

    setLibraryLoading(true);
    setLibraryMessage("");

    if (inLibrary) {
      const { error } = await supabase
        .from("manga_library")
        .delete()
        .eq("user_id", userId)
        .eq("manga_id", manga.id);

      if (error) {
        setLibraryMessage("No se pudo quitar el manga de tu biblioteca.");
      } else {
        setInLibrary(false);
        setLibraryMessage("Manga quitado de tu biblioteca.");
      }
    } else {
      const { error } = await supabase
        .from("manga_library")
        .insert({
          user_id: userId,
          manga_id: manga.id,
        });

      if (error) {
        setLibraryMessage("No se pudo guardar el manga. Inténtalo nuevamente.");
      } else {
        setInLibrary(true);
        setLibraryMessage("Manga añadido a tu biblioteca.");
      }
    }

    setLibraryLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#101014] p-10 text-center text-white">
        Cargando manga...
      </main>
    );
  }

  if (error || !manga) {
    return (
      <main className="min-h-screen bg-[#101014] p-10 text-center text-white">
        <p className="mb-6 text-red-400">
          {error || "No se pudo encontrar este manga."}
        </p>
        <Link href="/conexion" className="text-violet-400 hover:underline">
          Volver a la biblioteca
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101014] text-white">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/conexion"
            className="text-xl font-bold tracking-widest text-violet-400"
          >
            MULGYMO LAB SCAN
          </Link>

          <Link
            href="/conexion"
            className="text-sm text-gray-400 hover:text-white"
          >
            ← Biblioteca
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-8 md:grid-cols-[240px_1fr]">
          <div>
            {cover ? (
              <img
                src={cover}
                alt={`Portada de ${manga.title}`}
                className="w-full rounded-xl border border-white/10 object-cover shadow-xl"
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-xl bg-[#191920] text-gray-500">
                Sin portada
              </div>
            )}
          </div>

          <div>
            <p className="text-sm uppercase tracking-widest text-violet-400">
              {manga.status === "ongoing" ? "En publicación" : manga.status}
            </p>

            <h1 className="mt-3 text-3xl font-bold md:text-4xl">
              {manga.title}
            </h1>

            <div className="mt-6">
              {userId ? (
                <button
                  onClick={toggleLibrary}
                  disabled={libraryLoading}
                  className="rounded-lg bg-violet-600 px-5 py-3 font-semibold transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {libraryLoading
                    ? "Guardando..."
                    : inLibrary
                      ? "✓ En mi biblioteca"
                      : "+ Añadir a mi biblioteca"}
                </button>
              ) : (
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/mangas/${manga.slug}`)}`}
                  className="inline-block rounded-lg bg-violet-600 px-5 py-3 font-semibold transition hover:bg-violet-500"
                >
                  Inicia sesión para guardar
                </Link>
              )}

              {libraryMessage && (
                <p className="mt-3 text-sm text-gray-300">
                  {libraryMessage}
                </p>
              )}
            </div>

            {genres.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-8">
              <h2 className="text-lg font-semibold">Sinopsis</h2>
              <p className="mt-3 whitespace-pre-line leading-7 text-gray-300">
                {manga.synopsis || "Todavía no hay una sinopsis disponible."}
              </p>
            </div>
          </div>
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">Capítulos</h2>

          {chapters.length === 0 ? (
            <p className="mt-5 text-gray-400">
              Todavía no hay capítulos publicados.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/leer/${manga.slug}/${chapter.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#191920] p-5 transition hover:border-violet-500/50 hover:bg-violet-500/5"
                >
                  <div>
                    <p className="font-semibold">
                      Capítulo {chapter.chapter_number}
                    </p>
                    {chapter.title && (
                      <p className="mt-1 text-sm text-gray-400">
                        {chapter.title}
                      </p>
                    )}
                  </div>

                  <span className="text-violet-400">Leer →</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
