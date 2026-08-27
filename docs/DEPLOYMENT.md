# Deploying Drug Info Center

The app is TanStack Start (Vite + Nitro). One codebase, several build targets —
pick a preset, set the environment variables, deploy.

## Environment variables

| Variable                        | Scope           | Notes                                     |
| ------------------------------- | --------------- | ----------------------------------------- |
| `VITE_SUPABASE_URL`             | build + browser | Supabase project URL                      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | build + browser | Publishable (anon) key                    |
| `SUPABASE_URL`                  | server          | Same project URL                          |
| `SUPABASE_PUBLISHABLE_KEY`      | server          | Same publishable key (public reads)       |
| `SUPABASE_SERVICE_ROLE_KEY`     | server, secret  | Ingestion / "Add to corpus" only          |
| `GOOGLE_API_KEY`                | server, secret  | Embeddings + answer synthesis (preferred) |
| `LOVABLE_API_KEY`               | server, secret  | Embeddings + answer synthesis (fallback)  |

The `VITE_*` pair is inlined at build time, so it must be present during the
build, not only at runtime. Never expose the service role key to the browser.

**AI provider:** set `GOOGLE_API_KEY` if you want the app to run independently
of Lovable (uses Google's OpenAI-compatible Gemini endpoint). If only
`LOVABLE_API_KEY` is set, the app uses the Lovable AI Gateway. If both are set,
`GOOGLE_API_KEY` takes priority.

## Docker (any host: Fly, Render, Railway, a VPS)

```sh
docker build -t drug-info-center \
  --build-arg VITE_SUPABASE_URL=... \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=... .
docker run -p 3000:3000 --env-file .env drug-info-center
```

Or with Compose (reads `.env` for both build args and runtime):

```sh
docker compose up --build
```

The image builds with `NITRO_PRESET=node_server` and serves
`.output/server/index.mjs` on `PORT` (default 3000).

## Vercel

`vercel.json` is committed and already sets the install/build commands and
`.vercel/output` as the output directory.

1. Import the GitHub repo in Vercel.
2. Project Settings, Environment Variables: add all six variables above for
   Production and Preview.
3. Deploy. Subsequent pushes to `main` deploy automatically.

Local check: `bun run build:vercel`.

## Cloudflare Workers

`wrangler.toml` is committed; `cloudflare` is the default Nitro preset, so a
plain `bun run build` produces the right output.

```sh
bun run build
bunx wrangler secret put SUPABASE_PUBLISHABLE_KEY
bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
bunx wrangler secret put LOVABLE_API_KEY
bunx wrangler deploy
```

`SUPABASE_URL` lives in `[vars]` in `wrangler.toml` (not a secret). The
`VITE_*` values must be exported in the shell before `bun run build`.

## Node without Docker

```sh
bun install --frozen-lockfile
bun run build:node
bun run start      # node .output/server/index.mjs
```

## CI

`.github/workflows/ci.yml` runs lint, typecheck, tests and a production build on
every push and pull request. Add `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` as GitHub Actions repository secrets so the
build step matches production.

## Database

Deployments expect the schema and seed from
[`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) to be applied to the target project
(`supabase/schema.sql`, then `supabase/seed.sql`).
