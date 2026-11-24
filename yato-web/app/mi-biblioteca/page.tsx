
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ReadingStatus =
  | "pendiente"
  | "leyendo"
  | "completado"
  | "en_pausa"
  | "abandonado";

type Manga = {
  id: string;
  title: string;
  slug: string;
  synopsis: string | null;
  cover_url: string | null;
  reading_status: ReadingStatus;
};

type Progress = {
  manga_id: string;
  chapter_id: string;
  page_number: number;
  chapter_number: number;
  chapter_title: string | null;
};

const statusOptions: { value: ReadingStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "leyendo", label: "Leyendo" },
  { value: "completado", label: "Completado" },
  { value: "en_pausa", label: "En pausa" },
  { value: "abandonado", label: "Abandonado" },
];

export default function MiBibliotecaPage() {
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("todos");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function loadLibrary() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setMessage("Inicia sesión para consultar tu biblioteca.");
        setLoading(false);
        return;
      }

      const userId = userData.user.id;

      const { data, error } = await supabase
        .from("manga_library")
        .select(`
          manga_id,
          reading_status,
          mangas (
            id,
            title,
            slug,
            synopsis,
            cover_url
          )
        `)
        .eq("user_id", userId);

      if (error) {
        setMessage("No se pudo cargar tu biblioteca.");
        setLoading(false);
        return;
      }

      const libraryMangas = (data || [])
        .map((item: any) => {
          if (!item.mangas) return null;

          return {
            ...item.mangas,
            reading_status: item.reading_status || "pendiente",
          };
        })
        .filter(Boolean) as Manga[];

      setMangas(libraryMangas);

      const mangaIds = libraryMangas.map((manga) => manga.id);

      if (mangaIds.length > 0) {
        const { data: progressData } = await supabase
          .from("reading_progress")
          .select("manga_id, chapter_id, page_number")
          .eq("user_id", userId)
          .in("manga_id", mangaIds);

        const progressEntries = await Promise.all(
          (progressData || []).map(async (item: any) => {
            const { data: chapterData } = await supabase
              .from("chapters")
              .select("chapter_number, title")
              .eq("id", item.chapter_id)
              .maybeSingle();

            return [
              item.manga_id,
              {
                manga_id: item.manga_id,
                chapter_id: item.chapter_id,
                page_number: item.page_number,
                chapter_number: chapterData?.chapter_number ?? 0,
                chapter_title: chapterData?.title ?? null,
              },
            ] as const;
          })
        );

        setProgress(Object.fromEntries(progressEntries));
      }

      const coverEntries = await Promise.all(
        libraryMangas.map(async (manga) => {
          if (!manga.cover_url) return [manga.id, ""] as const;

          const { data: coverData } = await supabase.storage
            .from("manga-pages")
            .createSignedUrl(manga.cover_url, 3600);

          return [manga.id, coverData?.signedUrl || ""] as const;
        })
      );

      setCovers(Object.fromEntries(coverEntries));
      setLoading(false);
    }

    loadLibrary();
  }, []);

  async function updateStatus(
    mangaId: string,
    newStatus: ReadingStatus
  ) {
    setUpdating(mangaId);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setMessage("Tu sesión ha expirado. Inicia sesión nuevamente.");
      setUpdating(null);
      return;
    }

    const { error } = await supabase
      .from("manga_library")
      .update({ reading_status: newStatus })
      .eq("user_id", userData.user.id)
      .eq("manga_id", mangaId);

    if (error) {
      setMessage("No se pudo actualizar el estado del manga.");
      setUpdating(null);
      return;
    }

    setMangas((current) =>
      current.map((manga) =>
        manga.id === mangaId
          ? { ...manga, reading_status: newStatus }
          : manga
      )
    );

    setUpdating(null);
  }

  async function removeManga(mangaId: string) {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) return;

    const { error } = await supabase
      .from("manga_library")
      .delete()
      .eq("user_id", userData.user.id)
      .eq("manga_id", mangaId);

    if (error) {
      setMessage("No se pudo quitar el manga.");
      return;
    }

    setMangas((current) =>
      current.filter((manga) => manga.id !== mangaId)
    );
  }

  const filteredMangas =
    filter === "todos"
      ? mangas
      : mangas.filter((manga) => manga.reading_status === filter);

  return (
    <main className="min-h-screen bg-[#101014] text-white">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold tracking-widest text-violet-400"
          >
            YATO SERVICE
          </Link>

          <Link
            href="/conexion"
            className="text-sm text-gray-400 hover:text-white"
          >
            Explorar mangas
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm uppercase tracking-widest text-violet-400">
          Tu colección personal
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-4xl">
          Mi biblioteca
        </h1>

        <p className="mt-3 text-gray-400">
          Organiza tus mangas y lleva un registro de tus lecturas.
        </p>

        {loading ? (
          <p className="mt-10 text-gray-400">Cargando biblioteca...</p>
        ) : message && mangas.length === 0 ? (
          <div className="mt-10 rounded-xl border border-white/10 bg-[#191920] p-6">
            <p className="text-gray-300">{message}</p>
            <Link
              href="/login"
              className="mt-4 inline-block text-violet-400 hover:underline"
            >
              Iniciar sesión
            </Link>
          </div>
        ) : mangas.length === 0 ? (
          <div className="mt-10 rounded-xl border border-white/10 bg-[#191920] p-10 text-center">
            <p className="text-lg font-semibold">
              Tu biblioteca está vacía.
            </p>
            <p className="mt-2 text-gray-400">
              Explora el catálogo y guarda tus mangas favoritos.
            </p>
            <Link
              href="/conexion"
              className="mt-6 inline-block rounded-lg bg-violet-600 px-6 py-3 font-semibold hover:bg-violet-500"
            >
              Explorar mangas
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <label htmlFor="library-filter" className="text-sm text-gray-400">
                Filtrar por estado:
              </label>

              <select
                id="library-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded-lg border border-white/10 bg-[#191920] px-4 py-2 text-sm text-white"
              >
                <option value="todos">Todos ({mangas.length})</option>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label} (
                    {mangas.filter(
                      (manga) => manga.reading_status === status.value
                    ).length}
                    )
                  </option>
                ))}
              </select>
            </div>

            {message && (
              <p className="mt-4 text-sm text-red-400">{message}</p>
            )}

            {filteredMangas.length === 0 ? (
              <div className="mt-8 rounded-xl border border-white/10 bg-[#191920] p-8 text-center">
                <p className="text-gray-300">
                  No tienes mangas en este estado.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMangas.map((manga) => {
                  const savedProgress = progress[manga.id];

                  return (
                    <article
                      key={manga.id}
                      className="overflow-hidden rounded-xl border border-white/10 bg-[#191920]"
                    >
                      <Link href={`/mangas/${manga.slug}`}>
                        {covers[manga.id] ? (
                          <img
                            src={covers[manga.id]}
                            alt={`Portada de ${manga.title}`}
                            className="h-64 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-64 items-center justify-center bg-[#101014] text-gray-500">
                            Sin portada
                          </div>
                        )}
                      </Link>

                      <div className="p-5">
                        <Link href={`/mangas/${manga.slug}`}>
                          <h2 className="text-lg font-bold hover:text-violet-400">
                            {manga.title}
                          </h2>
                        </Link>

                        <p className="mt-2 line-clamp-3 text-sm text-gray-400">
                          {manga.synopsis || "Sin sinopsis disponible."}
                        </p>

                        <div className="mt-5">
                          <label
                            htmlFor={`status-${manga.id}`}
                            className="mb-2 block text-xs uppercase tracking-wider text-gray-400"
                          >
                            Estado de lectura
                          </label>

                          <select
                            id={`status-${manga.id}`}
                            value={manga.reading_status}
                            disabled={updating === manga.id}
                            onChange={(event) =>
                              updateStatus(
                                manga.id,
                                event.target.value as ReadingStatus
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-3 text-sm text-white disabled:opacity-50"
                          >
                            {statusOptions.map((status) => (
                              <option
                                key={status.value}
                                value={status.value}
                              >
                                {status.label}
                              </option>
                            ))}
                          </select>

                          {updating === manga.id && (
                            <p className="mt-2 text-xs text-gray-400">
                              Actualizando...
                            </p>
                          )}
                        </div>

                        {savedProgress ? (
                          <div className="mt-5 rounded-lg bg-[#101014] p-4">
                            <p className="text-xs uppercase tracking-wider text-violet-400">
                              Tu progreso
                            </p>

                            <p className="mt-2 text-sm text-gray-300">
                              Capítulo {savedProgress.chapter_number}
                              {savedProgress.chapter_title
                                ? `: ${savedProgress.chapter_title}`
                                : ""}
                            </p>

                            <p className="mt-1 text-sm text-gray-400">
                              Página {savedProgress.page_number}
                            </p>

                            <Link
                              href={`/leer/${manga.slug}/${savedProgress.chapter_id}`}
                              className="mt-4 block rounded-lg bg-violet-600 px-4 py-3 text-center text-sm font-semibold hover:bg-violet-500"
                            >
                              Continuar leyendo
                            </Link>
                          </div>
                        ) : (
                          <Link
                            href={`/mangas/${manga.slug}`}
                            className="mt-5 block rounded-lg bg-violet-600 px-4 py-3 text-center text-sm font-semibold hover:bg-violet-500"
                          >
                            Empezar a leer
                          </Link>
                        )}

                        <div className="mt-5 flex items-center justify-between gap-3">
                          <Link
                            href={`/mangas/${manga.slug}`}
                            className="text-sm font-semibold text-violet-400 hover:underline"
                          >
                            Ver manga
                          </Link>

                          <button
                            onClick={() => removeManga(manga.id)}
                            className="text-sm text-red-400 hover:text-red-300"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
