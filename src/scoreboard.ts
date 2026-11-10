import type { Result } from "./game.js";

export interface Score {
  wins: number;
  losses: number;
  draws: number;
  played: number;
}

// In-memory only: scores reset when the server restarts.
export class Scoreboard {
  private score: Score = { wins: 0, losses: 0, draws: 0, played: 0 };

  record(result: Result): Score {
    if (result === "win") this.score.wins++;
    else if (result === "lose") this.score.losses++;
    else this.score.draws++;
    this.score.played++;
    return this.get();
  }

  get(): Score {
    return { ...this.score };
  }

  reset(): Score {
    this.score = { wins: 0, losses: 0, draws: 0, played: 0 };
    return this.get();
  }
}
