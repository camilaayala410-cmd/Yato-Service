
import { Suspense } from "react";
import ChapterPagesClient from "./ChapterPagesClient";

type PageProps = {
  params: Promise<{
    id: string;
    chapterId: string;
  }>;
};

export default function ManageChapterPagesPage({
  params,
}: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#101014] p-8 text-center text-white">
          Cargando páginas...
        </main>
      }
    >
      <ChapterPagesClient params={params} />
    </Suspense>
  );
}
