import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MOVES, play } from "./game.js";
import type { Scoreboard } from "./scoreboard.js";

// Builds an MCP server whose tools call the same game logic and
// scoreboard as the REST endpoints.
export function buildMcpServer(scoreboard: Scoreboard) {
  const server = new McpServer({ name: "rock-paper-scissors", version: "1.0.0" });

  const asText = (data: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  });

  server.registerTool(
    "play_move",
    {
      title: "Play rock, paper, scissors",
      description:
        "Play one round against the computer. Returns both moves, the result and the running score.",
      inputSchema: { move: z.enum(MOVES).describe("Your move") },
    },
    async ({ move }) => {
      const round = play(move);
      return asText({ ...round, score: scoreboard.record(round.result) });
    },
  );

  server.registerTool(
    "get_score",
    {
      title: "Get score",
      description: "Get wins, losses, draws and rounds played.",
      annotations: { readOnlyHint: true },
    },
    async () => asText(scoreboard.get()),
  );

  server.registerTool(
    "reset_score",
    {
      title: "Reset score",
      description: "Reset the scoreboard to zero.",
      annotations: { destructiveHint: true },
    },
    async () => asText(scoreboard.reset()),
  );

  return server;
}
