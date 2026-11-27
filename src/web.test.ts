import { describe, it, expect } from "vitest";
import { buildApp } from "./app.js";

describe("Web page", () => {
  it("serves the game page at /", async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    for (const move of ["rock", "paper", "scissors"]) {
      expect(res.body).toContain(`data-move="${move}"`);
    }
    expect(res.headers["content-security-policy"]).toContain("script-src 'self'");
  });

  it("serves the script and stylesheet", async () => {
    const app = await buildApp({ logger: false });
    const js = await app.inject({ method: "GET", url: "/app.js" });
    expect(js.statusCode).toBe(200);
    expect(js.headers["content-type"]).toContain("javascript");

    const css = await app.inject({ method: "GET", url: "/styles.css" });
    expect(css.statusCode).toBe(200);
    expect(css.headers["content-type"]).toContain("text/css");
  });

  it("still returns 404 for unknown paths", async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
  });
});
