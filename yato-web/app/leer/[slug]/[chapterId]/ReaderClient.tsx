
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ReaderClientProps = {
  params: Promise<{
    slug: string;
    chapterId: string;
  }>;
};

export default function ReaderClient({ params }: ReaderClientProps) {
  const { slug, chapterId } = use(params);

  const [manga, setManga] = useState<any>(null);
  const [chapter, setChapter] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [restorePageIndex, setRestorePageIndex] = useState(0);
  const [mode, setMode] = useState<"vertical" | "single">("vertical");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [positionRestored, setPositionRestored] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReader() {
      setLoading(true);
      setError("");
      setPositionRestored(false);
      setProgressMessage("");
      setCurrentPage(0);
      setRestorePageIndex(0);
      setPages([]);
      setManga(null);
      setChapter(null);
      setChapters([]);

      const { data: mangaData, error: mangaError } = await supabase
        .from("mangas")
        .select("id, title, slug")
        .eq("slug", slug)
        .single();

      if (cancelled) return;

      if (mangaError || !mangaData) {
        setError("No se pudo encontrar este manga.");
        setLoading(false);
        return;
      }

      setManga(mangaData);

      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id || null;

      if (cancelled) return;

      setUserId(currentUserId);

      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("id, chapter_number, title, manga_id")
        .eq("id", chapterId)
        .eq("manga_id", mangaData.id)
        .single();

      if (cancelled) return;

      if (chapterError || !chapterData) {
        setError(
          "No se pudo encontrar este capítulo o todavía no está disponible."
        );
        setLoading(false);
        return;
      }

      setChapter(chapterData);

      const { data: chapterList } = await supabase
        .from("chapters")
        .select("id, chapter_number, title")
        .eq("manga_id", mangaData.id)
        .order("chapter_number", { ascending: true });

      if (cancelled) return;

      setChapters(chapterList || []);

      const { data: pageData, error: pageError } = await supabase
        .from("chapter_pages")
        .select("id, page_number, image_path")
        .eq("chapter_id", chapterId)
        .order("page_number", { ascending: true });

      if (cancelled) return;

      if (pageError || !pageData || pageData.length === 0) {
        setError("Este capítulo todavía no tiene páginas cargadas.");
        setLoading(false);
        return;
      }

      let savedPageNumber = 1;

      if (currentUserId) {
        const { data: progressData } = await supabase
          .from("reading_progress")
          .select("page_number, chapter_id")
          .eq("user_id", currentUserId)
          .eq("manga_id", mangaData.id)
          .maybeSingle();

        if (cancelled) return;

        if (progressData?.chapter_id === chapterId) {
          savedPageNumber = progressData.page_number;
        }
      }

      const savedPageIndex = pageData.findIndex(
        (page) => Number(page.page_number) === Number(savedPageNumber)
      );

      const finalPageIndex = savedPageIndex >= 0 ? savedPageIndex : 0;

      setCurrentPage(finalPageIndex);
      setRestorePageIndex(finalPageIndex);

      const pagesWithImages = await Promise.all(
        pageData.map(async (page) => {
          const { data } = await supabase.storage
            .from("manga-pages")
            .createSignedUrl(page.image_path, 3600);

          return {
            ...page,
            image: data?.signedUrl || null,
          };
        })
      );

      if (cancelled) return;

      setPages(pagesWithImages);
      setLoading(false);
    }

    if (slug && chapterId) {
      loadReader();
    }

    return () => {
      cancelled = true;
    };
  }, [slug, chapterId]);

  useEffect(() => {
    if (loading || pages.length === 0) return;

    let cancelled = false;

    async function restorePosition() {
      const images = Array.from(
        document.querySelectorAll<HTMLImageElement>("[data-reader-page]")
      );

      await Promise.all(
        images.map((img) => img.decode().catch(() => undefined))
      );

      if (cancelled) return;

      if (mode === "vertical") {
        const target = document.querySelector(
          `[data-page-index="${restorePageIndex}"]`
        );

        target?.scrollIntoView({ block: "start" });
      }

      setPositionRestored(true);
    }

    restorePosition();

    return () => {
      cancelled = true;
    };
  }, [loading, pages, restorePageIndex, mode]);

  useEffect(() => {
    if (
      mode !== "vertical" ||
      pages.length === 0 ||
      loading ||
      !positionRestored
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visiblePages = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visiblePages.length > 0) {
          const index = Number(
            visiblePages[0].target.getAttribute("data-page-index")
          );

          if (Number.isFinite(index)) {
            setCurrentPage(index);
          }
        }
      },
      { threshold: [0.35, 0.6, 0.85] }
    );

    document.querySelectorAll("[data-reader-page]").forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [mode, pages, loading, positionRestored]);

  useEffect(() => {
    if (
      !positionRestored ||
      !userId ||
      !manga ||
      !chapter ||
      !pages[currentPage]
    ) {
      return;
    }

    async function saveProgress() {
      const { error } = await supabase
        .from("reading_progress")
        .upsert(
          {
            user_id: userId,
            manga_id: manga.id,
            chapter_id: chapter.id,
            page_number: pages[currentPage].page_number,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,manga_id" }
        );

      if (error) {
        setProgressMessage("No se pudo guardar el progreso.");
      } else {
        setProgressMessage("Progreso guardado.");
      }
    }

    saveProgress();
  }, [positionRestored, userId, manga, chapter, pages, currentPage]);

  const currentChapterIndex = chapters.findIndex(
    (item) => item.id === chapterId
  );

  const previousChapter =
    currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;

  const nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1
      ? chapters[currentChapterIndex + 1]
      : null;

  function previousPage() {
    setCurrentPage((page) => Math.max(0, page - 1));
  }

  function nextPage() {
    setCurrentPage((page) => Math.min(pages.length - 1, page + 1));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#101014] p-10 text-center text-white">
        Cargando capítulo...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#101014] p-10 text-center text-white">
        <p className="mb-6 text-red-400">{error}</p>
        <Link
          href={manga ? `/mangas/${manga.slug}` : "/conexion"}
          className="text-purple-400 hover:underline"
        >
          Volver al manga
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101014] text-white">
      <header className="border-b border-white/10 px-5 py-5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href={`/mangas/${slug}`}
              className="text-sm text-purple-400 hover:underline"
            >
              ← Volver al manga
            </Link>

            <h1 className="mt-2 text-xl font-bold">{manga?.title}</h1>

            <p className="text-sm text-gray-400">
              Capítulo {chapter?.chapter_number}
              {chapter?.title ? `: ${chapter.title}` : ""}
            </p>

            {userId && (
              <p className="mt-2 text-xs text-green-400">
                {progressMessage}
              </p>
            )}
          </div>

          <button
            onClick={() =>
              setMode(mode === "vertical" ? "single" : "vertical")
            }
            className="rounded-lg border border-purple-500 px-4 py-2 text-sm text-purple-300 hover:bg-purple-500/10"
          >
            {mode === "vertical"
              ? "Modo página por página"
              : "Modo lectura vertical"}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-3 py-8">
        {mode === "vertical" ? (
          <div className="flex flex-col items-center gap-2">
            {pages.map((page, index) => (
              <img
                key={page.id}
                data-reader-page
                data-page-index={index}
                src={page.image}
                alt={`Página ${page.page_number}`}
                className="h-auto max-w-full"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <p className="mb-4 text-sm text-gray-400">
              Página {pages[currentPage]?.page_number} de {pages.length}
            </p>

            {pages[currentPage]?.image && (
              <img
                src={pages[currentPage].image}
                alt={`Página ${pages[currentPage].page_number}`}
                className="h-auto max-h-[80vh] max-w-full object-contain"
              />
            )}

            <div className="mt-6 flex items-center gap-5">
              <button
                onClick={previousPage}
                disabled={currentPage === 0}
                className="rounded-lg bg-purple-700 px-5 py-3 font-semibold disabled:opacity-30"
              >
                ← Anterior
              </button>

              <span className="text-sm text-gray-400">
                {pages[currentPage]?.page_number} / {pages.length}
              </span>

              <button
                onClick={nextPage}
                disabled={currentPage === pages.length - 1}
                className="rounded-lg bg-purple-700 px-5 py-3 font-semibold disabled:opacity-30"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-wrap justify-between gap-4 border-t border-white/10 pt-6">
          {previousChapter ? (
            <Link
              href={`/leer/${slug}/${previousChapter.id}`}
              className="text-purple-300 hover:underline"
            >
              ← Capítulo anterior
            </Link>
          ) : (
            <span className="text-gray-600">No hay capítulo anterior</span>
          )}

          {nextChapter ? (
            <Link
              href={`/leer/${slug}/${nextChapter.id}`}
              className="text-purple-300 hover:underline"
            >
              Capítulo siguiente →
            </Link>
          ) : (
            <span className="text-gray-600">No hay capítulo siguiente</span>
          )}
        </div>
      </section>
    </main>
  );
}
