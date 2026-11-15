#!/usr/bin/env node
// Live link between the viewer and Claude.
//   node serve.mjs serve [dir] [port]   serve the map at http://127.0.0.1:<port>, collect "Send to Claude" into inbox.json
// Run it in the background once per session; `mm.mjs turn` / `wait` pick up what the viewer sends.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const KINDS = ["add", "note", "want", "skip", "expand", "fill", "message", "answer", "organize", "core"];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };
const MAX_BODY = 64 * 1024;

function fail(msg) { console.error("error: " + msg); process.exit(1); }
const inboxOf = (root) => path.join(root, "inbox.json");
const serverFileOf = (root) => path.join(root, ".server");

function readInbox(root) {
  try { const v = JSON.parse(fs.readFileSync(inboxOf(root), "utf8")); return Array.isArray(v) ? v : []; } catch { return []; }
}
function validItem(p) {
  return p && typeof p.id === "string" && p.id.length < 64 && KINDS.includes(p.kind) && typeof p.target === "string" &&
    (p.label === undefined || typeof p.label === "string") && (p.text === undefined || typeof p.text === "string") && (p.q === undefined || typeof p.q === "string");
}
function clean(p) {
  const out = { id: p.id, kind: p.kind, target: p.target };
  if (p.label) out.label = p.label.slice(0, 200);
  if (p.text) out.text = p.text.slice(0, 1000);
  if (p.q) out.q = p.q.slice(0, 300);
  return out;
}

function receive(root, req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > MAX_BODY) { res.writeHead(413).end(); req.destroy(); }
  });
  req.on("end", () => {
    let items;
    try { items = JSON.parse(body).items; } catch { items = null; }
    if (!Array.isArray(items) || !items.every(validItem)) { res.writeHead(400).end("bad items"); return; }
    const inbox = readInbox(root);
    const seen = new Set(inbox.map((p) => p.id));
    items.forEach((p) => { if (!seen.has(p.id)) inbox.push(clean(p)); });
    fs.writeFileSync(inboxOf(root), JSON.stringify(inbox), "utf8");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true, queued: inbox.length }));
  });
}

function serveFile(root, req, res) {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400).end(); return; }
  if (rel === "/") rel = "/index.html";
  const file = path.resolve(root, "." + rel);
  if (!file.startsWith(root + path.sep) || path.basename(file).startsWith(".")) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(buf);
  });
}

async function alreadyServing(root) {
  let port;
  try { port = Number(fs.readFileSync(serverFileOf(root), "utf8")); } catch { return 0; }
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/ping`);
    return (await r.text()) === root ? port : 0;
  } catch { return 0; }
}

async function cmdServe(dir, portArg) {
  if (!dir || !fs.existsSync(path.join(dir, "map-data.js"))) fail(dir ? "no map at " + dir : "no map to serve: run mm.mjs init \"<title>\" first, or pass mindmaps/<slug>");
  const root = path.resolve(dir);
  const running = await alreadyServing(root);
  if (running) { console.log(`already serving http://127.0.0.1:${running}/`); return; }
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/api/ping") { res.end(root); return; }
    if (req.method === "POST" && req.url === "/api/send") { receive(root, req, res); return; }
    if (req.method !== "GET") { res.writeHead(405).end(); return; }
    serveFile(root, req, res);
  });
  let port = Number(portArg) || 4178;
  server.on("error", (e) => {
    if (e.code !== "EADDRINUSE" || port > 4200) fail(e.message);
    server.listen(++port, "127.0.0.1");
  });
  server.on("listening", () => {
    fs.writeFileSync(serverFileOf(root), String(port), "utf8");
    console.log(`serving http://127.0.0.1:${port}/`);
  });
  server.listen(port, "127.0.0.1");
}

const [cmd, ...args] = process.argv.slice(2);
function currentDir() {
  try { return fs.readFileSync(path.join("mindmaps", ".current"), "utf8").trim(); } catch { return ""; }
}
if (cmd === "serve") cmdServe(args[0] || currentDir(), args[1]);
else fail("command: serve [dir] [port]   (waiting lives in mm.mjs: turn / wait)");
