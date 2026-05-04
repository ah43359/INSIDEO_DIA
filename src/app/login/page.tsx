import { signInWithPassword } from "./actions";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">INSIDEO DIA</h1>
          <p className="text-sm text-stone-600">
            Visor de proyectos DIA — Exploración minera Perú
          </p>
        </div>

        <form action={signInWithPassword} className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/projects"} />

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-stone-700"
            >
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-stone-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-700"
          >
            Iniciar sesión
          </button>
        </form>

        <p className="text-xs text-stone-500">
          Crea tu usuario en{" "}
          <a
            href="https://supabase.com/dashboard/project/moaltxlpdysqeuujccis/auth/users"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-stone-900"
          >
            Supabase Studio → Authentication → Users
          </a>
          .
        </p>
      </div>
    </div>
  );
}
