# rps-api

Rock, paper, scissors over REST and MCP. TypeScript, Fastify, Zod.

## Run locally

Needs Node 22+.

    npm install
    npm run dev

Server runs on http://localhost:3000.

## REST endpoints

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
# rock-paper-sci
# rock-paper-sci
