# INSIDEO DIA — Frontend

Visor de proyectos DIA exploración. Lee del backend Supabase `insideo-dia`
(proyecto `mjinbekseqwclpknwzxu`, región `sa-east-1`).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase Auth
(magic link) · MapLibre GL.

## Páginas

| Ruta | Acceso | Qué muestra |
|---|---|---|
| `/login` | público | Form de magic link |
| `/projects` | autenticado | Tabla de todos los proyectos cargados |
| `/projects/[id]` | autenticado | Detalle: cliente, datos, mapa, inventario, submissions |
| `/map` | autenticado | Centroides de cada proyecto sobre mapa de Perú |

El gating de auth lo hace `src/proxy.ts` (Next 16 reemplazó `middleware.ts` por
`proxy.ts`).

## Setup local

```bash
cp .env.local.example .env.local
# Edita .env.local — los defaults apuntan al proyecto Supabase del equipo.
npm install
npm run dev
# Abre http://localhost:3000
```

Variables esperadas:

- `NEXT_PUBLIC_SUPABASE_URL` — `https://mjinbekseqwclpknwzxu.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — el publishable / anon key

## Configuración inicial Supabase (una vez)

Antes de loguearse por primera vez, en
[Auth → URL Configuration](https://supabase.com/dashboard/project/mjinbekseqwclpknwzxu/auth/url-configuration):

- **Site URL:** `http://localhost:3000` (cambiar a la URL de Vercel después).
- **Redirect URLs:** agregar `http://localhost:3000/auth/callback` y, una vez
  desplegado, `https://<vercel-domain>/auth/callback`.

## Flujo de auth

1. Usuario va a `/login`, ingresa correo.
2. Server Action `signInWithMagicLink` llama
   `supabase.auth.signInWithOtp({ email, emailRedirectTo: <origin>/auth/callback })`.
3. Supabase envía un correo con un enlace.
4. Click en el enlace → `/auth/callback?code=...` → `exchangeCodeForSession` →
   redirect a `/projects` (o al `next` original).
5. La sesión vive en cookies httponly; `proxy.ts` la refresca en cada request.

## Datos: cómo llegan al frontend

```
Cliente Excel ─┐
               ├─ parse_rfi.py ─ rfi.json + components.gpkg ─┐
KMZ/SHP ───────┘                                             │
                                                             ▼
                                            submit_rfi.py (psycopg2 + storage)
                                                             │
                                                             ▼
                                          Supabase: clientes / projects /
                                            componente_inventario /
                                            components_geom (PostGIS) /
                                            rfi_submissions  +  bucket rfi-artifacts
                                                             │
                                                             ▼
                                                     Frontend (este repo)
                                              · server components leen vía
                                                @supabase/ssr (cookies-based auth)
                                              · mapas leen GeoJSON vía RPC
                                                project_features / all_project_centroids
```

## Deploy a Vercel

```bash
# Una sola vez:
npm i -g vercel
vercel login
vercel link    # asocia este folder a un proyecto Vercel

# Cada deploy:
vercel --prod
```

Variables de entorno en el dashboard de Vercel (Settings → Environment Variables):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Después del primer deploy:

1. Copiar la URL `https://<proyecto>.vercel.app`.
2. En Supabase → Auth → URL Configuration agregarla a Site URL y Redirect URLs.
3. Volver a deploy si cambiaron envs (`vercel --prod`).

## Estructura

```
src/
├── app/
│   ├── layout.tsx          shell raíz
│   ├── page.tsx            redirect → /projects
│   ├── login/
│   │   ├── page.tsx        formulario magic link
│   │   └── actions.ts      Server Actions (signIn, signOut)
│   ├── auth/callback/route.ts   intercambia code por sesión
│   └── (app)/              grupo de rutas autenticadas
│       ├── layout.tsx      sidebar + sign-out
│       ├── projects/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       └── map/page.tsx
├── components/
│   ├── ProjectMap.tsx      MapLibre — un proyecto
│   └── PeruMap.tsx         MapLibre — todos los proyectos
├── lib/
│   ├── supabase/
│   │   ├── server.ts       createClient (Server Components)
│   │   ├── client.ts       createClient (browser)
│   │   └── proxy-helper.ts updateSession (gateway)
│   └── types.ts            tipos derivados del schema
└── proxy.ts                reemplaza middleware.ts en Next 16
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Dev server con Turbopack |
| `npm run build` | Build de producción + type-check |
| `npm run start` | Servir build local |
| `npm run lint` | ESLint |
