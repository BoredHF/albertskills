"use strict";
// Mind-map viewer, part 3: the Expand dialog (what to grow, how much, or "just guess").

  var EXPAND_SIZES = [
    { key: "few", label: "A few", hint: "3–4" },
    { key: "plenty", label: "Plenty", hint: "5–8" },
    { key: "lots", label: "Lots", hint: "8–12, two levels deep" }
  ];
  var EXPAND_CHIPS = ["More features", "How it looks & feels", "What the player does", "Edge cases & problems",
    "Admin settings", "Links to other sections"];

  function closeExpand() { var m = document.getElementById("xmodal"); if (m) m.remove(); }

  function sizePicker(state) {
    var row = el("div", "xsizes");
    EXPAND_SIZES.forEach(function (s) {
      var b = button("xsize" + (state.size === s.key ? " on" : ""), "", function () {
        state.size = s.key;
        [].forEach.call(row.children, function (c) { c.classList.toggle("on", c === b); });
      });
      b.appendChild(el("strong", null, s.label));
      b.appendChild(el("span", null, s.hint));
      row.appendChild(b);
    });
    return row;
  }

  function chipRow(ta) {
    var row = el("div", "xchips");
    EXPAND_CHIPS.forEach(function (c) {
      row.appendChild(button("xchip", "+ " + c, function () {
        var cur = ta.value.trim();
        if (cur.toLowerCase().indexOf(c.toLowerCase()) !== -1) return;
        ta.value = cur ? cur.replace(/[.,;\s]+$/, "") + ", " + c.toLowerCase() : c;
        ta.focus();
      }));
    });
    return row;
  }

  function submitExpand(n, state, text) {
    var item = { id: "x-" + n.id, kind: "expand", target: n.id, label: state.size };
    if (text) item.text = text;
    addPending(item);
    closeExpand();
    toast(text ? "Expand added to Send ✓" : "Claude will guess what you want ✓");
  }

  function expandDialog(n) {
    closeExpand();
    var prev = expandOf(n.id), state = { size: (prev && prev.label) || "plenty" };
    var wrap = el("div", "xmodal"), box = el("div", "xbox");
    wrap.id = "xmodal";
    wrap.addEventListener("pointerdown", function (ev) { if (ev.target === wrap) closeExpand(); });
    box.appendChild(el("div", "crumb", n === root ? "Expand the whole map" : "Expand"));
    box.appendChild(el("h2", null, n.label));
    box.appendChild(el("label", "xq", "What do you want this to grow into?"));
    var ta = el("textarea");
    ta.placeholder = "e.g. more ways players can interact with it, or what happens when it goes wrong…";
    ta.value = (prev && prev.text) || "";
    box.appendChild(ta);
    box.appendChild(chipRow(ta));
    box.appendChild(el("label", "xq", "How much?"));
    box.appendChild(sizePicker(state));
    var foot = el("div", "xfoot");
    if (prev) foot.appendChild(button("btn", "Cancel expand", function () { removePending(prev.id); closeExpand(); }));
    foot.appendChild(el("span", "grow"));
    foot.appendChild(button("btn xguess", "✦ Just guess what I want", function () { submitExpand(n, state, ""); },
      "Claude decides from everything on the map"));
    foot.appendChild(button("btn primary", "Expand", function () { submitExpand(n, state, ta.value.trim()); }));
    box.appendChild(foot);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    ta.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) submitExpand(n, state, ta.value.trim());
    });
    ta.focus();
  }

  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") closeExpand(); });
