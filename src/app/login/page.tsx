import { signInWithPassword } from "./actions";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[var(--shadow-card)]">
        <div className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 px-8 py-10 text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-100/90">
            INSIDEO
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-[2rem]">
            DIA — acceso
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-emerald-50/95">
            Visor de proyectos y línea base para exploración minera en Perú.
          </p>
        </div>

        <div className="space-y-6 px-8 py-8">
          <form action={signInWithPassword} className="space-y-5">
            <input type="hidden" name="next" value={next ?? "/projects"} />

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wide text-stone-500"
              >
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/25"
                placeholder="tu@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wide text-stone-500"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-sm text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/25"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 active:scale-[0.99]"
            >
              Iniciar sesión
            </button>
          </form>

          <p className="border-t border-stone-100 pt-6 text-xs leading-relaxed text-stone-500">
            Crea tu usuario en{" "}
            <a
              href="https://supabase.com/dashboard/project/moaltxlpdysqeuujccis/auth/users"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:text-emerald-900"
            >
              Supabase Studio → Authentication → Users
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
