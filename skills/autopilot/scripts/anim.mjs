// Autopilot boot animation. Plays in its own console window, then exits (closing the window).
// Usage: node anim.mjs [goal text]     Preview it any time with the same command.
const goal = process.argv.slice(2).join(" ").slice(0, 60);
const out = process.stdout;
const W = () => out.columns || 80;
const H = () => out.rows || 24;
const ESC = "\x1b[";
const color = (code, s) => `${ESC}${code}m${s}${ESC}0m`;
const ORANGE = "38;5;209", CYAN = "38;5;51", YELLOW = "38;5;226", RED = "38;5;196", DIM = "2", BOLD = "1";

const BODY = [" ▐▛███▜▌ ", "▝▜█████▛▘", "  ▘▘ ▝▝  "];
const GOGGLES = [" ▐◉███◉▌ ", "▝▜█████▛▘", "  ▘▘ ▝▝  "];
const CAP = "  ▄▄▄▄▄  ";
const FLAME = [["  ░▒▓▒░  ", "   ▒▓▒   "], ["  ▒▓█▓▒  ", "   ░▓░   "], ["  ░▓█▓░  ", "   ▒░▒   "]];
const TITLE = ["▄▀█ █ █ ▀█▀ █▀█ █▀█ █ █   █▀█ ▀█▀", "█▀█ █▄█  █  █▄█ █▀▀ █ █▄▄ █▄█  █ "];

const pad = (s) => " ".repeat(Math.max(0, Math.floor((W() - [...s].length) / 2))) + s;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function draw(rows, top) {
  let buf = `${ESC}H${ESC}2J`;
  rows.forEach(([text, code], i) => {
    const y = top + i;
    if (y >= 1 && y <= H()) buf += `${ESC}${y};1H${code ? color(code, pad(text)) : pad(text)}`;
  });
  out.write(buf);
}

const critter = (face, extra = []) => face.map((l) => [l, ORANGE]).concat(extra);

async function play() {
  out.write(`${ESC}?25l`);
  const mid = Math.floor(H() / 2) - 3;
  // 1. Clawd blinks awake
  for (const face of [BODY, [" ▐▀███▀▌ ", BODY[1], BODY[2]], BODY]) {
    draw(critter(face, [["", null], ["...", DIM]]), mid);
    await sleep(280);
  }
  // 2. Pilot cap + goggles drop on
  for (let y = 1; y <= mid; y += 2) {
    draw([[CAP, CYAN], ...Array(Math.max(0, mid - y - 1)).fill(["", null]), ...critter(BODY)], y);
    await sleep(40);
  }
  draw([[CAP, CYAN], ...critter(GOGGLES), ["", null], ["*click*", YELLOW]], mid - 1);
  await sleep(450);
  // 3. Engines rumble, then liftoff
  for (let i = 0; i < 10; i++) {
    const shake = i % 2 ? " " : "";
    const f = FLAME[i % 3];
    draw([[shake + CAP, CYAN], ...critter(GOGGLES.map((l) => shake + l)), [f[0], RED], [f[1], YELLOW]], mid - 1);
    await sleep(70);
  }
  for (let y = mid - 1; y > -8; y--) {
    const f = FLAME[y % 3 < 0 ? 0 : y % 3];
    draw([[CAP, CYAN], ...critter(GOGGLES), [f[0], RED], [f[1], YELLOW], ["  ░ ░ ░  ", DIM]], y);
    await sleep(45);
  }
  // 4. Title + loading bar
  const t = mid - 1;
  for (let n = 1; n <= TITLE[0].length; n += 2) {
    draw(TITLE.map((l) => [l.slice(0, n).padEnd(TITLE[0].length), BOLD + ";" + ORANGE]), t);
    await sleep(18);
  }
  const width = 30;
  for (let i = 0; i <= width; i++) {
    const bar = "█".repeat(i) + "░".repeat(width - i);
    const label = i < width ? "engaging" + ".".repeat(i % 4) : "ENGAGED";
    draw([...TITLE.map((l) => [l, BOLD + ";" + ORANGE]), ["", null], [bar, CYAN], [label.padEnd(10), i < width ? DIM : BOLD + ";" + YELLOW]], t);
    await sleep(35);
  }
  const lines = [...TITLE.map((l) => [l, BOLD + ";" + ORANGE]), ["", null], ["█".repeat(width), CYAN], ["ENGAGED", BOLD + ";" + YELLOW], ["", null]];
  if (goal) lines.push([`mission: ${goal}`, null]);
  lines.push(["hands off the wheel. I'll report back.", DIM]);
  draw(lines, t);
  await sleep(1600);
}

play()
  .catch(() => {})
  .finally(() => out.write(`${ESC}0m${ESC}?25h${ESC}2J${ESC}H`));
