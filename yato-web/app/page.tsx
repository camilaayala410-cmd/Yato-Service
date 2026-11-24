import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-transparent text-white">
      <section className="mx-auto max-w-6xl px-6 pt-4 pb-16 md:pt-6 md:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
          {/* PRESENTACIÓN */}
          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_12px_#b7f36b]" />

              <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-300">
                Stories are our experiment
              </p>
            </div>

            <h1 className="max-w-3xl text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
              Un laboratorio
              <br />
              de historias
              <span className="block text-lime-300">
                por descubrir.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-gray-300">
              Exploramos nuevos universos, traducimos historias y
              compartimos aventuras que merecen ser leídas.
              Tu próxima historia favorita comienza aquí.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/conexion"
                className="rounded-lg bg-lime-300 px-7 py-3.5 font-bold text-[#15151d] shadow-[0_0_25px_rgba(183,243,107,0.18)] transition hover:-translate-y-1 hover:bg-lime-200"
              >
                Explorar mangas
              </Link>

              <Link
                href="/mi-biblioteca"
                className="rounded-lg border border-purple-400/40 bg-purple-400/5 px-7 py-3.5 font-semibold text-purple-200 transition hover:bg-purple-400/15"
              >
                Mi biblioteca
              </Link>
            </div>
          </div>

          {/* MASCOTA OFICIAL */}
          <div className="relative mx-auto flex aspect-square w-full max-w-[480px] items-center justify-center">
            <div className="absolute inset-[5%] rounded-full border border-purple-400/20" />
            <div className="absolute inset-[13%] rounded-full border border-lime-300/15" />
            <div className="absolute inset-[20%] rounded-full bg-purple-500/10 blur-3xl" />

            <Image
              src="/mulgymo-mascota.png"
              alt="Mascota felina de Mulgymo Lab Scan, rodeada de elementos de laboratorio"
              width={1024}
              height={1024}
              priority
              className="relative z-10 h-auto w-full object-contain drop-shadow-[0_0_35px_rgba(167,139,250,0.2)]"
            />

            <span className="absolute right-[12%] top-[17%] z-20 h-3 w-3 rounded-full bg-lime-300 shadow-[0_0_18px_#b7f36b]" />
            <span className="absolute bottom-[18%] left-[12%] z-20 h-2.5 w-2.5 rounded-full bg-purple-300 shadow-[0_0_18px_#a78bfa]" />
            <span className="absolute right-[18%] bottom-[25%] z-20 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_15px_#67e8f9]" />
          </div>
        </div>

        {/* TARJETAS PRINCIPALES */}
        <div className="mt-20 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-purple-400/20 bg-[#242431]/75 p-7 backdrop-blur-xl transition hover:-translate-y-1 hover:border-purple-400/50">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-300">
              01 / Explorar
            </p>

            <h2 className="text-xl font-bold">Nuevos universos</h2>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Encuentra historias y descubre mundos diferentes.
            </p>
          </div>

          <div className="rounded-2xl border border-lime-300/20 bg-[#242431]/75 p-7 backdrop-blur-xl transition hover:-translate-y-1 hover:border-lime-300/50">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-lime-300">
              02 / Leer
            </p>

            <h2 className="text-xl font-bold">Tu propio ritmo</h2>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Disfruta de tus lecturas y continúa donde las dejaste.
            </p>
          </div>

          <div className="rounded-2xl border border-purple-400/20 bg-[#242431]/75 p-7 backdrop-blur-xl transition hover:-translate-y-1 hover:border-purple-400/50">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-300">
              03 / Coleccionar
            </p>

            <h2 className="text-xl font-bold">Tu biblioteca</h2>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Guarda tus mangas favoritos y organiza tus lecturas.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-gray-500">
        © 2026 Mulgymo Lab Scan. Todos los derechos reservados.
      </footer>
    </main>
  );
}
