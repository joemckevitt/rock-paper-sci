# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Rock, paper, scissors served over REST and MCP. TypeScript (ESM, Node 22+), Fastify 5, Zod 4.

## Commands

```sh
npm run dev                             # tsx watch on http://localhost:3000 (PORT overrides)
npm test                                # vitest run, all tests
npx vitest run src/app.test.ts          # one file
npx vitest run -t "rejects a bad move"  # one test by name
npm run build                           # tsc -p tsconfig.build.json -> dist/ (excludes *.test.ts)
npm run typecheck                       # tsc --noEmit, includes tests
npm run deploy                          # deploy current pushed commit to Render (see Deployment)
```

There is no linter or formatter configured.

## Architecture

`src/server.ts` only listens; everything is built in `buildApp()` in `src/app.ts`, which tests call directly and exercise with `app.inject()` (no network). Each `buildApp()` creates its own `Scoreboard`, so tests are isolated.

- **One scoreboard, two front doors.** `buildApp()` creates a single in-memory `Scoreboard` and passes it to both the REST routes and `buildMcpServer()` (`src/mcp.ts`). Both call `play()` from `src/game.ts`. Game rules live only in `game.ts`; `MOVES` there is the source of truth for the Zod enums in `schemas.ts` and the MCP tool input.
- **Zod schemas do triple duty.** Route `schema` entries using the Zod objects in `src/schemas.ts` drive request validation, response serialisation (via `fastify-type-provider-zod`) and the OpenAPI 3.1 spec served by Swagger UI at `/docs` (`/docs/json`, `/docs/yaml`). `.meta({ id })` names the OpenAPI component. A new route needs a schema with `tags`, `summary` and `response` (including the shared `429` entry) to appear correctly in the docs; `src/docs.test.ts` asserts the exact list of documented paths, so update it when adding or removing a route.
- **Validation errors** are reshaped by the custom error handler into `{ error, details: [{ path, message }] }` with status 400, matching `ErrorResponse`.
- **MCP is stateless Streamable HTTP.** `POST /mcp` builds a fresh `McpServer` and transport per request, then `reply.hijack()`s so the MCP SDK writes the raw response. Its JSON-RPC body is validated by the SDK, not Zod. `GET`/`DELETE /mcp` return 405. MCP clients must send `Accept: application/json, text/event-stream`.
- **Security middleware:** Helmet's CSP is extended with Swagger UI's script/style hashes (`instance.swaggerCSP`), so `swagger-ui` must be registered before `helmet`. Rate limit is 60 req/min per IP; it uses the real client IP only when `TRUST_PROXY=true`. Body limit is 64 KB for MCP messages.
- **Web page:** `public/` (plain HTML/CSS/JS, no build step) is served by `@fastify/static` at `/`, hidden from the OpenAPI spec. It is registered with `wildcard: false`, so files are picked up at startup: restart the dev server after adding one. The CSP forbids inline `<script>`, `<style>`, `style=""` and `on*=` handlers; put code in the `.js`/`.css` files. The Dockerfile copies `public/` into the runtime image.
- Imports use `.js` extensions (NodeNext resolution). `noUncheckedIndexedAccess` is on.

## Deployment

Hosted on Render as the free Docker web service `rps-api` (`srv-dc25uvtg1s2s7392lnig`, https://rps-api-nrwa.onrender.com), managed by the `render.yaml` Blueprint. Render's own auto-deploy is off; deploys happen two ways:

- `.github/workflows/deploy.yml` runs on every push to `main`: build + test, then deploys that commit through the Render API (`RENDER_API_KEY` repo secret) and polls until it is live.
- `npm run deploy` (`scripts/deploy.sh`) deploys the current commit with the Render CLI. It needs `RENDER_SERVICE_ID` in `.env` and refuses to run with uncommitted or unpushed changes, because Render builds from GitHub.

The score is in memory, so it resets on every deploy and whenever the free instance sleeps.

## Workflow

Changes go on a branch and into `main` by pull request (merge commits). Merging to `main` deploys to production.
