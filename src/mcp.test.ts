import { describe, it, expect } from "vitest";
import { buildApp } from "./app.js";

const headers = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
};

const rpc = (id: number, method: string, params: object = {}) => ({
  jsonrpc: "2.0",
  id,
  method,
  params,
});

describe("MCP endpoint", () => {
  it("lists tools", async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: "POST", url: "/mcp", headers, payload: rpc(1, "tools/list") });
    expect(res.statusCode).toBe(200);
    const names = res.json().result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual(["play_move", "get_score", "reset_score"]);
  });

  it("plays a move and shares the score with REST", async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({
      method: "POST",
      url: "/mcp",
      headers,
      payload: rpc(2, "tools/call", { name: "play_move", arguments: { move: "paper" } }),
    });
    const body = JSON.parse(res.json().result.content[0].text);
    expect(body.player).toBe("paper");

    const score = await app.inject({ method: "GET", url: "/score" });
    expect(score.json().played).toBe(1);
  });

  it("rejects an invalid move", async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({
      method: "POST",
      url: "/mcp",
      headers,
      payload: rpc(3, "tools/call", { name: "play_move", arguments: { move: "lizard" } }),
    });
    const json = res.json();
    expect(json.error ?? json.result.isError).toBeTruthy();
  });
});
