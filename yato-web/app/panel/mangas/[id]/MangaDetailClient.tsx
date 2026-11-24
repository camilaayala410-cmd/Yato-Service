
"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MangaDetailClientProps = {
  params: Promise<{
    id: string;
  }>;
};

type Manga = {
  id: string;
  title: string;
  slug: string;
  synopsis: string | null;
  cover_url: string | null;
  status: string;
  is_published: boolean;
};

type Genre = {
  id: string;
  name: string;
};

type Chapter = {
  id: string;
  chapter_number: number;
  title: string | null;
  is_published: boolean;
  status: string;
};

export default function MangaDetailClient({
  params,
}: MangaDetailClientProps) {
  const { id } = use(params);

  const [manga, setManga] = useState<Manga | null>(null);
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [coverUrl, setCoverUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishingChapterId, setPublishingChapterId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [newCover, setNewCover] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadManga() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("mangas")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setMessage(
          error
            ? `Error de Supabase: ${error.message} (código: ${error.code})`
            : "La consulta no devolvió ningún manga. Comprueba que el ID exista y que tengas permisos para verlo."
        );
        setLoading(false);
        return;
      }

      setManga(data);
      setTitle(data.title);
      setSynopsis(data.synopsis || "");

      if (data.cover_url) {
        const { data: signed, error: coverError } = await supabase.storage
          .from("manga-pages")
          .createSignedUrl(data.cover_url, 3600);

        if (cancelled) return;

        if (coverError) {
          setMessage("No se pudo cargar la portada: " + coverError.message);
        } else {
          setCoverUrl(signed?.signedUrl || "");
        }
      } else {
        setCoverUrl("");
      }

      const { data: genreData, error: genreError } = await supabase
        .from("genres")
        .select("id, name")
        .order("name");

      if (cancelled) return;

      if (genreError) {
        setMessage("No se pudieron cargar los géneros: " + genreError.message);
      } else {
        setAvailableGenres(genreData || []);
      }

      const { data: mangaGenreData, error: mangaGenreError } = await supabase
        .from("manga_genres")
        .select("genre_id")
        .eq("manga_id", id);

      if (cancelled) return;

      if (mangaGenreError) {
        setMessage(
          "No se pudieron cargar los géneros del manga: " +
            mangaGenreError.message
        );
      } else {
        setSelectedGenreIds(
          (mangaGenreData || []).map((item) => item.genre_id)
        );
      }

      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("id, chapter_number, title, is_published, status")
        .eq("manga_id", id)
        .order("chapter_number", { ascending: true });

      if (cancelled) return;

      if (chapterError) {
        setMessage("No se pudieron cargar los capítulos: " + chapterError.message);
      } else {
        setChapters(chapterData || []);
      }

      setLoading(false);
    }

    if (id) {
      loadManga();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  function toggleGenre(genreId: string) {
    setSelectedGenreIds((current) =>
      current.includes(genreId)
        ? current.filter((item) => item !== genreId)
        : [...current, genreId]
    );
  }

  async function handleSave() {
    if (!manga) return;

    if (!title.trim()) {
      setMessage("El título no puede estar vacío.");
      return;
    }

    setSaving(true);
    setMessage("");

    let newCoverPath = manga.cover_url;

    if (newCover) {
      let extension = "";

      if (newCover.type === "image/jpeg") {
        extension = "jpg";
      } else if (newCover.type === "image/png") {
        extension = "png";
      } else if (newCover.type === "image/webp") {
        extension = "webp";
      } else {
        setMessage("Formato no válido. Usa JPG, PNG o WEBP.");
        setSaving(false);
        return;
      }

      const path = `${manga.slug}/portada.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("manga-pages")
        .upload(path, newCover, {
          upsert: true,
          contentType: newCover.type,
        });

      if (uploadError) {
        setMessage("No se pudo subir la portada: " + uploadError.message);
        setSaving(false);
        return;
      }

      newCoverPath = path;
    }

    const { error } = await supabase
      .from("mangas")
      .update({
        title: title.trim(),
        synopsis: synopsis.trim() || null,
        cover_url: newCoverPath,
      })
      .eq("id", manga.id);

    if (error) {
      setMessage("No se pudieron guardar los cambios: " + error.message);
      setSaving(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("manga_genres")
      .delete()
      .eq("manga_id", manga.id);

    if (deleteError) {
      setMessage(
        "Se guardaron los datos, pero no se pudieron actualizar los géneros: " +
          deleteError.message
      );
      setSaving(false);
      return;
    }

    if (selectedGenreIds.length > 0) {
      const genreRows = selectedGenreIds.map((genreId) => ({
        manga_id: manga.id,
        genre_id: genreId,
      }));

      const { error: insertError } = await supabase
        .from("manga_genres")
        .insert(genreRows);

      if (insertError) {
        setMessage(
          "Se guardaron los datos, pero no se pudieron asignar los géneros: " +
            insertError.message
        );
        setSaving(false);
        return;
      }
    }

    const { data: signed } = newCoverPath
      ? await supabase.storage
          .from("manga-pages")
          .createSignedUrl(newCoverPath, 3600)
      : { data: null };

    setManga({
      ...manga,
      title: title.trim(),
      synopsis: synopsis.trim() || null,
      cover_url: newCoverPath,
    });

    if (signed?.signedUrl) {
      setCoverUrl(signed.signedUrl);
    }

    setNewCover(null);
    setEditing(false);
    setMessage("Cambios guardados correctamente.");
    setSaving(false);
  }

  function handleCancel() {
    if (!manga) return;

    setTitle(manga.title);
    setSynopsis(manga.synopsis || "");
    setNewCover(null);
    setEditing(false);
    setMessage("");
  }

  async function handlePublish() {
    if (!manga) return;

    const action = manga.is_published ? "retirar" : "publicar";

    if (!window.confirm(`¿Seguro que deseas ${action} este manga?`)) {
      return;
    }

    setPublishing(true);
    setMessage("");

    const { error } = await supabase
      .from("mangas")
      .update({ is_published: !manga.is_published })
      .eq("id", manga.id);

    if (error) {
      setMessage("No se pudo cambiar la publicación: " + error.message);
      setPublishing(false);
      return;
    }

    setManga({
      ...manga,
      is_published: !manga.is_published,
    });

    setMessage(
      manga.is_published
        ? "El manga fue retirado de la biblioteca pública."
        : "El manga fue publicado correctamente."
    );

    setPublishing(false);
  }

  async function handleChapterPublish(chapter: Chapter) {
    const isCurrentlyPublished =
      chapter.is_published && chapter.status === "published";

    const action = isCurrentlyPublished ? "retirar" : "publicar";

    if (
      !window.confirm(
        `¿Seguro que deseas ${action} el capítulo ${chapter.chapter_number}?`
      )
    ) {
      return;
    }

    setPublishingChapterId(chapter.id);
    setMessage("");

    const newPublicationState = !isCurrentlyPublished;

    const { error } = await supabase
      .from("chapters")
      .update({
        is_published: newPublicationState,
        status: newPublicationState ? "published" : "draft",
      })
      .eq("id", chapter.id)
      .eq("manga_id", id);

    if (error) {
      setMessage(
        "No se pudo cambiar la publicación del capítulo: " + error.message
      );
      setPublishingChapterId(null);
      return;
    }

    setChapters((current) =>
      current.map((item) =>
        item.id === chapter.id
          ? {
              ...item,
              is_published: newPublicationState,
              status: newPublicationState ? "published" : "draft",
            }
          : item
      )
    );

    setMessage(
      newPublicationState
        ? `El capítulo ${chapter.chapter_number} fue publicado correctamente.`
        : `El capítulo ${chapter.chapter_number} fue retirado de la publicación.`
    );

    setPublishingChapterId(null);
  }

  const selectedGenres = availableGenres.filter((genre) =>
    selectedGenreIds.includes(genre.id)
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101014] text-white">
        Cargando manga...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101014] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <a href="/panel/mangas" className="text-sm text-violet-400">
          ← Volver a mangas
        </a>

        {!manga ? (
          <div className="mt-8">
            <p className="text-red-400">{message}</p>
            <p className="mt-3 text-sm text-gray-400">
              ID consultado: {id}
            </p>
          </div>
        ) : (
          <>
            <h1 className="mt-8 text-3xl font-bold">{manga.title}</h1>

            <div className="mt-4 flex flex-wrap gap-3">
              {!editing && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-500"
                  >
                    Editar manga
                  </button>

                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className={`rounded-lg px-4 py-2 text-white disabled:opacity-50 ${
                      manga.is_published
                        ? "bg-orange-600 hover:bg-orange-500"
                        : "bg-green-700 hover:bg-green-600"
                    }`}
                  >
                    {publishing
                      ? "Procesando..."
                      : manga.is_published
                        ? "Retirar publicación"
                        : "Publicar manga"}
                  </button>
                </>
              )}

              {editing && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>

                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
              <div>
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={`Portada de ${manga.title}`}
                    className="w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex aspect-[2/3] items-center justify-center rounded-xl bg-[#191920] text-gray-500">
                    Sin portada
                  </div>
                )}

                {editing && (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-gray-400">
                      Cambiar portada
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) =>
                        setNewCover(e.target.files?.[0] || null)
                      }
                      className="w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-white"
                    />
                    {newCover && (
                      <p className="mt-2 text-xs text-green-400">
                        Imagen seleccionada: {newCover.name}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-400">Título</p>
                  {editing ? (
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#191920] px-4 py-3 text-white"
                    />
                  ) : (
                    <p className="mt-2">{manga.title}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-400">Sinopsis</p>
                  {editing ? (
                    <textarea
                      value={synopsis}
                      onChange={(e) => setSynopsis(e.target.value)}
                      rows={5}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#191920] px-4 py-3 text-white"
                    />
                  ) : (
                    <p className="mt-2">
                      {manga.synopsis || "Sin sinopsis registrada."}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-400">Dirección</p>
                  <p className="mt-2">{manga.slug}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Estado</p>
                  <p className="mt-2">{manga.status}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Publicación</p>
                  <p className="mt-2">
                    {manga.is_published ? "Publicado" : "Borrador"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Géneros</p>
                  {editing ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {availableGenres.map((genre) => {
                        const checked = selectedGenreIds.includes(genre.id);

                        return (
                          <button
                            key={genre.id}
                            type="button"
                            onClick={() => toggleGenre(genre.id)}
                            className={`rounded-full border px-3 py-2 text-sm ${
                              checked
                                ? "border-violet-500 bg-violet-600/30 text-violet-200"
                                : "border-white/10 bg-[#191920] text-gray-400 hover:border-violet-500"
                            }`}
                          >
                            {checked ? "✓ " : ""}
                            {genre.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedGenres.length > 0 ? (
                        selectedGenres.map((genre) => (
                          <span
                            key={genre.id}
                            className="rounded-full bg-violet-600/20 px-3 py-1 text-sm text-violet-300"
                          >
                            {genre.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">
                          Sin géneros asignados.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <section className="mt-12 border-t border-white/10 pt-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Capítulos</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    {chapters.length} capítulos registrados
                  </p>
                </div>

                <a
                  href={`/panel/mangas/${id}/capitulos`}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Administrar capítulos
                </a>
              </div>

              {!manga.is_published && (
                <p className="mt-4 rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 text-sm text-orange-300">
                  Este manga está en borrador. Los capítulos publicados no
                  serán visibles en la biblioteca pública hasta que publiques
                  el manga.
                </p>
              )}

              {chapters.length === 0 ? (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5 text-gray-400">
                  Todavía no hay capítulos registrados para este manga.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {chapters.map((chapter) => {
                    const isChapterPublished =
                      chapter.is_published && chapter.status === "published";

                    const isProcessing =
                      publishingChapterId === chapter.id;

                    return (
                      <div
                        key={chapter.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                      >
                        <div>
                          <p className="font-medium">
                            Capítulo {chapter.chapter_number}
                            {chapter.title ? `: ${chapter.title}` : ""}
                          </p>

                          <p
                            className={`mt-1 text-sm ${
                              isChapterPublished
                                ? "text-green-400"
                                : "text-orange-400"
                            }`}
                          >
                            {isChapterPublished ? "Publicado" : "Borrador"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleChapterPublish(chapter)}
                            disabled={publishingChapterId !== null}
                            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                              isChapterPublished
                                ? "bg-orange-600 hover:bg-orange-500"
                                : "bg-green-700 hover:bg-green-600"
                            }`}
                          >
                            {isProcessing
                              ? "Procesando..."
                              : isChapterPublished
                                ? "Retirar publicación"
                                : "Publicar capítulo"}
                          </button>

                          <a
                            href={`/panel/mangas/${id}/capitulos/${chapter.id}`}
                            className="rounded-lg border border-violet-500/50 px-4 py-2 text-sm text-violet-300 hover:bg-violet-600/20"
                          >
                            Administrar páginas
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {message && (
              <p className="mt-6 text-sm text-violet-300">{message}</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
