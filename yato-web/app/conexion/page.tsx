
import Link from "next/link";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";

async function ListaMangas() {
  const { data: mangas, error } = await supabase
    .from("mangas")
    .select("id, title, slug, synopsis, cover_url, status")
    .eq("is_published", true);

  if (error) {
    return (
      <p className="text-red-400">
        No se pudo cargar el catálogo: {error.message}
      </p>
    );
  }

  const mangasConPortada = await Promise.all(
    (mangas || []).map(async (manga) => {
      if (!manga.cover_url) {
        return { ...manga, portada: null };
      }

      const { data } = await supabase.storage
        .from("manga-pages")
        .createSignedUrl(manga.cover_url, 3600);

      return {
        ...manga,
        portada: data?.signedUrl || null,
      };
    })
  );

  if (mangasConPortada.length === 0) {
    return (
      <p className="text-gray-400">
        Todavía no hay mangas publicados.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {mangasConPortada.map((manga) => (
        <Link
          key={manga.id}
          href={`/mangas/${manga.slug}`}
          className="group block rounded-xl border border-purple-400/20 bg-[#242431]/75 p-5 transition hover:border-purple-400/50 hover:bg-[#242431]"
        >
          {manga.portada ? (
            <img
              src={manga.portada}
              alt={`Portada de ${manga.title}`}
              className="mb-4 h-64 w-full rounded-lg object-cover transition group-hover:scale-[1.01]"
            />
          ) : (
            <div className="mb-4 flex h-64 items-center justify-center rounded-lg bg-[#191920] text-gray-500">
              Sin portada
            </div>
          )}

          <h2 className="mb-2 text-xl font-bold group-hover:text-lime-300">
            {manga.title}
          </h2>

          <p className="mb-4 line-clamp-3 text-sm text-gray-400">
            {manga.synopsis || "Sin sinopsis disponible."}
          </p>

          <p className="text-sm text-purple-300">
            {manga.status || "Estado no especificado"}
          </p>

          <p className="mt-4 text-sm text-lime-300">
            Ver manga →
          </p>
        </Link>
      ))}
    </div>
  );
}

export default function ConexionPage() {
  return (
    <main className="min-h-screen bg-transparent px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-sm font-bold tracking-[0.3em] text-purple-400">
          MULGYMO LAB SCAN
        </p>

        <h1 className="mb-3 text-4xl font-bold">
          Nuestra biblioteca
        </h1>

        <p className="mb-10 text-gray-400">
          Descubre historias que merecen ser leídas.
        </p>

        <Suspense
          fallback={
            <p className="text-gray-400">
              Analizando el catálogo del laboratorio...
            </p>
          }
        >
          <ListaMangas />
        </Suspense>
      </div>
    </main>
  );
}
