import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

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

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="w-60 shrink-0 border-r border-stone-200 bg-white px-4 py-6">
        <div className="mb-8 px-2">
          <Link
            href="/projects"
            className="block text-base font-semibold tracking-tight"
          >
            INSIDEO DIA
          </Link>
          <p className="mt-1 text-xs text-stone-500">Visor de proyectos</p>
        </div>
        <nav className="space-y-1 text-sm">
          <Link
            href="/projects"
            className="block rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100"
          >
            Proyectos
          </Link>
          <Link
            href="/map"
            className="block rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100"
          >
            Mapa Perú
          </Link>
        </nav>
        <div className="mt-8 border-t border-stone-100 pt-4 text-xs text-stone-500">
          <p className="truncate">{user.email}</p>
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="text-stone-600 hover:text-stone-900"
            >
              Cerrar sesión →
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
