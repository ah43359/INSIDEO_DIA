import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { headers } from "next/headers";

async function getCurrentPath(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-internal-path") ?? h.get("referer") ?? "";
  } catch {
    return "";
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentPath = await getCurrentPath();

  const navItems = [
    {
      href: "/projects",
      label: "Proyectos",
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
    },
    {
      href: "/map",
      label: "Mapa Perú",
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      href: "/capas",
      label: "Capas",
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M10 1a1 1 0 01.445.105l8 4a1 1 0 010 1.79l-8 4a1 1 0 01-.89 0l-8-4a1 1 0 010-1.79l8-4A1 1 0 0110 1z" clipRule="evenodd" />
          <path d="M2.045 11.447l7.51 3.755a1 1 0 00.89 0l7.51-3.755.536 1.072a1 1 0 01-.447 1.341l-8 4a1 1 0 01-.89 0l-8-4a1 1 0 01-.447-1.34l.538-1.073z" />
          <path d="M2.045 14.447l7.51 3.755a1 1 0 00.89 0l7.51-3.755.536 1.072a1 1 0 01-.447 1.341l-8 4a1 1 0 01-.89 0l-8-4a1 1 0 01-.447-1.34l.538-1.073z" />
        </svg>
      ),
    },
    {
      href: "/reportes",
      label: "Reportes",
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-60 shrink-0 flex-col border-r border-stone-200/90 bg-white/85 backdrop-blur-sm">
        {/* Brand header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-5 py-5">
          <Link href="/projects" className="block">
            <h1 className="text-lg font-semibold tracking-tight text-white">
              INSIDEO DIA
            </h1>
            <p className="mt-0.5 text-xs font-light text-emerald-100">
              Visor de proyectos
            </p>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              currentPath === item.href ||
              currentPath.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <span
                  className={`${
                    isActive ? "text-emerald-600" : "text-stone-400"
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-stone-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
              {user.email?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-700">
                {user.email}
              </p>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-xs text-stone-400 hover:text-stone-900"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 px-4 py-5 sm:px-8 sm:py-7">
        <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1600px] rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
