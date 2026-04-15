import test from "node:test";
import assert from "node:assert/strict";
import { parseOptionsJson, validateOptions } from "../src/lib/validate.js";

test("parseOptionsJson parses valid JSON", () => {
  const parsed = parseOptionsJson('{"step":2,"colors":["#ff0000","#000"]}');
  assert.equal(parsed.step, 2);
  assert.deepEqual(parsed.colors, ["#ff0000", "#000"]);
});

test("parseOptionsJson throws for malformed JSON", () => {
  assert.throws(
    () => parseOptionsJson("{bad-json}"),
    /Invalid --options JSON/
  );
});

test("validateOptions accepts a valid schema", () => {
  const result = validateOptions({ step: 1, colors: ["#abc", "#A1B2C3"] });
  assert.deepEqual(result, { step: 1, colors: ["#abc", "#A1B2C3"] });
});

test("validateOptions rejects invalid step", () => {
  assert.throws(
    () => validateOptions({ step: 0, colors: ["#abc"] }),
    /step must be an integer >= 1/
  );
});

test("validateOptions rejects invalid colors", () => {
  assert.throws(
    () => validateOptions({ step: 1, colors: ["red"] }),
    /must be a hex color/
  );
});
