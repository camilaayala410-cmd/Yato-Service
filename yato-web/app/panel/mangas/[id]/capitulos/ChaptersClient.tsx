
"use client";

import { use, useCallback, useEffect, useState, type FormEvent } from "react";
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
  is_published: boolean;
  status: string;
  scheduled_at: string | null;
};

type ClientProps = {
  params: Promise<{
    id: string;
  }>;
};

const PARAGUAY_TIME_ZONE = "America/Asuncion";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: PARAGUAY_TIME_ZONE,
  }).format(new Date(value));
}

function getStatus(chapter: Chapter) {
  if (
    chapter.is_published &&
    chapter.status === "published" &&
    chapter.scheduled_at &&
    new Date(chapter.scheduled_at).getTime() > Date.now()
  ) {
    return "Programado";
  }

  if (chapter.is_published && chapter.status === "published") {
    return "Publicado";
  }

  if (chapter.status === "draft" && !chapter.is_published) {
    return "Borrador";
  }

  return "Retirado";
}

function getStatusStyle(status: string) {
  switch (status) {
    case "Publicado":
      return "bg-green-500/10 text-green-400";
    case "Programado":
      return "bg-blue-500/10 text-blue-400";
    case "Borrador":
      return "bg-yellow-500/10 text-yellow-400";
    default:
      return "bg-white/10 text-gray-400";
  }
}

function localDateTimeToISO(value: string) {
  if (!value) return null;

  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    throw new Error("La fecha y hora no son válidas.");
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const desiredUTC = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desiredUTC;

  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: PARAGUAY_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));

    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value])
    );

    const representedUTC = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute)
    );

    const difference = desiredUTC - representedUTC;

    if (difference === 0) break;
    candidate += difference;
  }

  const result = new Date(candidate);

  const check = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARAGUAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(result);

const expectedDateTime = `${datePart}, ${timePart}`;

if (check !== expectedDateTime) {
  throw new Error("No se pudo interpretar la fecha en horario de Paraguay.");
}

  return result.toISOString();
}

