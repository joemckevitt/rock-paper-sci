const EMOJI = { rock: "🪨", paper: "📄", scissors: "✂️" };
const RESULT_TEXT = { win: "You win! 🎉", lose: "You lose.", draw: "It's a draw." };
const REVEAL_MS = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600;

const moveButtons = document.querySelectorAll(".move");
const resetButton = document.getElementById("reset");
const faceoff = document.getElementById("faceoff");
const playerEmoji = document.getElementById("player-emoji");
const computerEmoji = document.getElementById("computer-emoji");
const message = document.getElementById("message");

class RequestError extends Error {
  constructor(status) {
    super(`Request failed with status ${status}`);
    this.status = status;
  }
}

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new RequestError(res.status);
  return res.json();
}

function errorText(err) {
  if (err instanceof RequestError && err.status === 429) {
    return "Slow down a little! Try again in a minute.";
  }
  return "Couldn't reach the game. Check your connection and try again.";
}

function showScore(score) {
  for (const key of ["wins", "losses", "draws", "played"]) {
    document.getElementById(key).textContent = score[key];
  }
}

function showMessage(text, kind = "") {
  message.textContent = text;
  message.className = `message ${kind}`.trim();
}

function setBusy(busy) {
  for (const button of [...moveButtons, resetButton]) button.disabled = busy;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function play(move) {
  setBusy(true);
  faceoff.hidden = false;
  faceoff.classList.remove("revealed");
  faceoff.classList.add("thinking");
  playerEmoji.textContent = EMOJI[move];
  computerEmoji.textContent = "❔";
  showMessage("Rock, paper, scissors…");

  try {
    const [round] = await Promise.all([api("POST", "/play", { move }), wait(REVEAL_MS)]);
    faceoff.classList.remove("thinking");
    faceoff.classList.add("revealed");
    computerEmoji.textContent = EMOJI[round.computer];
    showMessage(`${RESULT_TEXT[round.result]} The computer picked ${round.computer}.`, round.result);
    showScore(round.score);
  } catch (err) {
    faceoff.hidden = true;
    faceoff.classList.remove("thinking");
    showMessage(errorText(err), "error");
  } finally {
    setBusy(false);
  }
}

async function reset() {
  if (!confirm("Reset the score for everyone?")) return;
  setBusy(true);
  try {
    showScore(await api("DELETE", "/score"));
    faceoff.hidden = true;
    showMessage("Score reset. Fresh start!");
  } catch (err) {
    showMessage(errorText(err), "error");
  } finally {
    setBusy(false);
  }
}

async function loadScore() {
  try {
    showScore(await api("GET", "/score"));
  } catch (err) {
    showMessage(errorText(err), "error");
  }
}

for (const button of moveButtons) {
  button.addEventListener("click", () => play(button.dataset.move));
}
resetButton.addEventListener("click", reset);
loadScore();
