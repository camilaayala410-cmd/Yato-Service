
export default function Home() {
  return (
    <main className="min-h-screen bg-[#101014] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <h1 className="text-2xl font-bold tracking-wide text-purple-400">
          YATO SERVICE
        </h1>
        <nav className="flex gap-5 text-sm text-gray-300">
          <a href="#">Inicio</a>
          <a href="#">Mangas</a>
          <a href="#">Novedades</a>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-purple-400">
          Tu biblioteca de lectura
        </p>
        <h2 className="max-w-3xl text-5xl font-bold leading-tight">
          Historias que merecen ser leídas.
        </h2>
        <p className="mt-6 max-w-xl text-gray-400">
          Descubre mangas, explora nuevos mundos y encuentra tu próxima historia favorita.
        </p>
        <button className="mt-8 rounded-lg bg-purple-600 px-7 py-3 font-semibold hover:bg-purple-500">
          Explorar mangas
        </button>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h3 className="mb-6 text-2xl font-bold">Biblioteca</h3>
        <div className="rounded-xl border border-white/10 bg-white/5 p-8">
          <p className="text-gray-400">
            Próximamente encontrarás aquí nuestro catálogo de mangas.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-gray-500">
        © 2026 Yato Service. Todos los derechos reservados.
      </footer>
    </main>
  );
}