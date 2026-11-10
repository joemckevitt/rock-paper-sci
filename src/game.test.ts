import { describe, it, expect } from "vitest";
import { play } from "./game.js";

describe("play", () => {
  it("rock beats scissors", () => expect(play("rock", "scissors").result).toBe("win"));
  it("rock loses to paper", () => expect(play("rock", "paper").result).toBe("lose"));
  it("draw on same move", () => expect(play("paper", "paper").result).toBe("draw"));
});
