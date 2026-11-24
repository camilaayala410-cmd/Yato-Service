
import { Suspense } from "react";
import MangaClient from "./MangaClient";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default function MangaPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#101014] p-10 text-center text-white">
          Cargando manga...
        </main>
      }
    >
      <MangaClient params={params} />
    </Suspense>
  );
}