function isoToLocalDateTime(value: string | null) {
  if (!value) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARAGUAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export default function ChaptersClient({ params }: ClientProps) {
  const { id: mangaId } = use(params);

  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [publishMode, setPublishMode] = useState<"draft" | "published">("draft");

  const loadData = useCallback(async () => {
    setLoading(true);

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
      .select("id, chapter_number, title, is_published, status, scheduled_at")
      .eq("manga_id", mangaId)
      .order("chapter_number", { ascending: true });

    if (chapterError) {
      setMessage("No se pudieron cargar los capítulos.");
      setLoading(false);
      return;
    }

    setManga(mangaData);
    setChapters(chapterData || []);
    setLoading(false);
  }, [mangaId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function resetForm() {
    setChapterNumber("");
    setChapterTitle("");
    setScheduledAt("");
    setPublishMode("draft");
    setEditingId(null);
    setShowForm(false);
  }

  function startEditing(chapter: Chapter) {
    setEditingId(chapter.id);
    setChapterNumber(String(chapter.chapter_number));
    setChapterTitle(chapter.title || "");
    setScheduledAt(isoToLocalDateTime(chapter.scheduled_at));
    setPublishMode(
      chapter.is_published && chapter.status === "published"
        ? "published"
        : "draft"
    );
    setShowForm(true);
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const number = Number(chapterNumber);

    if (!Number.isInteger(number) || number < 0) {
      setMessage("El número del capítulo debe ser un entero igual o mayor a cero.");
      return;
    }

    const duplicate = chapters.some(
      (chapter) =>
        chapter.chapter_number === number &&
        chapter.id !== editingId
    );

    if (duplicate) {
      setMessage("Ya existe un capítulo con ese número.");
      return;
    }

    let scheduledISO: string | null = null;

    try {
      if (scheduledAt) {
        const convertedDate = localDateTimeToISO(scheduledAt);

        if (!convertedDate) {
          throw new Error("No se pudo interpretar la fecha programada.");
        }

        scheduledISO = convertedDate;

        if (new Date(convertedDate).getTime() <= Date.now()) {
          throw new Error("La fecha programada debe ser futura.");
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "La fecha programada no es válida."
      );
      return;
    }

    if (publishMode === "draft" && scheduledAt) {
      setMessage("Un capítulo en borrador no puede tener una fecha de publicación.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        manga_id: mangaId,
        chapter_number: number,
        title: chapterTitle.trim() || null,
        is_published: publishMode === "published",
        status: publishMode === "published" ? "published" : "draft",
        scheduled_at: publishMode === "published" ? scheduledISO : null,
      };

      let error;

      if (editingId) {
        const result = await supabase
          .from("chapters")
          .update(payload)
          .eq("id", editingId)
          .eq("manga_id", mangaId);

        error = result.error;
      } else {
        const result = await supabase
          .from("chapters")
          .insert(payload);

        error = result.error;
      }

      if (error) {
        throw new Error("No se pudo guardar el capítulo: " + error.message);
      }

      setMessage(
        scheduledISO
          ? "¡Capítulo programado correctamente!"
          : publishMode === "published"
            ? "¡Capítulo publicado correctamente!"
            : editingId
              ? "¡Capítulo actualizado como borrador!"
              : "¡Capítulo creado como borrador!"
      );

      resetForm();
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(chapter: Chapter) {
    const isPublished =
      chapter.is_published && chapter.status === "published";

    const action = isPublished ? "retirar" : "publicar";

    if (
      !window.confirm(
        `¿Estás segura de que deseas ${action} el capítulo ${chapter.chapter_number}?`
      )
    ) {
      return;
    }

    setMessage("");

    const { error } = await supabase
      .from("chapters")
      .update({
        is_published: !isPublished,
        status: isPublished ? "draft" : "published",
        scheduled_at: null,
      })
      .eq("id", chapter.id)
      .eq("manga_id", mangaId);

    if (error) {
      setMessage("No se pudo actualizar el capítulo: " + error.message);
      return;
    }

    setMessage(
      isPublished
        ? "El capítulo fue retirado de publicación."
        : "El capítulo fue publicado inmediatamente."
    );

    await loadData();
  }

  async function handleDelete(chapter: Chapter) {
    if (
      !window.confirm(
        `¿Eliminar el capítulo ${chapter.chapter_number}${chapter.title ? `: ${chapter.title}` : ""}?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setMessage("");

    const { data: existingPages, error: pagesError } = await supabase
      .from("chapter_pages")
      .select("id")
      .eq("chapter_id", chapter.id)
      .limit(1);

    if (pagesError) {
      setMessage("No se pudo comprobar si el capítulo tiene páginas: " + pagesError.message);
      return;
    }

    if (existingPages && existingPages.length > 0) {
      setMessage(
        "No se puede eliminar este capítulo porque todavía contiene páginas. Primero debe resolverse la administración de esas páginas."
      );
      return;
    }

    const { error } = await supabase
      .from("chapters")
      .delete()
      .eq("id", chapter.id)
      .eq("manga_id", mangaId);

    if (error) {
      setMessage("No se pudo eliminar el capítulo: " + error.message);
      return;
    }

    setMessage("Capítulo eliminado correctamente.");
    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#101014] p-8 text-white">
        Cargando capítulos...
      </main>
    );
  }

  if (!manga) {
    return (
      <main className="min-h-screen bg-[#101014] p-8 text-white">
        <p>{message || "No se pudo encontrar el manga."}</p>
        <Link href="/panel/mangas" className="mt-4 inline-block text-violet-400">
          Volver a mangas
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#101014] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/panel/mangas/${mangaId}`}
          className="text-sm text-violet-400 hover:text-violet-300"
        >
          ← Volver al manga
        </Link>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gestión de capítulos</h1>
            <p className="mt-2 text-gray-400">{manga.title}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                resetForm();
                setShowForm(true);
              }
              setMessage("");
            }}
            className="rounded-lg bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-500"
          >
            {showForm ? "Cancelar" : "+ Añadir capítulo"}
          </button>
        </div>

        {message && (
          <p className="mt-6 rounded-lg border border-white/10 bg-[#191920] p-4 text-sm text-gray-300">
            {message}
          </p>
        )}

        {showForm && (
          <form
            onSubmit={handleSave}
            className="mt-8 space-y-5 rounded-xl border border-violet-500/30 bg-[#191920] p-6"
          >
            <h2 className="text-xl font-semibold">
              {editingId ? "Editar capítulo" : "Nuevo capítulo"}
            </h2>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Número del capítulo
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={chapterNumber}
                onChange={(event) => setChapterNumber(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#101014] px-4 py-3 outline-none focus:border-violet-500"
                placeholder="Ej. 1"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Título (opcional)
              </label>
              <input
                type="text"
                value={chapterTitle}
                onChange={(event) => setChapterTitle(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#101014] px-4 py-3 outline-none focus:border-violet-500"
                placeholder="Título del capítulo"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Publicación
              </label>
              <select
                value={publishMode}
                onChange={(event) =>
                  setPublishMode(event.target.value as "draft" | "published")
                }
                className="w-full rounded-lg border border-white/10 bg-[#101014] px-4 py-3 outline-none focus:border-violet-500"
              >
                <option value="draft">Guardar como borrador</option>
                <option value="published">Publicar o programar</option>
              </select>
            </div>

            {publishMode === "published" && (
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Fecha y hora de publicación (Paraguay)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#101014] px-4 py-3 outline-none focus:border-violet-500"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Déjalo vacío para publicar inmediatamente. Si eliges una fecha futura, el capítulo aparecerá automáticamente cuando llegue ese momento.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-violet-600 px-6 py-3 font-semibold hover:bg-violet-500 disabled:opacity-50"
            >
              {saving
                ? "Guardando..."
                : editingId
                  ? "Guardar cambios"
                  : "Crear capítulo"}
            </button>
          </form>
        )}

        <section className="mt-8 rounded-xl border border-white/10 bg-[#191920] p-6">
          <h2 className="text-lg font-semibold">
            Lista de capítulos ({chapters.length})
          </h2>

          {chapters.length === 0 ? (
            <p className="mt-4 text-gray-400">
              Todavía no hay capítulos registrados.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {chapters.map((chapter) => {
                const status = getStatus(chapter);

                return (
                  <article
                    key={chapter.id}
                    className="rounded-lg border border-white/10 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold">
                          Capítulo {chapter.chapter_number}
                          {chapter.title ? `: ${chapter.title}` : ""}
                        </h3>

                        <span
                          className={`mt-2 inline-block rounded-full px-3 py-1 text-xs ${getStatusStyle(status)}`}
                        >
                          {status}
                        </span>

                        {status === "Programado" && chapter.scheduled_at && (
                          <p className="mt-2 text-sm text-blue-300">
                            Publicación: {formatDate(chapter.scheduled_at)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/panel/mangas/${mangaId}/capitulos/${chapter.id}`}
                          className="rounded-lg border border-violet-500/50 px-3 py-2 text-sm text-violet-300 hover:bg-violet-500/10"
                        >
                          Administrar páginas
                        </Link>

                        <button
                          type="button"
                          onClick={() => startEditing(chapter)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => togglePublish(chapter)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                        >
                          {chapter.is_published && chapter.status === "published"
                            ? "Retirar"
                            : "Publicar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(chapter)}
                          className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
