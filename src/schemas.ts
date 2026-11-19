import { z } from "zod";
import { MOVES } from "./game.js";

export const Move = z.enum(MOVES).describe("A move: rock, paper or scissors");

export const PlayBody = z
  .strictObject({ move: Move })
  .meta({ id: "PlayRequest", example: { move: "rock" } });

export const Score = z
  .object({
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    draws: z.number().int().nonnegative(),
    played: z.number().int().nonnegative(),
  })
  .meta({ id: "Score", example: { wins: 3, losses: 1, draws: 1, played: 5 } });

export const RoundResult = z
  .object({
    player: Move.describe("Your move"),
    computer: Move.describe("The computer's move"),
    result: z.enum(["win", "lose", "draw"]).describe("Result from your point of view"),
    score: Score,
  })
  .meta({ id: "RoundResult" });

export const ErrorResponse = z
  .object({
    error: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  })
  .meta({ id: "Error" });

export const RateLimited = z
  .object({ statusCode: z.literal(429), error: z.string(), message: z.string() })
  .meta({ id: "RateLimited" });

export const Health = z.object({ status: z.literal("ok") }).meta({ id: "Health" });

export const Moves = z.object({ moves: z.array(Move) }).meta({ id: "Moves" });
