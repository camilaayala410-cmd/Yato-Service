
import { Suspense } from "react";
import MangaDetailClient from "./MangaDetailClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function MangaDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#101014] text-white">
          Cargando manga...
        </main>
      }
    >
      <MangaDetailClient params={params} />
    </Suspense>
  );
}
