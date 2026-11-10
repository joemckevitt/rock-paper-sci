import Fastify from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { MOVES, play } from "./game.js";
import { Scoreboard } from "./scoreboard.js";
import { buildMcpServer } from "./mcp.js";

const PlayBody = z.strictObject({ move: z.enum(MOVES) });

export async function buildApp({ logger = true } = {}) {
  // MCP messages are bigger than a REST move, so allow 64 KB.
  const app = Fastify({ logger, bodyLimit: 64 * 1024 });
  const scoreboard = new Scoreboard();

  await app.register(helmet);
  await app.register(rateLimit, { max: 60, timeWindow: "1 minute" });

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/moves", async () => ({ moves: MOVES }));

  app.post("/play", async (req, reply) => {
    const parsed = PlayBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "move must be rock, paper or scissors" });
    }
    const round = play(parsed.data.move);
    return { ...round, score: scoreboard.record(round.result) };
  });

  app.get("/score", async () => scoreboard.get());
  app.delete("/score", async () => scoreboard.reset());

  // MCP over Streamable HTTP, stateless: a fresh server and transport per request.
  app.post("/mcp", async (req, reply) => {
    const server = buildMcpServer(scoreboard);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    reply.raw.on("close", () => {
      void transport.close();
      void server.close();
    });
    reply.hijack();
    await server.connect(transport);
    await transport.handleRequest(req.raw, reply.raw, req.body);
  });

  const methodNotAllowed = async (_req: unknown, reply: import("fastify").FastifyReply) =>
    reply.code(405).header("allow", "POST").send({ error: "Method not allowed" });
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  return app;
}
