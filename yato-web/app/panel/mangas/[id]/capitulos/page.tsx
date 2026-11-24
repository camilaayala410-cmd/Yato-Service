
import { Suspense } from "react";
import ChaptersClient from "./ChaptersClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ManageChaptersPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#101014] px-6 py-10 text-white">
          <div className="mx-auto max-w-5xl">
            <p className="text-gray-400">Cargando capítulos...</p>
          </div>
        </main>
      }
    >
      <ChaptersClient params={params} />
    </Suspense>
  );
}
