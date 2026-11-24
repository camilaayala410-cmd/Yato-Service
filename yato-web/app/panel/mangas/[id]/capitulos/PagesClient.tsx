
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PagesClientProps = {
  params: Promise<{
    id: string;
    chapterId: string;
  }>;
};

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

type PageItem = {
  id: string;
  page_number: number;
  image_path: string;
  image: string | null;
};

export default function PagesClient({ params }: PagesClientProps) {
  const { id: mangaId, chapterId } = use(params);

  const [manga, setManga] = useState<Manga | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const { data: mangaData, error: mangaError } = await supabase
      .from("mangas")
      .select("id, title, slug")
      .eq("id", mangaId)
      .single();

    if (mangaError || !mangaData) {
      setError("No se pudo encontrar el manga.");
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
      setError("No se pudo encontrar el capítulo.");
      setLoading(false);
      return;
    }

    const { data: pageData, error: pageError } = await supabase
      .from("chapter_pages")
      .select("id, page_number, image_path")
      .eq("chapter_id", chapterId)
      .order("page_number", { ascending: true });

    if (pageError) {
      setError("No se pudieron cargar las páginas.");
      setLoading(false);
      return;
    }

    const pagesWithImages = await Promise.all(
      (pageData || []).map(async (page) => {
        const { data } = await supabase.storage
          .from("manga-pages")
          .createSignedUrl(page.image_path, 3600);

        return {
          ...page,
          image: data?.signedUrl || null,
        };
      })
    );

    setManga(mangaData);
    setChapter(chapterData);
    setPages(pagesWithImages);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mangaId, chapterId]);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(event.target.files || []);

    const validFiles = selectedFiles.filter((file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type)
    );

    if (validFiles.length !== selectedFiles.length) {
      setError("Algunos archivos no son JPG, PNG o WEBP y fueron excluidos.");
    } else {
      setError("");
    }

    setFiles(
      validFiles.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      )
    );
  }

  async function handleUpload() {
    if (!manga || !chapter || files.length === 0) {
      setError("Selecciona al menos una imagen.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setError("Debes iniciar sesión para subir páginas.");
      setUploading(false);
      return;
    }

    const lastPage = pages.reduce(
      (max, page) => Math.max(max, page.page_number),
      0
    );

    const chapterFolder = String(
      Math.floor(Number(chapter.chapter_number))
    ).padStart(3, "0");

    const uploadedRows: {
      chapter_id: string;
      page_number: number;
      image_path: string;
    }[] = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const pageNumber = lastPage + index + 1;
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (!extension || !["jpg", "jpeg", "png", "webp"].includes(extension)) {
        setError(`Formato no válido: ${file.name}`);
        setUploading(false);
        return;
      }

      const pageName = `${String(pageNumber).padStart(3, "0")}.${extension}`;
      const imagePath = `${manga.slug}/capitulos/capitulo-${chapterFolder}/${pageName}`;

      const { error: storageError } = await supabase.storage
        .from("manga-pages")
        .upload(imagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (storageError) {
        setError(`Error al subir ${file.name}: ${storageError.message}`);
        setUploading(false);
        return;
      }

      uploadedRows.push({
        chapter_id: chapterId,
        page_number: pageNumber,
        image_path: imagePath,
      });
    }

    const { error: insertError } = await supabase
      .from("chapter_pages")
      .insert(uploadedRows);

    if (insertError) {
      setError(
        `Las imágenes se subieron, pero no se pudieron registrar: ${insertError.message}`
      );
      setUploading(false);
      return;
    }

    setFiles([]);
    setMessage("¡Páginas subidas correctamente!");
    setUploading(false);

    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#101014] p-10 text-center text-white">
        Cargando páginas...
      </main>
    );
  }

  if (error && !manga) {
    return (
      <main className="min-h-screen bg-[#101014] p-10 text-center text-red-400">
        {error}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101014] px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/panel/mangas/${mangaId}`}
          className="text-sm text-purple-400 hover:underline"
        >
          ← Volver al manga
        </Link>

        <h1 className="mt-5 text-2xl font-bold">
          Administrar páginas
        </h1>

        <p className="mt-2 text-gray-400">
          {manga?.title}
        </p>

        <p className="text-sm text-gray-400">
          Capítulo {chapter?.chapter_number}
          {chapter?.title ? `: ${chapter.title}` : ""}
        </p>

        <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold">
            Subir páginas
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Puedes seleccionar varias imágenes JPG, PNG o WEBP.
            Se ordenarán por nombre de archivo.
          </p>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileChange}
            className="mt-5 block w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-purple-700 file:px-4 file:py-2 file:text-white"
          />

          {files.length > 0 && (
            <p className="mt-3 text-sm text-gray-400">
              {files.length} imágenes seleccionadas.
            </p>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="mt-5 rounded-lg bg-purple-700 px-5 py-3 font-semibold hover:bg-purple-600 disabled:opacity-40"
          >
            {uploading ? "Subiendo imágenes..." : "Subir páginas"}
          </button>
        </section>

        {error && (
          <p className="mt-5 text-sm text-red-400">{error}</p>
        )}

        {message && (
          <p className="mt-5 text-sm text-green-400">{message}</p>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold">
            Páginas cargadas ({pages.length})
          </h2>

          {pages.length === 0 ? (
            <p className="mt-4 text-gray-400">
              Todavía no hay páginas cargadas.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                >
                  {page.image ? (
                    <img
                      src={page.image}
                      alt={`Página ${page.page_number}`}
                      className="h-64 w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-red-400">
                      Imagen no disponible
                    </div>
                  )}

                  <p className="border-t border-white/10 p-3 text-center text-sm text-gray-300">
                    Página {page.page_number}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {manga && chapter && (
          <div className="mt-10">
            <Link
              href={`/leer/${manga.slug}/${chapter.id}`}
              className="inline-block rounded-lg border border-purple-500 px-5 py-3 text-purple-300 hover:bg-purple-500/10"
            >
              Vista previa del capítulo
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
