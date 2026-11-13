/* Node tests for public/calc.js. Expected values are the ones pinned in
   apps/ios/Tests/CalculatorTests.swift, worked by hand in the comments. */
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("./calc.js");

function ft(v) { return { value: v, unit: "feet" }; }
function inch(v) { return { value: v, unit: "inches" }; }

function close(actual, expected, accuracy) {
  assert.ok(Math.abs(actual - expected) <= accuracy, actual + " not within " + accuracy + " of " + expected);
}

test("unit conversions are exact", () => {
  assert.ok(Math.abs(C.FEET.inches * 12 - 1) < 1e-12);
  assert.ok(Math.abs(C.FEET.yards - 3) < 1e-12);
  assert.ok(Math.abs(C.feetOf({ value: 0.3048, unit: "meters" }) - 1) < 1e-12);
});

test("rectangle area", () => {
  assert.equal(C.rectangleArea(ft(12), ft(16)).squareFeet, 192);
});

test("circle area from diameter", () => {
  close(C.circleArea(ft(10)).squareFeet, 78.54, 0.01);
});

test("rectangle volume in cubic yards", () => {
  const v = C.rectangleVolume(ft(10), ft(10), inch(4));
  close(v.cubicFeet, 33.3333, 0.001);
  close(v.cubicYards, 1.2346, 0.0001);
});

test("cylinder volume", () => {
  const v = C.cylinderVolume(ft(1), ft(4));
  close(v.cubicFeet, Math.PI, 1e-9);
});

test("zero and negative dimensions are rejected", () => {
  assert.throws(() => C.rectangleArea(ft(0), ft(5)), (e) => e.code === "notPositive" && e.field === "Length");
  assert.throws(() => C.rectangleVolume(ft(5), ft(5), inch(-1)));
  assert.throws(() => C.circleArea(ft(NaN)));
});

test("very large inputs compute", () => {
  const v = C.rectangleVolume(ft(1e6), ft(1e6), ft(1e3));
  close(v.cubicFeet, 1e15, 1);
});

test("concrete 10x10x4in with 10% waste", () => {
  const r = C.concrete({
    length: ft(10), width: ft(10), thickness: inch(4),
    wastePercent: 10, bag: 80,
  });
  close(r.cubicFeetRaw, 33.3333, 0.001);
  close(r.cubicYardsRaw, 1.2346, 0.0001);
  assert.equal(C.rounded(r.cubicYardsWithWaste), 1.36);
  assert.equal(r.bags, 62);
  assert.equal(r.costCents, null);
});

test("concrete 20x20x6in with no waste", () => {
  const r = C.concrete({
    length: ft(20), width: ft(20), thickness: inch(6),
    wastePercent: 0, bag: 80,
  });
  close(r.cubicFeetRaw, 200, 1e-9);
  assert.equal(C.rounded(r.cubicYardsWithWaste), 7.41);
  assert.equal(r.bags, 334);
});

test("concrete bag sizes", () => {
  for (const [bag, expected] of [[40, 20], [60, 14], [80, 10]]) {
    const r = C.concrete({
      length: ft(3), width: ft(4), thickness: inch(6),
      wastePercent: 0, bag: bag,
    });
    assert.equal(r.bags, expected, String(bag));
  }
});

test("an exact bag count is not bumped by floating-point fuzz", () => {
  const r = C.concrete({
    length: ft(3), width: ft(4), thickness: inch(6),
    wastePercent: 0, bag: 80,
  });
  assert.equal(r.bags, 10);
});

test("concrete cost only with a price", () => {
  const base = {
    length: ft(10), width: ft(10), thickness: inch(4),
    wastePercent: 10, bag: 80,
  };
  assert.equal(C.concrete(Object.assign({ pricePerCubicYard: 150 }, base)).costCents, 20400);
  assert.equal(C.concrete(Object.assign({ pricePerCubicYard: 0 }, base)).costCents, null);
  assert.equal(C.concrete(base).costCents, null);
});

test("concrete rejects zero thickness and bad waste", () => {
  assert.throws(() => C.concrete({
    length: ft(10), width: ft(10), thickness: inch(0), wastePercent: 10, bag: 80,
  }));
  assert.throws(
    () => C.concrete({
      length: ft(10), width: ft(10), thickness: inch(4), wastePercent: 101, bag: 80,
    }),
    (e) => e.code === "wasteOutOfRange"
  );
});

test("mulch 500 sq ft at 3 inches", () => {
  const r = C.landscape({
    material: "mulch", areaSquareFeet: 500, depth: inch(3), wastePercent: 10,
  });
  close(r.cubicFeetRaw, 125, 1e-9);
  assert.equal(C.rounded(r.cubicYardsWithWaste), 5.09);
  assert.equal(r.bags, 69);
  assert.equal(r.costCents, null);
});

test("gravel 12x12 at 2 inches, no waste", () => {
  const r = C.landscape({
    material: "gravel", areaSquareFeet: 144, depth: inch(2), wastePercent: 0,
  });
  close(r.cubicFeetRaw, 24, 1e-9);
  close(r.cubicYardsWithWaste, 0.8889, 0.0001);
});

test("default depths are pinned", () => {
  assert.equal(C.assumptions.defaultDepthInches.mulch, 3);
  assert.equal(C.assumptions.defaultDepthInches.gravel, 2);
  assert.equal(C.assumptions.defaultDepthInches.topsoil, 6);
  assert.equal(C.assumptions.defaultDepthInches.sand, 2);
});

test("forty percent markup", () => {
  const r = C.pricing({ materials: 600, labor: 400, other: null, mode: "markup", percent: 40 });
  assert.equal(r.priceCents, 140000);
  assert.equal(r.profitCents, 40000);
  close(r.marginPercent, 28.571, 0.001);
  close(r.markupPercent, 40, 1e-9);
});

test("thirty percent target margin", () => {
  const r = C.pricing({ materials: 1000, labor: null, other: null, mode: "margin", percent: 30 });
  assert.equal(r.priceCents, 142857);
  close(r.markupPercent, 42.857, 0.001);
  assert.equal(r.profitCents, r.priceCents - r.costCents);
});

test("margin at or above 100 is rejected", () => {
  assert.throws(
    () => C.pricing({ materials: 1000, labor: null, other: null, mode: "margin", percent: 100 }),
    (e) => e.code === "marginOutOfRange"
  );
});

test("no cost is rejected rather than priced at zero", () => {
  for (const input of [
    { materials: null, labor: null, other: null, mode: "markup", percent: 40 },
    { materials: 0, labor: 0, other: 0, mode: "markup", percent: 40 },
  ]) {
    assert.throws(() => C.pricing(input), (e) => e.code === "noCost");
  }
});

test("display rounding is half up", () => {
  assert.equal(C.rounded(74.075), 74.08);
  assert.equal(C.display(1234.5), "1,234.5");
  assert.equal(C.display(5), "5");
});
