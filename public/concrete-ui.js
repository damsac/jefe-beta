/* Wires every calculator page. Blank prices never become a dollar amount. */
(function () {
  "use strict";

  var root = document.querySelector("[data-calc]");
  var out = document.querySelector("[data-result]");
  var C = window.JefeCalc;
  if (!root || !out || !C) return;

  var kind = root.getAttribute("data-calc");

  function parseNum(raw) {
    if (raw == null) return null;
    var cleaned = String(raw).replace(/,/g, "").replace(/\$/g, "").trim();
    if (!cleaned) return null;
    var n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function field(name) {
    var el = root.querySelector("[name='" + name + "']");
    return el ? el.value : "";
  }

  function checked(name) {
    var el = root.querySelector("[name='" + name + "']:checked");
    return el ? el.value : "";
  }

  function length(name, unitName) {
    var n = parseNum(field(name));
    if (n == null) return null;
    return { value: n, unit: field(unitName) || "feet" };
  }

  function syncMode() {
    if (kind !== "area") return;
    var mode = checked("mode");
    var circle = mode === "circleArea" || mode === "cylinderVolume";
    var aText = root.querySelector("[data-label='a']");
    var aInput = root.querySelector("[name='a']");
    if (aText) aText.textContent = circle ? "Diameter" : "Length";
    if (aInput) aInput.setAttribute("aria-label", circle ? "Diameter" : "Length");
    var nodes = root.querySelectorAll("[data-for]");
    for (var i = 0; i < nodes.length; i++) {
      var ok = nodes[i].getAttribute("data-for").split(/\s+/).indexOf(mode) !== -1;
      nodes[i].hidden = !ok;
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function showEmpty() {
    out.className = "result is-empty";
    out.textContent = "";
    out.appendChild(el("p", null, kind === "pricing"
      ? "Enter at least one cost to see a bid."
      : "Fill in the measurements to see a result."));
  }

  function showError(message) {
    out.className = "result is-error";
    out.textContent = "";
    out.appendChild(el("p", null, message));
  }

  function stat(label, value) {
    var wrap = el("div");
    wrap.appendChild(el("b", null, label));
    wrap.appendChild(el("span", null, value));
    return wrap;
  }

  function showResult(headline, unit, stats, caption) {
    out.className = "result";
    out.textContent = "";
    var line = el("div", "result-line");
    line.appendChild(el("div", "result-num", headline));
    line.appendChild(el("div", "result-unit", unit));
    out.appendChild(line);
    if (stats.length) {
      var row = el("div", "stats");
      stats.forEach(function (s) { row.appendChild(stat(s[0], s[1])); });
      out.appendChild(row);
    }
    if (caption) out.appendChild(el("p", "caption", caption));
  }

  function wasteCaption(percent) {
    return percent > 0 ? "Includes " + C.display(percent, 1) + "% waste." : "No waste added.";
  }

  function moneyStat(cents) {
    return ["Material", cents == null ? "No price" : C.dollars(cents)];
  }

  function recalcArea() {
    syncMode();
    var mode = checked("mode");
    try {
      var result;
      if (mode === "rectangleArea") {
        var l = length("a", "aUnit");
        var w = length("b", "bUnit");
        if (!l || !w) return showEmpty();
        result = C.rectangleArea(l, w);
      } else if (mode === "circleArea") {
        var d = length("a", "aUnit");
        if (!d) return showEmpty();
        result = C.circleArea(d);
      } else if (mode === "rectangleVolume") {
        var l2 = length("a", "aUnit");
        var w2 = length("b", "bUnit");
        var dep = length("c", "cUnit");
        if (!l2 || !w2 || !dep) return showEmpty();
        result = C.rectangleVolume(l2, w2, dep);
      } else {
        var dia = length("a", "aUnit");
        var h = length("c", "cUnit");
        if (!dia || !h) return showEmpty();
        result = C.cylinderVolume(dia, h);
      }
      if (result.cubicYards != null) {
        showResult(C.display(result.cubicYards), "CU YD", [
          ["Cubic feet", C.display(result.cubicFeet)],
          ["Footprint", C.display(result.squareFeet) + " sq ft"],
        ], "");
      } else {
        showResult(C.display(result.squareFeet), "SQ FT", [], "");
      }
    } catch (e) {
      showError(e.message || "Check the measurements.");
    }
  }

  function recalcConcrete() {
    var l = length("length", "lengthUnit");
    var w = length("width", "widthUnit");
    var t = length("thickness", "thicknessUnit");
    if (!l || !w || !t) return showEmpty();
    var waste = parseNum(field("waste"));
    try {
      var r = C.concrete({
        length: l,
        width: w,
        thickness: t,
        wastePercent: waste == null ? 0 : waste,
        bag: Number(checked("bag") || 80),
        pricePerCubicYard: parseNum(field("price")),
      });
      showResult(C.display(r.cubicYardsWithWaste), "CU YD", [
        ["Bags", r.bags + " \u00d7 " + r.bag + " lb"],
        moneyStat(r.costCents),
      ], wasteCaption(waste == null ? 0 : waste));
    } catch (e) {
      showError(e.message || "Check the measurements.");
    }
  }

  function recalcLandscape() {
    var area = parseNum(field("area"));
    var depth = length("depth", "depthUnit");
    if (area == null || !depth) return showEmpty();
    var waste = parseNum(field("waste"));
    try {
      var r = C.landscape({
        material: root.getAttribute("data-material") || "mulch",
        areaSquareFeet: area,
        depth: depth,
        wastePercent: waste == null ? 0 : waste,
        pricePerCubicYard: parseNum(field("price")),
      });
      showResult(C.display(r.cubicYardsWithWaste), "CU YD", [
        ["Or bagged", r.bags + " \u00d7 2 cu ft"],
        moneyStat(r.costCents),
      ], wasteCaption(waste == null ? 0 : waste));
    } catch (e) {
      showError(e.message || "Check the measurements.");
    }
  }

  function recalcPricing() {
    var materials = parseNum(field("materials"));
    var labor = parseNum(field("labor"));
    var other = parseNum(field("other"));
    var percent = parseNum(field("percent"));
    if ((materials == null && labor == null && other == null) || percent == null) return showEmpty();
    var mode = checked("mode") || "markup";
    try {
      var r = C.pricing({
        materials: materials,
        labor: labor,
        other: other,
        mode: mode,
        percent: percent,
      });
      showResult(C.dollars(r.priceCents), "BID", [
        ["Cost", C.dollars(r.costCents)],
        ["Profit", C.dollars(r.profitCents)],
        ["Margin", C.display(r.marginPercent, 1) + "%"],
      ], mode === "markup"
        ? C.display(r.markupPercent, 1) + "% markup is a " + C.display(r.marginPercent, 1) + "% margin."
        : "A " + C.display(r.marginPercent, 1) + "% margin is a " + C.display(r.markupPercent, 1) + "% markup.");
    } catch (e) {
      showError(e.message || "Check the numbers.");
    }
  }

  function recalc() {
    if (kind === "area") recalcArea();
    else if (kind === "concrete") recalcConcrete();
    else if (kind === "landscape") recalcLandscape();
    else if (kind === "pricing") recalcPricing();
  }

  root.addEventListener("input", recalc);
  root.addEventListener("change", recalc);
  recalc();
})();
