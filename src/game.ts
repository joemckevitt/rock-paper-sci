import { randomInt } from "node:crypto";

export const MOVES = ["rock", "paper", "scissors"] as const;
export type Move = (typeof MOVES)[number];
export type Result = "win" | "lose" | "draw";

const BEATS: Record<Move, Move> = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};

export const randomMove = (): Move => MOVES[randomInt(MOVES.length)]!;

export function play(player: Move, computer: Move = randomMove()) {
  const result: Result =
    player === computer ? "draw" : BEATS[player] === computer ? "win" : "lose";
  return { player, computer, result };
}
