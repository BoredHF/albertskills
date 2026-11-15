// Parses /work task cards (.work/cards.md). Vendored so autopilot works without the /work skill.
const CARD = /^- \[( |~|x)\] (\S+) \| (drive|pair|delegate) \| ([SML]) \| (v1|later|polish) \|/;
const USED = /\| used:(\d+(?:\.\d+)?)%/;

export function parseCards(text) {
  return text.split(/\r?\n/).flatMap((line) => {
    const m = CARD.exec(line);
    if (!m) return [];
    const used = USED.exec(line);
    const [, mark, id, mode, size, cut] = m;
    return [{ id, mode, size, cut, done: mark === "x", doing: mark === "~", used: used ? Number(used[1]) : null }];
  });
}
