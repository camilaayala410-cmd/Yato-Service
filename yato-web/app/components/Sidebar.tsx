
"use client";

import Link from "next/link";
import { useState } from "react";

const navigation = [
  { label: "Inicio", href: "/", icon: "⌂" },
  { label: "Mangas", href: "/conexion", icon: "▤" },
  { label: "Novedades", href: "/conexion", icon: "✧" },
  { label: "Mi biblioteca", href: "/mi-biblioteca", icon: "▣" },
];

export default function Sidebar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[70] flex h-[76px] items-center gap-4 border-b border-purple-400/20 bg-[#15151d]/90 px-5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-purple-400/30 bg-[#242431] transition hover:border-lime-300/50"
        >
          <span
            className={`h-0.5 w-5 rounded-full bg-lime-300 transition ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`h-0.5 w-5 rounded-full bg-lime-300 transition ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-0.5 w-5 rounded-full bg-lime-300 transition ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>

        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-lg font-extrabold tracking-wide text-lime-300">
            MULGYMO
          </span>
          <span className="text-xs font-bold tracking-[0.25em] text-purple-400">
            LAB SCAN
          </span>
        </Link>
      </header>

      {menuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-[65] flex w-72 max-w-[85vw] flex-col border-r border-purple-400/20 bg-[#191923]/95 p-6 pt-24 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-purple-300">
          Laboratorio
        </p>

        <nav className="flex flex-col gap-2">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-4 rounded-xl px-4 py-3 text-sm text-gray-400 transition hover:bg-purple-400/10 hover:text-purple-200"
            >
              <span className="w-5 text-center text-lg">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-purple-400/20 bg-purple-400/5 p-4">
          <p className="text-xs font-bold text-purple-300">
            MULGYMO LAB
          </p>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            Un espacio para descubrir, traducir y compartir historias.
          </p>
        </div>

        <Link
          href="/login"
          onClick={() => setMenuOpen(false)}
          className="mt-5 rounded-lg border border-white/10 px-4 py-3 text-center text-sm text-gray-300 transition hover:border-lime-300/30 hover:text-lime-300"
        >
          Iniciar sesión
        </Link>
      </aside>
    </>
  );
}
