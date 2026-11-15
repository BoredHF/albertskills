"use strict";
// Mind-map viewer, part 1: model, layout, physics, drawing. Part 2 is viewer-ui.js.
  var data = window.MIND_MAP;
  var GAP_X = 110, GAP_Y = 18, BRANCH_GAP = 120, BLOCK_PAD = 30;
  var $ = function (id) { return document.getElementById(id); };



  // ---------- helpers ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function svgPath(d, style, cls) {
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    if (cls) p.setAttribute("class", cls);
    Object.keys(style || {}).forEach(function (k) { p.style[k] = style[k]; });
    return p;
  }
  function button(cls, text, onClick, title) {
    var b = el("button", cls, text);
    if (title) b.title = title;
    b.addEventListener("click", onClick);
    return b;
  }
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: keep in memory */ } }
  };
  // little notes stacked in the bottom-right; Claude's updates stay up longer
  // Claude's notes fly into the bell when they go, and the bell gives one little bump
  function flyToBell(n) {
    var bell = $("btn-chat"), a = n.getBoundingClientRect(), b = bell.getBoundingClientRect();
    if (!n.animate) { n.remove(); return; }
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    n.animate([{ transform: "none", opacity: 1 }, { transform: "translate(" + dx + "px," + dy + "px) scale(.08)", opacity: 0 }],
      { duration: 650, easing: "cubic-bezier(.5,0,.75,0)" }).onfinish = function () {
      n.remove();
      bell.classList.remove("bump"); void bell.offsetWidth; bell.classList.add("bump");
      setTimeout(function () { bell.classList.remove("bump"); }, 650);
    };
  }
  function toast(msg, kind) {
    var stack = $("toast"), n = el("div", "note-pop" + (kind ? " " + kind : ""));
    if (kind === "claude") n.appendChild(el("span", "note-from", "Claude"));
    n.appendChild(el("span", null, msg));
    n.addEventListener("click", function () { n.remove(); });
    stack.appendChild(n);
    while (stack.children.length > 4) stack.firstChild.remove();
    setTimeout(function () {
      if (kind === "claude" && n.isConnected) { flyToBell(n); return; }
      n.classList.add("out"); setTimeout(function () { n.remove(); }, 300);
    }, kind === "claude" ? 7000 : 2600);
  }
  function isNA(v) { return typeof v === "string" && v.trim().toLowerCase() === "n/a"; }
  function uid(prefix) { return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  // ---------- pending additions (the user's edits, kept in the browser until Claude merges them) ----------
  var KEY = "mindmap:" + (data.slug || data.title || "map");
  var merged = {};
  (data.merged || []).forEach(function (id) { merged[id] = true; });
  var pending = loadPending();

  function loadPending() {
    var list;
    try { list = JSON.parse(store.get(KEY) || "[]"); } catch (e) { list = []; }
    if (!Array.isArray(list)) return [];
    return list.filter(function (p) { return p && p.id && !merged[p.id]; });
  }
  function savePending() { store.set(KEY, JSON.stringify(pending)); $("badge").textContent = pending.length || ""; }
  function addPending(item) {
    pending = pending.filter(function (p) { return p.id !== item.id; }).concat([item]);
    savePending(); rebuild();
  }
  function removePending(id) {
    pending = pending.filter(function (p) { return p.id !== id && p.target !== id; });
    savePending(); rebuild();
  }
  function voteOf(id) { return pending.filter(function (p) { return p.id === "v-" + id; })[0] || null; }
  function expandOf(id) { return pending.filter(function (p) { return p.id === "x-" + id; })[0] || null; }
  function notesOf(id) { return pending.filter(function (p) { return p.kind === "note" && p.target === id; }); }

  // ---------- tree model ----------
  var byId = {}, root = null, collapsed = {}, selectedId = null, boxes = {}, CANVAS = false;
  var INDENT = 40, CLUSTER_GAP = 320;
  var view = { x: 0, y: 0, k: 1 };

  function index(node, parent, depth) {
    byId[node.id] = node;
    node._parent = parent; node._depth = depth; node._lvl = depth - (CANVAS ? 1 : 0);
    if (node._lvl === 1) node._branch = parent.children.indexOf(node) + (CANVAS ? parent._parent.children.indexOf(parent) * 2 : 0);
    else node._branch = node._lvl < 1 ? -1 : parent._branch;
    node.children = node.children || [];
    node.children.forEach(function (c) { index(c, node, depth + 1); });
  }
  function build() {
    byId = {};
    CANVAS = !!data.canvas;
    root = JSON.parse(JSON.stringify(data.root));
    var localCores = pending.filter(function (p) { return p.kind === "core" && p.label; });
    // your own cores show up straight away; a single-core map becomes a canvas locally
    if (localCores.length && !CANVAS) { root = { id: "__canvas", label: data.title, children: [root] }; CANVAS = true; }
    localCores.forEach(function (p) {
      root.children.push({ id: p.id, label: p.label, status: "empty", children: [], _local: true });
    });
    index(root, null, 0);
    pending.filter(function (p) { return p.kind === "add"; }).forEach(function (p) {
      var parent = byId[p.target] || root;
      var n = { id: p.id, label: p.label, status: "empty", children: [], _local: true };
      parent.children.push(n);
      index(n, parent, parent._depth + 1);
    });
  }
  function kids(n) { return collapsed[n.id] ? [] : n.children; }
  function cores() { return CANVAS ? root.children : [root]; }
  function sections() { return cores().reduce(function (a, c) { return a.concat(c.children); }, []); }
  function isTitle(n) { return n._lvl === 1 && kids(n).length > 0; }
  function walk(n, fn) { fn(n); n.children.forEach(function (c) { walk(c, fn); }); }
  function leafCount(n) { var k = kids(n); return k.length ? k.reduce(function (s, c) { return s + leafCount(c); }, 0) : 1; }
  function pathOf(n) { var a = []; for (var p = n._parent; p; p = p._parent) a.unshift(p.label); return a.join("  ›  "); }
  function connectionsOf(id) {
    var out = {};
    (byId[id].connects || []).forEach(function (c) { out[c] = true; });
    walk(root, function (m) { if ((m.connects || []).indexOf(id) !== -1) out[m.id] = true; });
    delete out[id];
    return Object.keys(out).filter(function (k) { return byId[k]; });
  }

  // ---------- layout: core in the middle, branches split left and right ----------
  function splitSides(list) {
    if (list.length < 2) return { right: list, left: [] };
    // biggest first onto the lighter side, so both sides end up about the same height; keeps the original order per side
    var w = list.map(leafCount), side = {}, load = { right: 0, left: 0 };
    list.map(function (n, i) { return i; }).sort(function (a, b) { return w[b] - w[a]; }).forEach(function (i) {
      var s = load.right <= load.left ? "right" : "left";
      side[i] = s; load[s] += w[i];
    });
    return {
      right: list.filter(function (n, i) { return side[i] === "right"; }),
      left: list.filter(function (n, i) { return side[i] === "left"; })
    };
  }
  function layoutSide(list, dir, rootW) {
    if (!list.length) return;
    var maxW = [];
    list.forEach(function (b) { walkVisible(b, function (n) { maxW[n._lvl] = Math.max(maxW[n._lvl] || 0, boxes[n.id].w); }); });
    var col = [0, rootW / 2 + GAP_X * 1.5, rootW / 2 + GAP_X * 1.5 + INDENT];
    for (var d = 3; d < maxW.length; d++) col[d] = col[d - 1] + maxW[d - 1] + GAP_X;
    var cursor = 0, members = [];
    function place(n) {
      var b = boxes[n.id], ks = kids(n);
      members.push(b); b.side = dir;
      if (!ks.length) { b.cy = cursor + b.h / 2; cursor += b.h + GAP_Y; }
      else if (isTitle(n)) { var top = cursor; cursor += b.h + GAP_Y + 4; ks.forEach(place); b.cy = top + b.h / 2; }
      else { ks.forEach(place); b.cy = (boxes[ks[0].id].cy + boxes[ks[ks.length - 1].id].cy) / 2; }
      b.x = dir > 0 ? col[n._lvl] : -col[n._lvl] - b.w;
    }
    list.forEach(function (n) { place(n); cursor += BRANCH_GAP; });
    var shift = -(cursor - GAP_Y - BRANCH_GAP) / 2;
    members.forEach(function (b) { b.cy += shift; });
  }
  function layoutCluster(core) {
    var cb = boxes[core.id];
    cb.x = -cb.w / 2; cb.cy = 0; cb.side = 0;
    var sides = splitSides(kids(core));
    layoutSide(sides.right, 1, cb.w);
    layoutSide(sides.left, -1, cb.w);
  }
  function layoutClusters() {
    var cursor = 0;
    cores().forEach(function (core) {
      layoutCluster(core);
      var minX = Infinity, maxX = -Infinity;
      walkVisible(core, function (n) { var b = boxes[n.id]; minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x + b.w); });
      var dx = cursor - minX;
      walkVisible(core, function (n) { boxes[n.id].x += dx; });
      cursor += (maxX - minX) + CLUSTER_GAP;
    });
  }
  function walkVisible(n, fn) { fn(n); kids(n).forEach(function (c) { walkVisible(c, fn); }); }

  // ---------- rendering ----------
  function nodeEl(n) {
    var cls = n._lvl === 0 ? "root" : n._lvl === 1 ? (isTitle(n) ? "d1 title" : "d1") : "d2";
    var e = el("div", "node " + cls);
    if (n._lvl > 0) e.style.setProperty("--c", "var(--b" + (n._branch % 6) + ")");
    if (n.suggested) e.classList.add("suggested");
    if (n._local) e.classList.add("local");
    var vote = voteOf(n.id);
    if (vote) e.classList.add(vote.kind);
    if (n.id === selectedId) e.classList.add("selected");
    if (firstLoad) { e.classList.add("pop"); e.style.animationDelay = (Math.max(0, n._lvl) * 110) + "ms"; }
    if (popIds[n.id]) e.classList.add("pop", "fresh");
    if (pulseIds[n.id]) e.classList.add("pulse");
    if (data.working && data.working === n.id) e.classList.add("working");
    if (n._lvl > 0) e.appendChild(el("span", "dot " + (n.status || "empty")));
    e.appendChild(el("span", "label", n.label));
    if (n._local) e.appendChild(el("span", "tag you", "you"));
    else if (vote && vote.kind === "want") e.appendChild(el("span", "tag want", "✓ want"));
    var q = (n.open || []).length;
    if (q) { var qt = el("span", "tag", q + "?"); qt.title = q + (q === 1 ? " question" : " questions") + " from Claude \u2014 click to answer"; e.appendChild(qt); }
    var dc = (n.details || []).length + notesOf(n.id).length;
    if (dc) e.appendChild(el("span", "tag", "\u2261 " + dc));
    if (expandOf(n.id)) e.appendChild(el("span", "tag want", "\u2726"));
    if (n._lvl > 0 && n.children.length) {
      var t = button("toggle" + (collapsed[n.id] ? " closed" : ""), collapsed[n.id] ? "+" + n.children.length : "–", function (ev) {
        ev.stopPropagation();
        if (collapsed[n.id]) delete collapsed[n.id]; else collapsed[n.id] = true;
        render();
      }, collapsed[n.id] ? "Expand" : "Collapse");
      t.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); });
      e.appendChild(t);
    }
    e.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); if (ev.button === 0) startNodeDrag(ev, n.id, e); });
    e.addEventListener("pointermove", function (ev) { moveNodeDrag(ev, n.id); });
    e.addEventListener("pointerup", function () { endNodeDrag(n.id); });
    e.addEventListener("click", function (ev) { ev.stopPropagation(); });
    e.addEventListener("mouseenter", function () { showPeek(n, e); });
    e.addEventListener("mouseleave", hidePeek);
    e.addEventListener("contextmenu", function (ev) { openMenu(ev, n); });
    return e;
  }

  function render() {
    var layer = $("nodes"), svg = $("edges");
    layer.textContent = ""; svg.textContent = ""; boxes = {};
    walkVisible(root, function (n) {
      if (n._lvl < 0) return;   // a canvas map's hidden root
      var e = nodeEl(n); layer.appendChild(e);
      boxes[n.id] = { el: e, w: e.offsetWidth, h: e.offsetHeight, node: n };
    });
    layoutClusters();
    walkVisible(root, function (n) {
      var b = boxes[n.id];
      if (!b) return;
      if (b.side) b.el.classList.add(b.side > 0 ? "side-r" : "side-l");
      if (!pos[n.id]) {
        // new nodes grow out of their parent instead of popping in
        var from = n._parent && pos[n._parent.id], t = target(b);
        pos[n.id] = from ? { x: from.x, y: from.y, vx: 0, vy: 0 } : { x: t.x, y: t.y, vx: 0, vy: 0 };
      }
    });
    draw();
    kick();
    renderDock();
  }

  // ---------- physics: nodes spring toward their place; dragging pulls neighbours ----------
  var SPRING = 0.11, DAMP = 0.78, PULL = 0.3;
  var LAYOUT_KEY = KEY + ":layout";
  var pos = {}, offsets = loadOffsets(), drag = null, raf = null;

  function loadOffsets() {
    try { var o = JSON.parse(store.get(LAYOUT_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; }
  }
  function saveOffsets() { store.set(LAYOUT_KEY, JSON.stringify(offsets)); }
  function effOffset(n) {
    var x = 0, y = 0;
    for (var m = n; m; m = m._parent) { var o = offsets[m.id]; if (o) { x += o.x; y += o.y; } }
    return { x: x, y: y };
  }
  function target(b) {
    var o = effOffset(b.node), t = { x: b.x + o.x, y: b.cy + o.y };
    if (drag && drag.moved && drag.pull[b.node.id]) { t.x += drag.dx * PULL; t.y += drag.dy * PULL; }
    return t;
  }
  function step() {
    var moving = false;
    Object.keys(boxes).forEach(function (id) {
      var p = pos[id], t = target(boxes[id]);
      if (drag && drag.id === id) { p.x = t.x; p.y = t.y; p.vx = p.vy = 0; return; }
      p.vx = (p.vx + (t.x - p.x) * SPRING) * DAMP;
      p.vy = (p.vy + (t.y - p.y) * SPRING) * DAMP;
      p.x += p.vx; p.y += p.vy;
      if (Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(t.x - p.x) + Math.abs(t.y - p.y) > 0.15) moving = true;
      else { p.x = t.x; p.y = t.y; p.vx = p.vy = 0; }
    });
    draw();
    raf = (moving || drag) ? requestAnimationFrame(step) : null;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(step); }

  function neighbours(id) {
    var out = {}, n = byId[id];
    if (n._parent) out[n._parent.id] = true;
    connectionsOf(id).forEach(function (k) { out[k] = true; });
    walk(n, function (d) { delete out[d.id]; });   // its own branch already follows it
    return out;
  }
  function showPeek(n, e) {
    var details = (n.details || []).concat(notesOf(n.id).map(function (p) { return p.text; }));
    if (drag || (!n.summary && !details.length) || selectedId === n.id) return;
    var pk = $("peek");
    pk.textContent = "";
    pk.appendChild(el("strong", null, n.label));
    if (n.summary) pk.appendChild(el("p", null, n.summary));
    if (details.length) {
      var ul = el("ul");
      details.slice(0, 4).forEach(function (t) { ul.appendChild(el("li", null, t)); });
      if (details.length > 4) ul.appendChild(el("li", "muted", "+" + (details.length - 4) + " more"));
      pk.appendChild(ul);
    }
    var r = e.getBoundingClientRect();
    pk.hidden = false;
    var left = Math.min(window.innerWidth - 276, Math.max(16, r.left + r.width / 2 - 130));
    var top = r.top - pk.offsetHeight - 10;
    pk.style.left = left + "px";
    pk.style.top = (top < 12 ? r.bottom + 10 : top) + "px";
  }
  function hidePeek() { $("peek").hidden = true; }

  function startNodeDrag(ev, id, e) {
    hidePeek();
    var o = offsets[id] || { x: 0, y: 0 };
    drag = { id: id, sx: ev.clientX, sy: ev.clientY, ox: o.x, oy: o.y, dx: 0, dy: 0, moved: false, pull: neighbours(id), el: e };
    e.setPointerCapture(ev.pointerId);
  }
  function moveNodeDrag(ev, id) {
    if (!drag || drag.id !== id) return;
    var sx = ev.clientX - drag.sx, sy = ev.clientY - drag.sy;
    if (!drag.moved && Math.abs(sx) + Math.abs(sy) < 5) return;
    drag.moved = true; drag.el.classList.add("dragging");
    drag.dx = sx / view.k; drag.dy = sy / view.k;
    offsets[id] = { x: drag.ox + drag.dx, y: drag.oy + drag.dy };
    kick();
  }
  function endNodeDrag(id) {
    if (!drag || drag.id !== id) return;
    var wasMoved = drag.moved;
    drag.el.classList.remove("dragging");
    drag = null;
    if (wasMoved) { saveOffsets(); kick(); } else select(id);
  }
  function tidy() { offsets = {}; saveOffsets(); kick(); toast("Back to the tidy layout"); }

  // ---------- drawing from live positions ----------
  function cur(id) { var b = boxes[id], p = pos[id]; return { x: p.x, cy: p.y, w: b.w, h: b.h }; }

  // Only what's on screen (plus a margin) is drawn; the rest is skipped until you pan or zoom to it.
  var CULL_MARGIN = 700, vis = null, drawnK = 0;
  function visibleRect(margin) {
    var m = (margin === undefined ? CULL_MARGIN : margin) / view.k;
    return { x1: -view.x / view.k - m, y1: -view.y / view.k - m,
      x2: (window.innerWidth - view.x) / view.k + m, y2: (window.innerHeight - view.y) / view.k + m };
  }
  function onScreen(x1, y1, x2, y2) { return x2 >= vis.x1 && x1 <= vis.x2 && y2 >= vis.y1 && y1 <= vis.y2; }
  // panning inside the area already drawn costs nothing; only leaving it (or zooming a lot) redraws
  function needsRedraw() {
    if (!vis) return true;
    var r = visibleRect(0);
    return r.x1 < vis.x1 || r.y1 < vis.y1 || r.x2 > vis.x2 || r.y2 > vis.y2 || Math.abs(view.k / drawnK - 1) > 0.35;
  }
  function draw() {
    vis = visibleRect(); drawnK = view.k;
    Object.keys(boxes).forEach(function (id) {
      var b = boxes[id], p = pos[id], show = onScreen(p.x, p.y - b.h / 2, p.x + b.w, p.y + b.h / 2) || (drag && drag.id === id);
      if (show !== b.shown) { b.el.style.display = show ? "" : "none"; b.shown = show; }
      if (show) { b.el.style.left = p.x + "px"; b.el.style.top = (p.y - b.h / 2) + "px"; }
    });
    var svg = $("edges");
    svg.textContent = "";
    drawSections(svg);
    drawEdges(svg);
    if (selectedId && boxes[selectedId]) drawLinks(svg, selectedId);
  }
  var drawQueued = false;
  function drawSoon() {
    if (drawQueued || raf) return;   // a running animation frame draws anyway
    drawQueued = true;
    requestAnimationFrame(function () { drawQueued = false; draw(); });
  }

  // Each top-level section gets a soft tinted block around its whole branch.
  function drawSections(svg) {
    sections().forEach(function (sec) {
      if (!boxes[sec.id] || !kids(sec).length) return;
      var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity, t = cur(sec.id);
      walkVisible(sec, function (n) {
        if (n === sec) return;
        var b = cur(n.id);
        x1 = Math.min(x1, b.x); x2 = Math.max(x2, b.x + b.w);
        y1 = Math.min(y1, b.cy - b.h / 2); y2 = Math.max(y2, b.cy + b.h / 2);
      });
      x1 = Math.min(x1, t.x); x2 = Math.max(x2, t.x + t.w);
      y1 = Math.min(y1 - BLOCK_PAD, t.cy) + BLOCK_PAD;   // top edge runs through the title's middle
      if (!onScreen(x1 - BLOCK_PAD, y1 - BLOCK_PAD, x2 + BLOCK_PAD, y2 + BLOCK_PAD)) return;
      var c = "var(--b" + (sec._branch % 6) + ")";
      var r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", x1 - BLOCK_PAD); r.setAttribute("y", y1 - BLOCK_PAD);
      r.setAttribute("width", x2 - x1 + BLOCK_PAD * 2); r.setAttribute("height", y2 - y1 + BLOCK_PAD * 2);
      r.setAttribute("rx", 18);
      r.setAttribute("class", "block");
      r.style.fill = "color-mix(in srgb, " + c + " 3%, transparent)";
      r.style.stroke = "color-mix(in srgb, " + c + " 16%, transparent)";
      svg.appendChild(r);
    });
  }

  function drawEdges(svg) {
    walkVisible(root, function (n) {
      if (!boxes[n.id]) return;
      var pb = cur(n.id), title = isTitle(n);
      kids(n).forEach(function (c) {
        var cb = cur(c.id), dir = (cb.x + cb.w / 2) >= (pb.x + pb.w / 2) ? 1 : -1, d;
        if (!onScreen(Math.min(pb.x, cb.x), Math.min(pb.cy, cb.cy) - pb.h, Math.max(pb.x + pb.w, cb.x + cb.w), Math.max(pb.cy, cb.cy) + pb.h)) return;
        if (title) {
          var sx = dir > 0 ? pb.x + 18 : pb.x + pb.w - 18, sy = pb.cy + pb.h / 2, ex = dir > 0 ? cb.x : cb.x + cb.w;
          var r = Math.min(10, Math.abs(cb.cy - sy) / 2), turn = dir > 0 ? r : -r;
          d = "M" + sx + " " + sy + " L" + sx + " " + (cb.cy - r) + " Q" + sx + " " + cb.cy + " " + (sx + turn) + " " + cb.cy + " L" + ex + " " + cb.cy;
        } else {
          var x1 = dir > 0 ? pb.x + pb.w : pb.x, x2 = dir > 0 ? cb.x : cb.x + cb.w, mx = (x1 + x2) / 2;
          d = "M" + x1 + " " + pb.cy + " C" + mx + " " + pb.cy + " " + mx + " " + cb.cy + " " + x2 + " " + cb.cy;
        }
        svg.appendChild(svgPath(d, {
          stroke: "var(--b" + (c._branch % 6) + ")",
          strokeWidth: c._lvl === 1 ? "2.5" : "1.5",
          opacity: c._lvl === 1 ? ".75" : (c.suggested || c._local) ? ".22" : ".5"
        }));
      });
    });
  }

  function drawLinks(svg, id) {
    var a = cur(id);
    connectionsOf(id).forEach(function (k) {
      if (!boxes[k]) return;
      var b = cur(k);
      boxes[k].el.classList.add("linked");
      var x1 = a.x + a.w / 2, x2 = b.x + b.w / 2, top = Math.min(a.cy, b.cy) - 70;
      svg.appendChild(svgPath("M" + x1 + " " + a.cy + " Q" + (x1 + x2) / 2 + " " + top + " " + x2 + " " + b.cy, null, "link"));
    });
  }

  function stats() {
    var s = { done: 0, partial: 0, empty: 0, open: 0, total: 0 };
    walk(root, function (n) {
      if (n === root) return;
      s.total++; s[n.status || "empty"]++; s.open += (n.open || []).length;
    });
    s.pct = s.total ? Math.round(s.done / s.total * 100) : 0;
    return s;
  }

  function renderDock() {
    var s = stats();
    $("btn-overview").title = (data.title || "Mind Map") + " \u00b7 " + s.pct + "% done";
    $("ring-fill").setAttribute("stroke-dasharray", s.pct + " 100");
    $("badge").textContent = pending.length || "";
    if (typeof renderAskBadge === "function") renderAskBadge();
    var w = data.working, wn = w && byId[w];
    var label = !w ? "Send to Claude" : wn && wn !== root ? "Working on " + wn.label + "\u2026" : "Claude is thinking\u2026";
    $("btn-send").classList.toggle("working", !!w);
    $("btn-send").title = w ? label : "Send to Claude";
    $("dock-status").hidden = !w;
    $("dock-status").textContent = w ? label : "";
    document.title = data.title || "Mind Map";
  }

  function rebuild() {
    build(); render();
    var c = $("card");
    if (!c.hidden && c.dataset.mode) openCard(c.dataset.mode);
  }

  // ---------- pan & zoom ----------
  function applyView() {
    $("world").style.transform = "translate(" + view.x + "px," + view.y + "px) scale(" + view.k + ")";
    // zoomed out, section titles and cores grow so the overview stays readable
    var inv = Math.min(3.5, Math.max(1, 0.55 / view.k)).toFixed(1);   // coarse steps: no restyle on every wheel tick
    if (inv !== applyView.inv) { $("world").style.setProperty("--inv", inv); applyView.inv = inv; }
    if (Object.keys(boxes).length && needsRedraw()) drawSoon();
    var st = $("stage").style, big = 90 * view.k, small = 18 * view.k;
    st.backgroundSize = big + "px " + big + "px, " + small + "px " + small + "px";
    st.backgroundPosition = view.x + "px " + view.y + "px, " + view.x + "px " + view.y + "px";
  }
  function glideFit() {
    var st = $("stage");
    st.classList.add("glide"); fit();
    setTimeout(function () { st.classList.remove("glide"); }, 650);
  }
  var READABLE = 0.55;
  function focusOn(id, k) {
    var b = boxes[id];
    if (!b) return;
    var t = target(b);
    view.k = k;
    view.x = window.innerWidth / 2 - (t.x + b.w / 2) * k;
    view.y = (window.innerHeight - 90) / 2 - t.y * k;
    applyView();
  }
  // whole=true always shows everything; otherwise a map too big to read stays at a readable zoom on the core
  function fit(whole) {
    var ids = Object.keys(boxes);
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    ids.forEach(function (id) {
      var b = boxes[id], t = target(b);
      minX = Math.min(minX, t.x); maxX = Math.max(maxX, t.x + b.w);
      minY = Math.min(minY, t.y - b.h / 2); maxY = Math.max(maxY, t.y + b.h / 2);
    });
    var availW = window.innerWidth - 64, availH = window.innerHeight - 140;
    var k = Math.min(availW / (maxX - minX), availH / (maxY - minY), 1.15);
    if (whole !== true && k < READABLE) { focusOn(boxes[root.id] ? root.id : cores()[0].id, 0.7); return; }
    view.k = Math.max(0.12, k);
    view.x = (window.innerWidth - (maxX - minX) * view.k) / 2 - minX * view.k;
    view.y = 32 + (availH - (maxY - minY) * view.k) / 2 - minY * view.k;
    applyView();
  }
  function initPanZoom() {
    var stage = $("stage"), drag = null;
    stage.addEventListener("contextmenu", function (ev) { openMenu(ev, null); });
    stage.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0) return;
      drag = { x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y, moved: false };
      stage.setPointerCapture(ev.pointerId);
    });
    stage.addEventListener("pointermove", function (ev) {
      if (!drag) return;
      var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) { drag.moved = true; stage.classList.add("dragging"); }
      view.x = drag.vx + dx; view.y = drag.vy + dy; applyView();
    });
    stage.addEventListener("pointerup", function () {
      if (drag && !drag.moved && ["chat", "ask"].indexOf($("card").dataset.mode) === -1) closeCard();
      drag = null; stage.classList.remove("dragging");
    });
    stage.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      var k = Math.min(2.5, Math.max(0.2, view.k * Math.exp(-ev.deltaY * 0.0015)));
      view.x = ev.clientX - (ev.clientX - view.x) * (k / view.k);
      view.y = ev.clientY - (ev.clientY - view.y) * (k / view.k);
      view.k = k; applyView();
    }, { passive: false });
  }

