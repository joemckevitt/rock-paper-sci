# rps-api

Rock, paper, scissors over REST and MCP. TypeScript, Fastify, Zod, OpenAPI.

## Run locally

Needs Node 22+.

    npm install
    npm run dev

Server runs on http://localhost:3000.

## Play in the browser

Open http://localhost:3000/ (or https://rps-api-nrwa.onrender.com/ for the
deployed version) on a phone or computer. Tap rock, paper or scissors to play
a round against the computer. The page shows the running score and has a reset
button.

Everyone shares one scoreboard, including players using the REST API and MCP,
so resetting clears it for everyone.

The page is plain HTML, CSS and JavaScript in `public/`, served by the same
Fastify app. Helmet's content security policy blocks inline scripts and
styles, so keep them in the separate `.js` and `.css` files.

## API docs

Interactive Swagger UI is at http://localhost:3000/docs, where you can try every
endpoint from the browser. The OpenAPI 3.1 spec is at `/docs/json` and `/docs/yaml`,
generated from the same Zod schemas that validate requests and responses.

## REST endpoints

- `GET /` serves the web page (not in the API docs)
- `POST /play` with `{"move":"rock"}` plays a round and returns the result plus the running score
- `GET /score` returns wins, losses, draws and rounds played
- `DELETE /score` resets the score
- `GET /moves` lists valid moves
- `GET /health` health check

## MCP endpoint

`POST /mcp` speaks MCP over Streamable HTTP (stateless). Tools:

- `play_move` with `move`: rock, paper or scissors
- `get_score`
- `reset_score`

MCP and REST share one scoreboard.

## Connect to Claude on the web

Claude connects to custom connectors from Anthropic's cloud, so it can't reach
localhost. Expose your local server with a tunnel:

    npx cloudflared tunnel --url http://localhost:3000

Copy the https URL it prints, then in claude.ai go to Customize > Connectors,
click +, choose Add custom connector, and use `<tunnel-url>/mcp` as the URL.

The connector has no authentication. Anyone with the URL can play and reset
the score. Stop the tunnel when you're done.

The score lives in memory, so it resets when the server restarts.

## Deploy free on Render

1. Push this repo to GitHub
2. In Render, choose New > Blueprint and pick the repo. `render.yaml` sets up a
   free Docker web service with a health check
3. Use `https://<your-service>.onrender.com/mcp` as the Claude connector URL

Free services sleep after 15 minutes without traffic and take about a minute
to wake. The score resets when that happens.

### Deploy on merge to main

`.github/workflows/deploy.yml` typechecks, builds and tests every pull request
and every push to `main`. On `main` it then deploys that commit to Render and
waits for it to go live.

`main` is protected: changes must go through a pull request, and the `test`
job must pass before it can merge. This applies to admins too, and force
pushes and deleting `main` are blocked. It needs a Render
API key (Account Settings > API Keys) stored as the `RENDER_API_KEY` repo
secret:

    gh secret set RENDER_API_KEY

Render's own auto-deploy is off so each commit deploys once, after tests pass.
You can also rerun a deploy from the Actions tab with Run workflow.

### Deploy from the command line

Deploy any pushed commit by hand with the
[Render CLI](https://render.com/docs/cli).

One-time setup:

    brew install render
    render login
    render services        # copy the rps-api service ID (srv-...)
    echo "RENDER_SERVICE_ID=srv-..." >> .env

Then, after committing and pushing:

    npm run deploy

This deploys the current commit, streams the build logs and exits non-zero if
the deploy fails.
