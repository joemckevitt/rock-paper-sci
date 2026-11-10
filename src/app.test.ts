import { describe, it, expect } from "vitest";
import { buildApp } from "./app.js";

describe("API", () => {
  it("plays a round and updates the score", async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: "POST", url: "/play", payload: { move: "rock" } });
    expect(res.statusCode).toBe(200);
    expect(res.json().score.played).toBe(1);

    const score = await app.inject({ method: "GET", url: "/score" });
    expect(score.json().played).toBe(1);

    const reset = await app.inject({ method: "DELETE", url: "/score" });
    expect(reset.json().played).toBe(0);
  });

  it("rejects a bad move", async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: "POST", url: "/play", payload: { move: "lizard" } });
    expect(res.statusCode).toBe(400);
  });
});
