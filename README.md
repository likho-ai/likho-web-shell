# likho-web-shell

The Likho web app: the frame every screen lives in. Sign-in, the navigation bar, light and dark
themes, the home page, the settings page, and the loader for the apps that
come from their own repositories at run time.

React 19, Vite 8, TypeScript, Tailwind CSS v4 with the [likho-ui](https://github.com/likho-ai/likho-ui)
tokens, [likho-web-sdk](https://github.com/likho-ai/likho-web-sdk) for the API, Module Federation
(`@module-federation/vite`) for the apps.

## How the apps fit together

```
browser ── gateway (nginx) ──┬── /            likho-web-shell     the frame, sign-in, home, search, settings
                             ├── /mfe/manifest.json              which remote entry each app is at (likho-infra)
                             ├── /mfe/library/     likho-mfe-library     /recordings
                             ├── /mfe/transcript/  likho-mfe-transcript  /recordings/:id
                             ├── /mfe/admin/       likho-mfe-admin       /admin (admins)
                             ├── /mfe/vocabulary/  likho-mfe-vocabulary  /vocabulary
                             ├── /graphql /api/ /events/  likho-api
                             └── /media/           likho-media
```

The shell reads `/mfe/manifest.json` once, registers each app with the federation runtime and
mounts its `./App` under its route. `react`, `react-dom`, `react-router`, `@tanstack/react-query`,
`@likho-ai/ui` and `@likho-ai/web-sdk` are shared singletons, so the router, the query cache and
the theme are the shell's. An app that cannot be loaded shows a message with a retry in its
area; the rest keeps working. Releasing or rolling back one app changes one line of the manifest.

Each app scopes its stylesheet under its own root element (`[data-mfe="…"]`), so the same utility
class in the shell and in an app never fights over an element.

## Run it

Needs the [likho-infra](https://github.com/likho-ai/likho-infra) stack (the gateway on 8080) and
likho-api. For the recordings and transcript screens, the two apps' dev servers too.

```bash
pnpm install
pnpm dev          # http://localhost:5173, use it through http://localhost:8080
```

In `likho-mfe-library`, `likho-mfe-transcript`, `likho-mfe-admin` and `likho-mfe-vocabulary`:
`pnpm dev` (5174 to 5177). The gateway proxies `/`, `/mfe/library/`, `/mfe/transcript/`,
`/mfe/admin/` and `/mfe/vocabulary/` to the five dev servers.

The shell's own pages besides the home page: sign in (with "Forgotten your password?" →
`/forgot`, which mails a link to `/reset/:token`), `/invite/:token` (the page an invitation link
opens: whom it is for, a name, a password), search, vocabulary and settings (appearance and your
own password; the workspace's settings, people, keys and the audit log are the admin app's).
A viewer sees no upload button and no Admin section.

## Try it end to end

With the stack, the four services, likho-api and the three dev servers running, this drives the
whole product in Chrome: sign in, upload a recording, watch it transcribed, read both layers,
play it, delete it.

```bash
LIKHO_E2E_FILE=/path/to/a-call.mp3 pnpm e2e        # LIKHO_E2E_EMAIL / _PASSWORD: a likho-api account
```

## Develop

```bash
pnpm test          # the pages and the remote loader, with a fake API
pnpm lint && pnpm typecheck && pnpm build
docker build -t likho-web-shell .    # nginx serving the built files
```

Settings: `.env.development`, `.env.staging`, `.env.production` (Vite modes; only `VITE_*` values
reach the browser). `VITE_API_ORIGIN` is where the API is (empty = the page's own origin),
`VITE_MFE_MANIFEST` where the apps are listed.
