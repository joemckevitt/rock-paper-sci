import Fastify, { type FastifyReply } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { MOVES, play } from "./game.js";
import { Scoreboard } from "./scoreboard.js";
import { buildMcpServer } from "./mcp.js";
import {
  ErrorResponse,
  Health,
  Moves,
  PlayBody,
  RateLimited,
  RoundResult,
  Score,
} from "./schemas.js";

export async function buildApp({ logger = true } = {}) {
  const app = Fastify({
    logger,
    // MCP messages are bigger than a REST move, so allow 64 KB.
    bodyLimit: 64 * 1024,
    // Behind a hosting proxy (Render), use the real client IP for rate limiting.
    trustProxy: process.env.TRUST_PROXY === "true",
  }).withTypeProvider<ZodTypeProvider>();

  // Zod schemas drive request validation, response serialisation and the OpenAPI spec.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((err, _req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.code(400).send({
        error: "Invalid request",
        details: err.validation.map((v) => ({
          path: v.instancePath || "/",
          message: v.message ?? "invalid",
        })),
      });
    }
    return reply.send(err);
  });

  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Rock, Paper, Scissors API",
        description: "Play rock, paper, scissors against the computer over REST or MCP.",
        version: "1.0.0",
      },
      tags: [
        { name: "Game", description: "Play rounds and see the score" },
        { name: "System", description: "Health and metadata" },
        { name: "MCP", description: "Model Context Protocol endpoint for AI clients" },
      ],
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    staticCSP: true,
    uiConfig: { docExpansion: "list", deepLinking: true, tryItOutEnabled: true },
  });

  // Helmet's default CSP, plus the hashes Swagger UI needs for its inline script and styles.
  // Helmet merges these directives with its defaults.
  await app.register(helmet, (instance) => ({
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:"],
        "script-src": ["'self'", ...instance.swaggerCSP.script],
        "style-src": ["'self'", ...instance.swaggerCSP.style],
      },
    },
  }));

  await app.register(rateLimit, { max: 60, timeWindow: "1 minute" });

  const rateLimited = { 429: RateLimited.describe("Too many requests") };

  app.get(
    "/health",
    {
      schema: {
        tags: ["System"],
        summary: "Health check",
        response: { 200: Health, ...rateLimited },
      },
    },
    async () => ({ status: "ok" as const }),
  );

  app.get(
    "/moves",
    {
      schema: {
        tags: ["Game"],
        summary: "List valid moves",
        response: { 200: Moves, ...rateLimited },
      },
    },
    async () => ({ moves: [...MOVES] }),
  );

  const scoreboard = new Scoreboard();

  app.post(
    "/play",
    {
      schema: {
        tags: ["Game"],
        summary: "Play a round",
        description: "Plays one round against the computer and returns the result and running score.",
        body: PlayBody,
        response: { 200: RoundResult, 400: ErrorResponse, ...rateLimited },
      },
    },
    async (req) => {
      const round = play(req.body.move);
      return { ...round, score: scoreboard.record(round.result) };
    },
  );

  app.get(
    "/score",
    {
      schema: {
        tags: ["Game"],
        summary: "Get the score",
        response: { 200: Score, ...rateLimited },
      },
    },
    async () => scoreboard.get(),
  );

  app.delete(
    "/score",
    {
      schema: {
        tags: ["Game"],
        summary: "Reset the score",
        response: { 200: Score, ...rateLimited },
      },
    },
    async () => scoreboard.reset(),
  );

  // MCP over Streamable HTTP, stateless: a fresh server and transport per request.
  // The body is JSON-RPC, so it's documented but validated by the MCP SDK, not Zod.
  app.post(
    "/mcp",
    {
      schema: {
        tags: ["MCP"],
        summary: "MCP endpoint (JSON-RPC over Streamable HTTP)",
        description:
          "For MCP clients such as Claude. Tools: play_move, get_score, reset_score. " +
          "Requests need the header Accept: application/json, text/event-stream.",
      },
    },
    async (req, reply) => {
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
    },
  );

  const methodNotAllowed = async (_req: unknown, reply: FastifyReply) =>
    reply.code(405).header("allow", "POST").send({ error: "Method not allowed" });
  app.get("/mcp", { schema: { hide: true } }, methodNotAllowed);
  app.delete("/mcp", { schema: { hide: true } }, methodNotAllowed);

  return app;
}
