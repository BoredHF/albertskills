"use strict";
// Mind-map viewer, part 2: cards, chat, questions, sending, dock, live updates, start-up.
  // ---------- info card ----------
  function select(id) { selectedId = id; render(); openCard("node"); }
  function closeCard() {
    $("card").hidden = true; $("card").dataset.mode = "";
    if (selectedId) { selectedId = null; render(); }
  }
  function openCard(mode) {
    var c = $("card");
    c.textContent = ""; c.dataset.mode = mode; c.hidden = false;
    c.appendChild(button("x", "✕", closeCard, "Close (Esc)"));
    var builders = { node: nodeCard, overview: overviewCard, log: logCard, send: sendCard, chat: chatCard, ideas: ideasCard, section: sectionCard, ask: askCard };
    builders[mode](c);
  }

  function nodeCard(c) {
    var n = byId[selectedId];
    if (!n) { closeCard(); return; }
    if (n._parent) c.appendChild(el("p", "crumb", pathOf(n)));
    var h = el("h2", null, n.label);
    if (n._lvl > 0) h.appendChild(el("span", "tag", n._local ? "added by you" : (n.status || "empty")));
    c.appendChild(h);
    if (n.suggested && !n._local) c.appendChild(voteBanner(n));
    if (n._local) c.appendChild(localBanner(n));
    if (n.summary) c.appendChild(el("p", null, n.summary));
    if (n._lvl === 0 && data.core) c.appendChild(el("p", null, data.core));
    if (n._lvl > 0 && !n._local) c.appendChild(lensGrid(n));
    connectionsSection(c, n);
    listSection(c, "In your words", n.quotes, function (q) { return el("blockquote", null, q); });
    openSection(c, n);
    detailsSection(c, n);
    if (!n._local) c.appendChild(expandAction(n));
    if (!n._local && n._lvl > 0 && n.children.length >= 3) c.appendChild(organizeAction(n));
    c.appendChild(composer(n));
  }

  function detailsSection(c, n) {
    var notes = notesOf(n.id), facts = n.details || [];
    if (!facts.length && !notes.length) return;
    c.appendChild(el("h3", null, "Details"));
    var ul = el("ul", "details");
    if (n._lvl > 0) ul.style.setProperty("--c", "var(--b" + (n._branch % 6) + ")");
    facts.forEach(function (t) { var li = el("li"); li.appendChild(el("span", null, t)); ul.appendChild(li); });
    notes.forEach(function (p) {
      var li = el("li", "mine");
      li.appendChild(el("span", null, p.text));
      li.appendChild(el("span", "tag you", "you \u00b7 not sent"));
      li.appendChild(button("rm", "\u2715", function () { removePending(p.id); }, "Remove"));
      ul.appendChild(li);
    });
    c.appendChild(ul);
  }
  function fillOf(id) { return pending.filter(function (p) { return p.id === "f-" + id; })[0] || null; }
  function expandAction(n) {
    var on = !!expandOf(n.id), filling = !!fillOf(n.id), row = el("div", "actions");
    row.appendChild(button("btn" + (on ? " on" : ""), on ? "✦ Expand requested" : "✦ Expand…", function () {
      expandDialog(n);
    }, "Claude adds new pieces under this"));
    row.appendChild(button("btn" + (filling ? " on" : ""), filling ? "✎ Fill requested" : "✎ Fill in details", function () {
      if (filling) removePending("f-" + n.id);
      else { addPending({ id: "f-" + n.id, kind: "fill", target: n.id }); toast("Claude will fill in the gaps when you send"); }
    }, "Claude fills in look, feel, what the player does and details from what you've already said"));
    row.appendChild(el("span", "muted", on || filling ? "Goes to Claude with your next Send." :
      "Expand adds new pieces. Fill writes in the missing details."));
    return row;
  }
  // Each open question can be answered right in the card; answers go out with Send.
  function openSection(c, n) {
    if (!(n.open || []).length) return;
    c.appendChild(el("h3", null, "Questions from Claude"));
    var ul = el("ul", "qa");
    n.open.forEach(function (q) {
      var li = el("li"), mine = pending.filter(function (p) { return p.kind === "answer" && p.target === n.id && p.q === q; })[0];
      li.appendChild(el("p", null, q));
      if (mine) {
        var row = el("div", "mine");
        row.appendChild(el("span", null, mine.text));
        row.appendChild(el("span", "tag you", "your answer"));
        row.appendChild(button("rm", "\u2715", function () { removePending(mine.id); }, "Remove"));
        li.appendChild(row);
      } else {
        var input = el("input");
        input.placeholder = "Type your answer and press Enter\u2026";
        input.addEventListener("keydown", function (ev) {
          if (ev.key !== "Enter" || !input.value.trim()) return;
          addPending({ id: uid("a"), kind: "answer", target: n.id, q: q, text: input.value.trim() });
          toast(LIVE ? "Answer added \u2014 press Send" : "Answer added");
        });
        li.appendChild(input);
      }
      ul.appendChild(li);
    });
    c.appendChild(ul);
  }
  function voteBanner(n) {
    var v = voteOf(n.id), b = el("div", "banner");
    b.appendChild(el("span", "grow", "This is Claude's idea. Do you want it?"));
    ["want", "skip"].forEach(function (kind) {
      var on = v && v.kind === kind;
      b.appendChild(button("btn" + (on ? " on" : ""), kind === "want" ? "✓ Want it" : "✕ Don't want", function () {
        if (on) removePending("v-" + n.id);
        else addPending({ id: "v-" + n.id, kind: kind, target: n.id });
      }));
    });
    return b;
  }
  function localBanner(n) {
    var b = el("div", "banner");
    b.appendChild(el("span", "grow", "You added this. It goes to Claude when you press Send."));
    b.appendChild(button("btn", "Remove", function () { selectedId = n._parent.id; removePending(n.id); }));
    return b;
  }
  function lensGrid(n) {
    var g = el("div", "lenses");
    [["How it looks", n.look], ["How it feels", n.feel], ["What's interactive", n.interactive]].forEach(function (pair) {
      var t = el("div", "lens" + (pair[1] && !isNA(pair[1]) ? "" : " unknown"));
      t.appendChild(el("b", null, pair[0]));
      t.appendChild(el("p", null, !pair[1] ? "Not answered yet" : isNA(pair[1]) ? "Doesn't apply" : pair[1]));
      g.appendChild(t);
    });
    return g;
  }
  function connectionsSection(c, n) {
    var links = connectionsOf(n.id);
    if (!links.length) return;
    c.appendChild(el("h3", null, "Connects to"));
    var chips = el("div", "chips");
    links.forEach(function (k) { chips.appendChild(button("chip", byId[k].label, function () { select(k); })); });
    c.appendChild(chips);
  }
  function listSection(c, title, items, make) {
    if (!(items || []).length) return;
    c.appendChild(el("h3", null, title));
    items.forEach(function (i) { c.appendChild(make(i)); });
  }
  function pendingRow(text, id) {
    var r = el("div", "row");
    r.appendChild(el("span", "grow", text));
    r.appendChild(button("rm", "✕", function () { removePending(id); }, "Remove"));
    return r;
  }
  function composer(n) {
    var wrap = el("div", "composer"), input = el("input");
    input.placeholder = "Add a detail\u2026 (or make it a new branch)";
    function add(kind) {
      var text = input.value.trim();
      if (!text) { input.focus(); return; }
      if (kind === "add") { delete collapsed[n.id]; addPending({ id: uid("u"), kind: "add", target: n.id, label: text }); }
      else addPending({ id: uid("n"), kind: "note", target: n.id, text: text });
      toast(kind === "add" ? "Branch added" : "Detail added");
      var again = document.querySelector(".composer input"); if (again) again.focus();
    }
    input.addEventListener("keydown", function (ev) { if (ev.key === "Enter") add("note"); });
    wrap.appendChild(input);
    wrap.appendChild(button("btn primary", "+ Detail", function () { add("note"); }, "Adds a detail inside this card (Enter)"));
    wrap.appendChild(button("btn", "+ Branch", function () { add("add"); }, "Makes it a new node under this one"));
    return wrap;
  }

  function overviewCard(c) {
    var s = stats(), a = data.agreed || {};
    c.appendChild(el("h2", null, data.title || "Mind Map"));
    if (data.core) c.appendChild(el("p", "muted", data.core));
    c.appendChild(button("btn", "Session log", function () { openCard("log"); }));
    var top = el("div", "banner");
    top.appendChild(el("span", "big", s.pct + "%"));
    top.appendChild(el("span", "grow", "complete · round " + (data.round || 0)));
    top.appendChild(el("span", "tag" + (a.agent ? " want" : ""), "Claude: " + (a.agent ? "✓ done" : "not yet")));
    top.appendChild(el("span", "tag" + (a.user ? " want" : ""), "You: " + (a.user ? "✓ done" : "not yet")));
    c.appendChild(top);
    var g = el("div", "stats");
    [["Done", s.done], ["Partial", s.partial], ["Empty", s.empty], ["Open questions", s.open]].forEach(function (p) {
      var t = el("div", "stat"); t.appendChild(el("strong", null, p[1])); t.appendChild(el("span", null, p[0])); g.appendChild(t);
    });
    c.appendChild(g);
    var u = understanding();
    c.appendChild(el("h3", null, "Details filled in\u00b7 " + u + "%"));
    var m = el("div", "meter"), fill = el("div"); fill.style.width = u + "%"; m.appendChild(fill); c.appendChild(m);
    c.appendChild(el("p", "muted", "Every card has 5 boxes: summary, look, feel, what the player does, and details. This is how many are filled in across the map. Open questions pull it down. Answer questions or press Fill in details to raise it; the fuller it is, the smarter Expand gets."));
    c.appendChild(expandAction(root));
    var weak = [];
    walk(root, function (n) { if (n !== root && n.status !== "done") weak.push(n); });
    weak.sort(function (x, y) { return score(y) - score(x); });
    if (weak.length) {
      c.appendChild(el("h3", null, "Needs the most attention"));
      weak.slice(0, 6).forEach(function (n) {
        var r = el("div", "row");
        r.appendChild(el("span", "dot " + (n.status || "empty")));
        r.appendChild(button("link-btn grow", n.label, function () { select(n.id); }));
        if ((n.open || []).length) r.appendChild(el("span", "tag", n.open.length + "?"));
        c.appendChild(r);
      });
    }
  }
  function understanding() {
    var have = 0, slots = 0;
    walk(root, function (n) {
      if (n === root || n._local) return;
      [n.summary, n.look, n.feel, n.interactive].forEach(function (v) { slots++; if (v) have++; });
      slots++; if ((n.details || []).length || (n.quotes || []).length) have++;
      have -= Math.min(1, (n.open || []).length * 0.5);
    });
    return slots ? Math.max(0, Math.round(have / slots * 100)) : 0;
  }
  function score(n) { return (n.status === "empty" || !n.status ? 3 : 1) + (n.open || []).length + (n._lvl === 1 ? 1 : 0); }

  function logCard(c) {
    c.appendChild(el("h2", null, "Session log"));
    var rounds = (data.log || []).slice().reverse();
    if (!rounds.length) { c.appendChild(el("p", "muted", "No rounds yet.")); return; }
    rounds.forEach(function (r) {
      var row = el("div", "row"), body = el("div", "grow");
      body.appendChild(el("strong", null, "Round " + r.round + (r.focus ? " · " + r.focus : "")));
      if (r.learned) body.appendChild(el("p", "muted", r.learned));
      row.appendChild(body); c.appendChild(row);
    });
  }

  function describe(p) {
    var t = byId[p.target], name = t ? "\"" + t.label + "\"" : p.target;
    if (p.kind === "add") return "ADD \"" + p.label + "\" under " + name;
    if (p.kind === "note") return "DETAIL on " + name + ": " + p.text;
    if (p.kind === "expand") return "EXPAND " + (t && t === root ? "the whole map" : name) + (p.label ? " (" + p.label + ")" : "") +
      (p.text ? ": " + p.text : " — Claude guesses");
    if (p.kind === "fill") return "FILL IN " + (t && t === root ? "the whole map" : name);
    if (p.kind === "want") return "WANT " + name;
    if (p.kind === "message") return "MESSAGE: " + p.text;
    if (p.kind === "core") return "NEW CORE \"" + p.label + "\"";
    if (p.kind === "organize") return "ORGANIZE " + (t && t === root ? "the whole map" : name);
    if (p.kind === "answer") return "ANSWER on " + name + " to \"" + p.q + "\": " + p.text;
    return "DON'T WANT " + name;
  }
  function message() {
    var lines = ["/mind-map " + (data.slug || data.title), "Changes from the map viewer (merge these and add their ids to merged):"];
    pending.forEach(function (p) { lines.push("- [" + p.id + "] " + describe(p)); });
    return lines.join("\n");
  }
  // ---------- live link: when served by serve.mjs, Send goes straight to Claude ----------
  var LIVE = location.protocol.indexOf("http") === 0;
  var SENT_KEY = KEY + ":sent";
  function loadSent() { try { return JSON.parse(store.get(SENT_KEY) || "{}") || {}; } catch (e) { return {}; } }
  function unsent() { var sent = loadSent(); return pending.filter(function (p) { return !sent[p.id]; }); }
  function sendLive(only) {
    var items = unsent().filter(only || function () { return true; });
    if (!items.length) { toast("Already sent \u2014 waiting for Claude"); return; }
    fetch("api/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items }) })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function () {
        var sent = loadSent();
        items.forEach(function (i) { sent[i.id] = true; });
        store.set(SENT_KEY, JSON.stringify(sent));
        if (!only) toast("Sent to Claude \u2713");
        var c = $("card"); if (!c.hidden && c.dataset.mode === "send") openCard("send");
      })
      .catch(function () { toast("Couldn't reach Claude \u2014 copy it instead"); openCard("send"); });
  }
  var COST = { add: 0, note: 0, want: 0, skip: 0, core: 0, answer: 110, message: 350, expand: 1100, fill: 700, organize: 1200 };
  function estimate(items) {
    if (!items.some(function (p) { return COST[p.kind] !== 0; })) return 0;
    return 600 + items.reduce(function (s, p) { return s + (COST[p.kind] || 100) + Math.ceil(((p.text || p.label || "").length) / 4); }, 0);
  }
  function fmtTokens(n) { return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n); }
  function liveSendCard(c) {
    var sent = loadSent();
    c.appendChild(el("p", "muted", "Connected to Claude. Press send and Claude picks these up by itself."));
    pending.forEach(function (p) {
      var r = pendingRow(describe(p), p.id);
      if (sent[p.id]) r.insertBefore(el("span", "tag want", "sent \u2713"), r.lastChild);
      c.appendChild(r);
    });
    var todo = unsent(), cost = estimate(todo);
    if (todo.length) {
      var est = el("div", "banner");
      est.appendChild(el("span", "big", "\u2248 " + fmtTokens(cost)));
      est.appendChild(el("span", "grow", "tokens, roughly. Each send has a fixed cost of about 600, so bundling more per send is cheaper."));
      c.appendChild(est);
    }
    var row = el("div", "composer");
    row.appendChild(button("btn primary", todo.length ? "Send " + todo.length + (todo.length === 1 ? " change" : " changes") + " \u00b7 \u2248 " + fmtTokens(cost) + " tokens"
      : "Waiting for Claude\u2026", function () { if (todo.length) { sendLive(); closeCard(); } }));
    if (todo.length) row.appendChild(button("btn", "Not yet", closeCard));
    c.appendChild(row);
  }

  // ---------- Claude's questions: one at a time, answered with a click ----------
  var askAt = 0, picks = {}, otherOpen = {};
  function answerOf(a) { return pending.filter(function (p) { return p.id === "a-" + a.id; })[0] || null; }
  function openAsks() { return (data.asks || []).filter(function (a) { return !merged["a-" + a.id] && !answerOf(a); }); }
  function askSig() { return (data.asks || []).map(function (a) { return a.id; }).join(","); }
  function renderAskBadge() {
    var n = openAsks().length, i = ideaList().length;
    $("btn-ask").classList.toggle("idle", !n);
    $("ask-badge").textContent = n || "";
    $("btn-ideas").classList.toggle("idle", !i);
    $("ideas-badge").textContent = i || "";
  }

  // ---------- new ideas: yes / no list; votes are applied by the script, so they cost no tokens ----------
  function ideaList() {
    var out = [];
    walk(root, function (n) { if (n.suggested && !n._local && !voteOf(n.id)) out.push(n); });
    return out;
  }
  function ideaSig() { return ideaList().map(function (n) { return n.id; }).join(","); }
  function isVote(p) { return p.kind === "want" || p.kind === "skip"; }
  function vote(ns, kind) {
    ns.forEach(function (n) { addPending({ id: "v-" + n.id, kind: kind, target: n.id }); });
    if (LIVE) sendLive(isVote);
    openCard(ideaList().length ? "ideas" : "ideas");
  }
  function ideaRow(n) {
    var row = el("div", "idea"), text = el("div", "grow");
    if (n._parent) text.appendChild(el("div", "crumb", n._parent.label));
    text.appendChild(el("div", "idea-label", n.label));
    if (n.summary) text.appendChild(el("div", "muted idea-sum", n.summary));
    row.appendChild(text);
    row.appendChild(button("vote no", "✕", function () { vote([n], "skip"); }, "No"));
    row.appendChild(button("vote yes", "✓", function () { vote([n], "want"); }, "Yes"));
    return row;
  }
  function ideasCard(c) {
    var list = ideaList();
    store.set(KEY + ":ideas", ideaSig());
    $("btn-ideas").classList.remove("ping");
    c.appendChild(el("h2", null, "New ideas"));
    if (!list.length) { c.appendChild(el("p", "muted", "All sorted ✓")); return; }
    c.appendChild(el("p", "muted", list.length + (list.length === 1 ? " idea" : " ideas") + " from Claude. Yes or no — free, no tokens."));
    var box = el("div", "ideas");
    list.forEach(function (n) { box.appendChild(ideaRow(n)); });
    c.appendChild(box);
    var foot = el("div", "sticky-foot");
    foot.appendChild(button("btn", "No to all", function () { vote(list, "skip"); }));
    foot.appendChild(button("btn primary", "Yes to all", function () { vote(list, "want"); }));
    c.appendChild(foot);
  }
  function optionsOf(a) {
    var opts = (a.options || []).slice();
    if (a.guess && opts.indexOf(a.guess) === -1) opts.unshift(a.guess);
    return opts;
  }
  function pickOf(a) {
    if (picks[a.id] !== undefined) return picks[a.id];
    return a.multi ? (a.guess ? [a.guess] : []) : (a.guess || "");
  }
  function hasPick(a) { var p = pickOf(a); return Array.isArray(p) ? p.length > 0 : !!String(p).trim(); }
  function choose(a, o, list) {
    if (a.multi) {
      var cur = pickOf(a).slice(), i = cur.indexOf(o);
      if (i === -1) cur.push(o); else cur.splice(i, 1);
      picks[a.id] = cur; openCard("ask"); return;
    }
    picks[a.id] = o; otherOpen[a.id] = false; openCard("ask");   // stays put: you move on with Next
  }
  function optButton(a, o, i, list) {
    var p = pickOf(a), sel = Array.isArray(p) ? p.indexOf(o) !== -1 : p === o;
    var b = el("button", "opt" + (sel ? " sel" : ""));
    b.appendChild(el("kbd", null, String(i + 1)));
    b.appendChild(el("span", "grow", o));
    if (o === a.guess) b.appendChild(el("span", "tag", "Claude's guess"));
    b.addEventListener("click", function () { choose(a, o, list); });
    return b;
  }
  function otherBox(a, list, opts) {
    var p = pickOf(a), custom = !Array.isArray(p) && p && opts.indexOf(p) === -1;
    if (!otherOpen[a.id] && !custom) {
      var b = el("button", "opt other");
      b.appendChild(el("kbd", null, "+"));
      b.appendChild(el("span", "grow", "Other…"));
      b.addEventListener("click", function () { otherOpen[a.id] = true; openCard("ask"); var i = document.querySelector(".opt-input"); if (i) i.focus(); });
      return b;
    }
    var input = el("input", "opt-input");
    input.placeholder = "Your own answer…";
    input.value = custom ? p : "";
    input.addEventListener("input", function () { picks[a.id] = input.value; });
    input.addEventListener("keydown", function (ev) { if (ev.key === "Enter" && input.value.trim()) { picks[a.id] = input.value.trim(); nextOrSend(list); } });
    return input;
  }
  function nextOrSend(list) {
    if (askAt < list.length - 1) { askAt++; openCard("ask"); } else sendPicks();
  }
  function sendPicks() {
    var items = openAsks().filter(hasPick).map(function (a) {
      var p = pickOf(a);
      return { id: "a-" + a.id, kind: "answer", target: a.node || "root", q: a.q, text: Array.isArray(p) ? p.join(", ") : String(p).trim() };
    });
    if (!items.length) { toast("Pick at least one answer"); return; }
    var ids = {};
    items.forEach(function (i) { ids[i.id] = true; });
    pending = pending.filter(function (p) { return !ids[p.id]; }).concat(items);
    savePending(); picks = {}; otherOpen = {}; askAt = 0; rebuild();
    toast("Answers added to Send \u2713");
    openCard("ask");
  }
  function askCard(c) {
    store.set(KEY + ":asks", askSig());
    $("btn-ask").classList.remove("ping");
    var list = openAsks();
    if (!list.length) {
      c.appendChild(el("h2", null, "All answered ✓"));
      c.appendChild(el("p", "muted", unsent().length ? "Your answers are waiting \u2014 press Send when you're ready."
        : "Claude will be back with more questions soon."));
      return;
    }
    if (askAt >= list.length) askAt = list.length - 1;
    var a = list[askAt], opts = optionsOf(a);
    var top = el("div", "ask-top"), dots = el("div", "dots");
    list.forEach(function (q, i) { dots.appendChild(el("i", i === askAt ? "on" : hasPick(q) ? "done" : "")); });
    top.appendChild(dots);
    top.appendChild(el("span", "muted", (askAt + 1) + " of " + list.length));
    if (a.node && a.node !== "root" && byId[a.node]) top.appendChild(button("chip", byId[a.node].label, function () { select(a.node); }));
    c.appendChild(top);
    c.appendChild(el("h2", "ask-q", a.q));
    if (a.multi) c.appendChild(el("p", "muted", "Pick as many as you like."));
    var box = el("div", "opts");
    opts.forEach(function (o, i) { box.appendChild(optButton(a, o, i, list)); });
    box.appendChild(otherBox(a, list, opts));
    c.appendChild(box);
    var foot = el("div", "ask-foot");
    if (askAt > 0) foot.appendChild(button("btn", "← Back", function () { askAt--; openCard("ask"); }));
    foot.appendChild(el("span", "grow"));
    if (askAt < list.length - 1) foot.appendChild(button("btn", "Skip", function () { askAt++; openCard("ask"); }));
    var last = askAt === list.length - 1, ready = list.filter(hasPick).length;
    var main = button("btn primary ask-next", last ? "Send answers (" + ready + ")" : "Next →", function () { nextOrSend(list); });
    foot.appendChild(main);
    c.appendChild(foot);
  }
  document.addEventListener("keydown", function (ev) {
    var c = $("card");
    if (c.hidden || c.dataset.mode !== "ask" || ev.target.tagName === "INPUT" || ev.target.tagName === "TEXTAREA") return;
    var n = parseInt(ev.key, 10), opts = c.querySelectorAll(".opt");
    if (n >= 1 && opts[n - 1]) opts[n - 1].click();
    if (ev.key === "Enter") { var b = c.querySelector(".ask-next"); if (b) b.click(); }
    if (ev.key === "ArrowLeft" && askAt > 0) { askAt--; openCard("ask"); }
    if (ev.key === "ArrowRight") { askAt++; openCard("ask"); }
  });

  // ---------- notifications: what Claude did, newest first ----------
  function ago(t) {
    var s = Math.max(0, (Date.now() - t) / 1000);
    return s < 60 ? "just now" : s < 3600 ? Math.round(s / 60) + "m ago" : s < 86400 ? Math.round(s / 3600) + "h ago" : Math.round(s / 86400) + "d ago";
  }
  function chatCard(c) {
    var seen = Number(store.get(KEY + ":seen") || 0), all = data.chat || [];
    $("chat-dot").hidden = true;
    $("btn-chat").classList.remove("ping");
    store.set(KEY + ":seen", String(all.length));
    c.appendChild(el("h2", null, "Notifications"));
    var list = el("div", "notes");
    all.map(function (m, i) { return { m: m, fresh: i >= seen }; }).reverse().slice(0, 30).forEach(function (x) {
      var row = el("div", "note" + (x.fresh ? " fresh" : ""));
      row.appendChild(el("span", "note-text", x.m.text));
      if (x.m.at) row.appendChild(el("span", "note-time", ago(x.m.at)));
      list.appendChild(row);
    });
    if (!list.childNodes.length) list.appendChild(el("p", "muted", "Nothing yet. Claude's updates show up here."));
    c.appendChild(list);
  }
  function checkReplies() {
    var seen = Number(store.get(KEY + ":seen") || 0), now = (data.chat || []).length, c = $("card");
    var asks = openAsks().length;
    if (asks && askSig() !== (store.get(KEY + ":asks") || "")) {
      if (!c.hidden && c.dataset.mode === "ask") openCard("ask");
      else { $("btn-ask").classList.add("ping"); toast(asks === 1 ? "Claude has a question" : "Claude has " + asks + " questions"); }
    }
    var ideas = ideaSig();
    if (ideas && ideas !== (store.get(KEY + ":ideas") || "")) {
      if (c.hidden) openCard("ideas"); else if (c.dataset.mode === "ideas") openCard("ideas"); else $("btn-ideas").classList.add("ping");
    }
    if (now <= seen) return;
    if (!c.hidden && c.dataset.mode === "chat") { openCard("chat"); return; }
    $("chat-dot").hidden = false;
    $("btn-chat").classList.add("ping");
    data.chat.slice(seen, now).forEach(function (m) { toast(m.text || "New notification", "claude"); });
  }

  // ---------- sections: the user's own blocks, extra cores, or Claude auto-sorting ----------
  function sectionCard(c) {
    c.appendChild(el("h2", null, "Sections"));
    c.appendChild(el("p", "muted", "Sections are the big blocks around a core idea. Make your own, or let Claude sort everything."));
    var chips = el("div", "chips");
    sections().forEach(function (s) { chips.appendChild(button("chip", s.label, function () { select(s.id); })); });
    if (sections().length) c.appendChild(chips);
    var wrap = el("div", "composer"), input = el("input"), pick = null;
    if (cores().length > 1) {
      pick = el("select");
      cores().forEach(function (k) { var o = el("option", null, k.label); o.value = k.id; pick.appendChild(o); });
      wrap.appendChild(pick);
    }
    input.placeholder = "New section name…";
    function add() {
      var text = input.value.trim();
      if (!text) { input.focus(); return; }
      addPending({ id: uid("u"), kind: "add", target: pick ? pick.value : cores()[0].id, label: text });
      toast("Section added"); openCard("section");
    }
    input.addEventListener("keydown", function (ev) { if (ev.key === "Enter") add(); });
    wrap.appendChild(input);
    wrap.appendChild(button("btn primary", "+ Add section", add));
    c.appendChild(wrap);
    c.appendChild(el("h3", null, "Core ideas"));
    c.appendChild(el("p", "muted", "Each core is its own centre with its own sections, side by side on one canvas."));
    var cwrap = el("div", "composer"), cinput = el("input");
    cinput.placeholder = "New core idea, e.g. Economy…";
    function addCore() {
      var text = cinput.value.trim();
      if (!text) { cinput.focus(); return; }
      var id = uid("u");
      addPending({ id: id, kind: "core", target: "root", label: text });
      toast("Core added — drag it anywhere and add to it"); select(id);
    }
    cinput.addEventListener("keydown", function (ev) { if (ev.key === "Enter") addCore(); });
    cwrap.appendChild(cinput);
    cwrap.appendChild(button("btn", "+ New core", addCore));
    c.appendChild(cwrap);
    c.appendChild(organizeAction(root));
  }
  function organizeOf(id) { return pending.filter(function (p) { return p.id === "o-" + id; })[0] || null; }
  function organizeAction(n) {
    var on = !!organizeOf(n.id), row = el("div", "actions");
    row.appendChild(button("btn" + (on ? " on" : ""), on ? "✦ Sort requested" : "✦ Auto-sort", function () {
      if (on) removePending("o-" + n.id);
      else { addPending({ id: "o-" + n.id, kind: "organize", target: n.id }); toast("Claude will sort this when you send"); }
    }, "Ask Claude to group these into sections"));
    row.appendChild(el("span", "muted", n._lvl <= 0 ? "Claude regroups the whole map into clear sections." :
      "Claude groups this branch's pieces into sub-sections."));
    return row;
  }

  // ---------- right-click menu ----------
  function closeMenu() { var m = document.getElementById("ctx"); if (m) m.remove(); }
  function menuItem(m, label, fn) {
    var b = el("button", null, label);
    b.addEventListener("click", function () { closeMenu(); fn(); });
    m.appendChild(b);
  }
  function menuAsk(m, label, placeholder, done) {
    var b = el("button", null, label);
    b.addEventListener("click", function () {
      var title = m.querySelector(".ctx-title"), input = el("input");
      m.textContent = "";
      if (title) m.appendChild(title);
      input.placeholder = placeholder;
      m.appendChild(input);
      input.focus();
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") closeMenu();
        if (ev.key === "Enter" && input.value.trim()) { var v = input.value.trim(); closeMenu(); done(v); }
      });
    });
    m.appendChild(b);
  }
  function toggle(id, item) { if (pending.some(function (p) { return p.id === id; })) removePending(id); else addPending(item); }
  function nodeMenu(m, n) {
    m.appendChild(el("div", "ctx-title", n.label));
    menuItem(m, "Open details", function () { select(n.id); });
    menuAsk(m, "+ Add detail…", "A detail for " + n.label, function (v) {
      addPending({ id: uid("n"), kind: "note", target: n.id, text: v }); toast("Detail added");
    });
    menuAsk(m, "+ Add branch…", "New branch under " + n.label, function (v) {
      delete collapsed[n.id]; addPending({ id: uid("u"), kind: "add", target: n.id, label: v }); toast("Branch added");
    });
    if (!n._local) {
      menuItem(m, expandOf(n.id) ? "✦ Edit expand…" : "✦ Expand…", function () { expandDialog(n); });
      menuItem(m, fillOf(n.id) ? "✎ Cancel fill" : "✎ Fill in details", function () {
        toggle("f-" + n.id, { id: "f-" + n.id, kind: "fill", target: n.id });
      });
      if (n.children.length >= 3) menuItem(m, organizeOf(n.id) ? "✦ Cancel auto-sort" : "✦ Auto-sort", function () {
        toggle("o-" + n.id, { id: "o-" + n.id, kind: "organize", target: n.id });
      });
    }
    if (n.suggested && !n._local) {
      m.appendChild(el("hr"));
      menuItem(m, "✓ Want it", function () { addPending({ id: "v-" + n.id, kind: "want", target: n.id }); });
      menuItem(m, "✕ Don't want", function () { addPending({ id: "v-" + n.id, kind: "skip", target: n.id }); });
    }
    m.appendChild(el("hr"));
    if (n.children.length) menuItem(m, collapsed[n.id] ? "Unfold branch" : "Fold branch", function () {
      if (collapsed[n.id]) delete collapsed[n.id]; else collapsed[n.id] = true;
      render();
    });
    if (offsets[n.id]) menuItem(m, "Put back in place", function () { delete offsets[n.id]; saveOffsets(); kick(); });
    if (n._local) menuItem(m, "Remove", function () { removePending(n.id); });
  }
  function canvasMenu(m) {
    m.appendChild(el("div", "ctx-title", data.title || "Map"));
    menuAsk(m, "+ New section…", "Section name", function (v) {
      addPending({ id: uid("u"), kind: "add", target: cores()[0].id, label: v }); toast("Section added");
    });
    menuAsk(m, "+ New core idea…", "Core idea, e.g. Economy", function (v) {
      var id = uid("u");
      addPending({ id: id, kind: "core", target: "root", label: v }); toast("Core added — drag it anywhere and add to it"); select(id);
    });
    menuItem(m, expandOf(root.id) ? "✦ Edit expand…" : "✦ Expand whole map…", function () {
      expandDialog(root);
    });
    m.appendChild(el("hr"));
    menuItem(m, "Fit to screen", fit);
    menuItem(m, "Tidy up", tidy);
  }
  function openMenu(ev, n) {
    ev.preventDefault(); ev.stopPropagation();
    closeMenu(); hidePeek();
    var m = el("div", "ctx");
    m.id = "ctx";
    if (n) nodeMenu(m, n); else canvasMenu(m);
    document.body.appendChild(m);
    m.style.left = Math.max(8, Math.min(ev.clientX, innerWidth - m.offsetWidth - 8)) + "px";
    m.style.top = Math.max(8, Math.min(ev.clientY, innerHeight - m.offsetHeight - 8)) + "px";
  }
  document.addEventListener("pointerdown", function (ev) { var m = document.getElementById("ctx"); if (m && !m.contains(ev.target)) closeMenu(); }, true);
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") closeMenu(); });
  window.addEventListener("wheel", closeMenu, { passive: true });

  function sendCard(c) {
    c.appendChild(el("h2", null, "Send to Claude"));
    if (!pending.length) {
      c.appendChild(el("p", "muted", "Nothing to send yet. Click any node to add ideas or notes, or tell Claude whether you want its suggested ideas."));
      return;
    }
    if (LIVE) { liveSendCard(c); return; }
    c.appendChild(el("p", "muted", "Copy this and paste it into Claude. These clear from here once Claude has added them to the map."));
    pending.forEach(function (p) { c.appendChild(pendingRow(describe(p), p.id)); });
    var ta = el("textarea"); ta.readOnly = true; ta.value = message(); c.appendChild(ta);
    var row = el("div", "composer");
    row.appendChild(button("btn primary", "Copy for Claude", function () { copy(ta); }));
    c.appendChild(row);
  }
  function copy(ta) {
    function fallback() { ta.select(); try { document.execCommand("copy"); toast("Copied"); } catch (e) { toast("Select the text and copy it"); } }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(function () { toast("Copied. Paste it into Claude"); }, fallback);
    } else fallback();
  }

  // ---------- dock ----------
  function initDock() {
    $("btn-fit").addEventListener("click", function () { fit(true); });
    $("btn-tidy").addEventListener("click", tidy);
    $("btn-fold").addEventListener("click", function () {
      if (Object.keys(collapsed).length) collapsed = {};
      else walk(root, function (n) { if (n._lvl >= 1 && n.children.length) collapsed[n.id] = true; });
      render(); fit();
    });
    $("btn-overview").addEventListener("click", function () { toggleCard("overview"); });
    $("btn-chat").addEventListener("click", function () { toggleCard("chat"); });
    $("btn-ask").addEventListener("click", function () { askAt = 0; toggleCard("ask"); });
    $("btn-section").addEventListener("click", function () { toggleCard("section"); });
    $("btn-send").addEventListener("click", function () { toggleCard("send"); });
    $("btn-ideas").addEventListener("click", function () { toggleCard("ideas"); });
    document.addEventListener("keydown", function (ev) {
      if (ev.target.tagName === "INPUT" || ev.target.tagName === "TEXTAREA") return;
      if (ev.key === "Escape") closeCard();
      if (ev.key === "f" || ev.key === "F") fit(true);
    });
    window.addEventListener("resize", fit);
  }
  function toggleCard(mode) {
    var c = $("card");
    if (!c.hidden && c.dataset.mode === mode) { closeCard(); return; }
    if (selectedId) { selectedId = null; render(); }
    openCard(mode);
  }

  // ---------- live updates: pick up Claude's edits to map-data.js without a refresh ----------
  var firstLoad = true, popIds = {}, pulseIds = {}, lastJson = JSON.stringify(data);
  function rawWalk(n, fn) { fn(n); (n.children || []).forEach(function (c) { rawWalk(c, fn); }); }
  function sig(n) {
    var c = {};
    Object.keys(n).forEach(function (k) { if (k !== "children") c[k] = n[k]; });
    return JSON.stringify(c);
  }
  function applyUpdate(next) {
    var old = {}, added = 0;
    rawWalk(data.root, function (n) { old[n.id] = sig(n); });
    data = next; lastJson = JSON.stringify(next);
    merged = {}; (data.merged || []).forEach(function (id) { merged[id] = true; });
    pending = pending.filter(function (p) { return !merged[p.id]; }); savePending();
    popIds = {}; pulseIds = {};
    rawWalk(data.root, function (n) {
      if (!(n.id in old)) { popIds[n.id] = true; added++; }
      else if (old[n.id] !== sig(n)) pulseIds[n.id] = true;
    });
    rebuild();
    checkReplies();
    if (added) { toast(added === 1 ? "1 new idea" : added + " new ideas"); glideFit(); }
    setTimeout(function () { popIds = {}; pulseIds = {}; }, 1500);
  }
  function poll() {
    if (document.hidden || drag) return;
    var s = document.createElement("script");
    s.src = "map-data.js?t=" + Date.now();
    s.onload = function () {
      s.remove();
      var next = window.MIND_MAP;
      if (next && next.root && JSON.stringify(next) !== lastJson) applyUpdate(next);
    };
    s.onerror = function () { s.remove(); };
    document.head.appendChild(s);
  }

  if (!data || !data.root) {
    document.body.appendChild(el("div", "empty-state", "No map data found. map-data.js should sit next to this file."));
    throw new Error("no map data");
  }
  initDock();
  build();
  render();
  fit();
  initPanZoom();
  setTimeout(function () { firstLoad = false; }, 100);
  setInterval(poll, 1500);
