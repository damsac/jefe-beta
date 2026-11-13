/* Calculator math for the marketing site.
   The formulas, yields, and rounding match the iOS app
   (apps/ios/Sources/Tools/Calculators.swift): feet in, optional money,
   and a blank price is never $0. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.JefeCalc = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FEET = {
    feet: 1,
    inches: 1 / 12,
    yards: 3,
    meters: 1 / 0.3048,
  };

  const assumptions = {
    cubicFeetPerCubicYard: 27,
    bagYield: { 40: 0.3, 60: 0.45, 80: 0.6 },
    concreteDefaultWastePercent: 10,
    landscapeDefaultWastePercent: 10,
    measureDefaultWastePercent: 0,
    landscapeBagCubicFeet: 2,
    defaultDepthInches: { mulch: 3, gravel: 2, topsoil: 6, sand: 2 },
  };

  function CalcError(code, field) {
    const messages = {
      notPositive: field + " has to be more than zero.",
      wasteOutOfRange: "Waste has to be between 0 and 100%.",
      marginOutOfRange: "Margin has to be under 100%.",
      markupOutOfRange: "Markup can\u2019t be negative.",
      noCost: "Enter at least one cost.",
    };
    const err = new Error(messages[code] || code);
    err.code = code;
    err.field = field || null;
    return err;
  }

  function requirePositive(value, field) {
    if (!Number.isFinite(value) || value <= 0) throw CalcError("notPositive", field);
  }

  function requireWaste(percent) {
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw CalcError("wasteOutOfRange");
    }
  }

  function withWaste(raw, percent) {
    return raw * (1 + percent / 100);
  }

  function feetOf(length) {
    const per = FEET[length.unit];
    if (per == null) throw CalcError("notPositive", "Unit");
    return length.value * per;
  }

  /** Half up, then back through a decimal string so 74.075 is 74.08. */
  function rounded(value, places) {
    if (places == null) places = 2;
    if (!Number.isFinite(value)) return value;
    const neg = value < 0;
    const factor = 10 ** places;
    const scaled = Math.abs(value) * factor;
    const whole = Math.floor(scaled + 0.5 + 1e-10);
    const n = Number((whole / factor).toFixed(places));
    return neg ? -n : n;
  }

  function ceilCount(value) {
    return Math.ceil(value - 1e-9);
  }

  /** Cents for quantity at a unit price. A blank, zero, or bad price is null. */
  function costCents(quantity, unitPrice) {
    if (unitPrice == null || !Number.isFinite(unitPrice) || unitPrice <= 0) return null;
    return Math.round(quantity * unitPrice * 100);
  }

  function display(value, places) {
    if (places == null) places = 2;
    const r = rounded(value, places);
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: places,
      useGrouping: true,
    }).format(r);
  }

  function dollars(cents) {
    if (cents == null) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  }

  function rectangleArea(length, width) {
    requirePositive(length.value, "Length");
    requirePositive(width.value, "Width");
    return { squareFeet: feetOf(length) * feetOf(width), cubicFeet: null };
  }

  function circleArea(diameter) {
    requirePositive(diameter.value, "Diameter");
    const r = feetOf(diameter) / 2;
    return { squareFeet: Math.PI * r * r, cubicFeet: null };
  }

  function rectangleVolume(length, width, depth) {
    requirePositive(depth.value, "Depth");
    const base = rectangleArea(length, width);
    return { squareFeet: base.squareFeet, cubicFeet: base.squareFeet * feetOf(depth) };
  }

  function cylinderVolume(diameter, height) {
    requirePositive(height.value, "Height");
    const base = circleArea(diameter);
    return { squareFeet: base.squareFeet, cubicFeet: base.squareFeet * feetOf(height) };
  }

  function withYards(result) {
    return Object.assign({}, result, {
      cubicYards: result.cubicFeet == null ? null : result.cubicFeet / assumptions.cubicFeetPerCubicYard,
    });
  }

  function concrete(input) {
    requireWaste(input.wastePercent);
    requirePositive(input.thickness.value, "Thickness");
    const area = rectangleArea(input.length, input.width);
    const cf = area.squareFeet * feetOf(input.thickness);
    const cfWaste = withWaste(cf, input.wastePercent);
    const cyWaste = cfWaste / assumptions.cubicFeetPerCubicYard;
    const yieldCf = assumptions.bagYield[input.bag];
    if (yieldCf == null) throw CalcError("notPositive", "Bag");
    return {
      cubicFeetRaw: cf,
      cubicYardsRaw: cf / assumptions.cubicFeetPerCubicYard,
      cubicYardsWithWaste: cyWaste,
      bags: ceilCount(cfWaste / yieldCf),
      bag: input.bag,
      costCents: costCents(rounded(cyWaste), input.pricePerCubicYard),
    };
  }

  function landscape(input) {
    requireWaste(input.wastePercent);
    requirePositive(input.areaSquareFeet, "Area");
    requirePositive(input.depth.value, "Depth");
    const cf = input.areaSquareFeet * feetOf(input.depth);
    const cfWaste = withWaste(cf, input.wastePercent);
    const cy = cfWaste / assumptions.cubicFeetPerCubicYard;
    return {
      cubicFeetRaw: cf,
      cubicFeetWithWaste: cfWaste,
      cubicYardsWithWaste: cy,
      bags: ceilCount(cfWaste / assumptions.landscapeBagCubicFeet),
      costCents: costCents(rounded(cy), input.pricePerCubicYard),
    };
  }

  function pricing(input) {
    const parts = [input.materials, input.labor, input.other].filter((v) => v != null);
    if (!parts.every((v) => Number.isFinite(v) && v >= 0)) throw CalcError("noCost");
    const cost = parts.reduce((s, v) => s + v, 0);
    if (!(cost > 0)) throw CalcError("noCost");
    if (!Number.isFinite(input.percent)) throw CalcError("markupOutOfRange");

    let price;
    if (input.mode === "markup") {
      if (input.percent < 0) throw CalcError("markupOutOfRange");
      price = cost * (1 + input.percent / 100);
    } else if (input.mode === "margin") {
      if (input.percent < 0 || input.percent >= 100) throw CalcError("marginOutOfRange");
      price = cost / (1 - input.percent / 100);
    } else {
      throw CalcError("markupOutOfRange");
    }

    const costCents = Math.round(cost * 100);
    const priceCents = Math.round(price * 100);
    const profit = priceCents - costCents;
    return {
      costCents: costCents,
      priceCents: priceCents,
      profitCents: profit,
      marginPercent: priceCents === 0 ? 0 : (profit / priceCents) * 100,
      markupPercent: (profit / costCents) * 100,
    };
  }

  return {
    assumptions: assumptions,
    FEET: FEET,
    rounded: rounded,
    ceilCount: ceilCount,
    costCents: costCents,
    display: display,
    dollars: dollars,
    feetOf: feetOf,
    rectangleArea: function (length, width) { return withYards(rectangleArea(length, width)); },
    circleArea: function (diameter) { return withYards(circleArea(diameter)); },
    rectangleVolume: function (length, width, depth) { return withYards(rectangleVolume(length, width, depth)); },
    cylinderVolume: function (diameter, height) { return withYards(cylinderVolume(diameter, height)); },
    concrete: concrete,
    landscape: landscape,
    pricing: pricing,
  };
});
