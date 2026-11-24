
import { Suspense } from "react";
import ReaderClient from "./ReaderClient";

type PageProps = {
  params: Promise<{
    slug: string;
    chapterId: string;
  }>;
};

export default function LeerCapituloPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#101014] p-10 text-center text-white">
          Cargando capítulo...
        </main>
      }
    >
      <ReaderClient params={params} />
    </Suspense>
  );
}
