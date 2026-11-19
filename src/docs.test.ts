import { describe, it, expect } from "vitest";
import { buildApp } from "./app.js";

describe("OpenAPI docs", () => {
  it("serves an OpenAPI 3.1 spec covering every route", async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    expect(res.statusCode).toBe(200);
    const spec = res.json();
    expect(spec.openapi).toBe("3.1.0");
    expect(Object.keys(spec.paths).sort()).toEqual(["/health", "/mcp", "/moves", "/play", "/score"]);
    expect(spec.paths["/play"].post.requestBody).toBeDefined();
    expect(spec.components.schemas.RoundResult).toBeDefined();
  });

  it("serves the Swagger UI page", async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: "GET", url: "/docs/" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
  });

  it("returns field-level details for a bad move", async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: "POST", url: "/play", payload: { move: "lizard" } });
    expect(res.statusCode).toBe(400);
    expect(res.json().details[0].path).toBe("/move");
  });
});
