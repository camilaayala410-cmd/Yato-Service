
"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Manga = {
  id: string;
  title: string;
  slug: string;
};

type Chapter = {
  id: string;
  chapter_number: number;
  title: string | null;
};

type Page = {
  id: string;
  page_number: number;
  image_path: string;
  image_url?: string;
};

type ClientProps = {
  params: Promise<{
    id: string;
    chapterId: string;
  }>;
};

export default function ChapterPagesClient({
  params,
}: ClientProps) {
  const { id: mangaId, chapterId } = use(params);

  const [manga, setManga] = useState<Manga | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const { data: mangaData, error: mangaError } = await supabase
      .from("mangas")
      .select("id, title, slug")
      .eq("id", mangaId)
      .single();

    if (mangaError || !mangaData) {
      setMessage("No se pudo cargar el manga.");
      setLoading(false);
      return;
    }

    const { data: chapterData, error: chapterError } = await supabase
      .from("chapters")
      .select("id, chapter_number, title")
      .eq("id", chapterId)
      .eq("manga_id", mangaId)
      .single();

    if (chapterError || !chapterData) {
      setMessage("No se pudo cargar el capítulo.");
      setLoading(false);
      return;
    }

    setManga(mangaData);
    setChapter(chapterData);

    const { data: pageData, error: pageError } = await supabase
      .from("chapter_pages")
      .select("id, page_number, image_path")
      .eq("chapter_id", chapterId)
      .order("page_number", { ascending: true });

    if (pageError) {
      setMessage("No se pudieron cargar las páginas.");
      setLoading(false);
      return;
    }

    const pagesWithUrls = await Promise.all(
      (pageData || []).map(async (page) => {
        const { data } = await supabase.storage
          .from("manga-pages")
          .createSignedUrl(page.image_path, 3600);

        return {
          ...page,
          image_url: data?.signedUrl || "",
        };
      })
    );

    setPages(pagesWithUrls);
    setLoading(false);
  }, [mangaId, chapterId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleUpload() {
    if (!manga || !chapter || files.length === 0) {
      setMessage("Selecciona al menos una imagen.");
      return;
    }

    setUploading(true);
    setMessage("");

    const sortedFiles = [...files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

    const chapterFolder = String(chapter.chapter_number).padStart(3, "0");

    let nextPageNumber =
      pages.length > 0
        ? Math.max(...pages.map((page) => page.page_number)) + 1
        : 1;

    const insertedPages: {
      chapter_id: string;
      page_number: number;
      image_path: string;
    }[] = [];

    for (const file of sortedFiles) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";

      if (!["jpg", "jpeg", "png", "webp"].includes(extension)) {
        setMessage(`Formato no permitido: ${file.name}`);
        setUploading(false);
        return;
      }

      const pageName = `${String(nextPageNumber).padStart(3, "0")}.${extension}`;
      const imagePath = `${manga.slug}/capitulos/capitulo-${chapterFolder}/${pageName}`;

      const { error: uploadError } = await supabase.storage
        .from("manga-pages")
        .upload(imagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setMessage(
          `Error al subir ${file.name}: ${uploadError.message}`
        );
        setUploading(false);
        return;
      }

      insertedPages.push({
        chapter_id: chapterId,
        page_number: nextPageNumber,
        image_path: imagePath,
      });

      nextPageNumber++;
    }

    const { error: insertError } = await supabase
      .from("chapter_pages")
      .insert(insertedPages);

    if (insertError) {
      setMessage(
        `Las imágenes se subieron, pero no se pudieron registrar: ${insertError.message}`
      );
      setUploading(false);
      return;
    }

    setFiles([]);
    setMessage("¡Páginas subidas correctamente!");

    await loadData();
    setUploading(false);
  }

  if (loading) {
    return (
      <main className="p-8 text-white">
        Cargando páginas...
      </main>
    );
  }

  if (!manga || !chapter) {
    return (
      <main className="min-h-screen bg-[#101014] p-8 text-white">
        <p>
          {message || "No se pudo encontrar el manga o el capítulo."}
        </p>

        <Link
          href={`/panel/mangas/${mangaId}/capitulos`}
          className="mt-4 inline-block text-violet-400"
        >
          Volver a los capítulos
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101014] p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/panel/mangas/${mangaId}/capitulos`}
          className="text-sm text-violet-400 hover:text-violet-300"
        >
          ← Volver a los capítulos
        </Link>

        <h1 className="mt-6 text-3xl font-bold">
          Administrar páginas
        </h1>

        <p className="mt-2 text-gray-400">{manga.title}</p>

        <p className="text-gray-400">
          Capítulo {chapter.chapter_number}
          {chapter.title ? `: ${chapter.title}` : ""}
        </p>

        <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">
            Subir páginas
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Selecciona las imágenes en orden. Se ordenarán por nombre
            de archivo. Formatos permitidos: JPG, PNG y WEBP.
          </p>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) =>
              setFiles(Array.from(event.target.files || []))
            }
            className="mt-5 block w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-white"
          />

          {files.length > 0 && (
            <p className="mt-3 text-sm text-gray-300">
              {files.length} imagen(es) seleccionada(s)
            </p>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="mt-5 rounded-lg bg-violet-600 px-5 py-3 font-medium hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Subiendo..." : "Subir imágenes"}
          </button>

          {message && (
            <p className="mt-4 text-sm text-violet-300">
              {message}
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            Páginas cargadas ({pages.length})
          </h2>

          {pages.length === 0 ? (
            <p className="mt-4 text-gray-400">
              Todavía no hay páginas en este capítulo.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]"
                >
                  {page.image_url ? (
                    <img
                      src={page.image_url}
                      alt={`Página ${page.page_number}`}
                      className="aspect-[3/4] w-full object-contain"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center text-sm text-gray-500">
                      Imagen no disponible
                    </div>
                  )}

                  <p className="p-2 text-center text-sm text-gray-300">
                    Página {page.page_number}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <Link
          href={`/leer/${manga.slug}/${chapter.id}`}
          className="mt-8 inline-block rounded-lg border border-violet-500 px-5 py-3 text-violet-300 hover:bg-violet-500/10"
        >
          Vista previa del capítulo
        </Link>
      </div>
    </main>
  );
}
