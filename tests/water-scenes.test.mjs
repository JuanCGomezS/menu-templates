import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function loadScene(name, exported) {
  const source = readFileSync(
    new URL(
      `../src/components/react/effects/${name}-scene.ts`,
      import.meta.url,
    ),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", compiled)(module.exports, module);
  return module.exports[exported];
}
const createRainScene = loadScene("rain", "createRainScene");
const createGlassScene = loadScene("glass", "createGlassScene");
function random() {
  let seed = 89;
  return () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}
function canvas() {
  const calls = [];
  const gradient = {
    addColorStop(offset) {
      assert.ok(offset >= 0 && offset <= 1);
    },
  };
  const ctx = new Proxy(
    {},
    {
      get(_target, name) {
        return (...args) => {
          for (const value of args)
            if (typeof value === "number")
              assert.ok(
                Number.isFinite(value),
                `${String(name)} received ${value}`,
              );
          if (name === "arc") assert.ok(args[2] >= 0);
          if (name === "ellipse") assert.ok(args[2] >= 0 && args[3] >= 0);
          calls.push([name, ...args]);
          return gradient;
        };
      },
    },
  );
  return { ctx, calls };
}
for (const [name, factory] of [
  ["rain", createRainScene],
  ["glass", createGlassScene],
]) {
  test(`${name} uses seconds, evolves and bounds elapsed time`, () => {
    const a = canvas();
    const draw = factory(375, 900, random());
    draw(a.ctx, 1 / 60, 0);
    const first = a.calls.slice();
    a.calls.length = 0;
    for (let frame = 1; frame <= 60; frame++) {
      a.calls.length = 0;
      draw(a.ctx, 1 / 60, frame / 60);
    }
    assert.notDeepEqual(a.calls, first);
    if (name === "glass") {
      const initial = first.find(([method]) => method === "translate");
      const moved = a.calls.find(([method]) => method === "translate");
      assert.ok(
        Math.abs(moved[2] - initial[2]) > 20,
        "A sliding drop must travel visibly within one second",
      );
    }
    const b = canvas(),
      c = canvas();
    factory(375, 900, random())(b.ctx, 500, 1);
    factory(375, 900, random())(c.ctx, 0.05, 1);
    assert.deepEqual(b.calls, c.calls);
  });
  test(`${name} remains finite and bounded over a two-minute simulation`, () => {
    for (const width of [375, 1440]) {
      const { ctx, calls } = canvas();
      const draw = factory(width, 900, random());
      for (let frame = 0; frame < 2400; frame++) {
        calls.length = 0;
        draw(ctx, 0.05, frame * 0.05);
        assert.equal(
          calls.filter(([method]) => method === "clearRect").length,
          1,
        );
        assert.ok(calls.length < 9000, `Unbounded draw work: ${calls.length}`);
        if (name === "glass")
          assert.ok(
            calls.filter(([method]) => method === "translate").length <=
              (width < 680 ? 90 : 150),
          );
      }
      draw(ctx, NaN, Infinity);
      draw(ctx, -1, 0);
    }
  });
}
