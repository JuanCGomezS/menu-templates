import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function loadModule(path) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", compiled)(module.exports, module);
  return module.exports;
}

const { getAllEffects, resolveEffect } = loadModule("../src/lib/effects.ts");
const { getStoreWithData } = loadModule("../src/lib/store-helpers.ts");
const { normalizeStoreContent } = loadModule("../src/lib/store-content.ts");

test("effects are independent, unique and sorted after the disabled default", () => {
  const effects = getAllEffects();
  assert.equal(effects.length, 7);
  assert.equal(effects[0].id, "effect-none");
  assert.deepEqual(
    effects.slice(1).map((effect) => effect.name),
    ["Cristal mojado", "Elástico", "Gel", "Lluvia", "Niebla", "Partículas"],
  );
  assert.equal(
    new Set(effects.map((effect) => effect.id)).size,
    effects.length,
  );
  effects.forEach((effect) =>
    assert.equal(resolveEffect(effect.id).id, effect.id),
  );
  effects.reverse();
  assert.equal(getAllEffects()[0].id, "effect-none");
});

test("old stores and invalid effect values fall back to no effect", () => {
  for (const value of [
    undefined,
    null,
    "",
    "unknown",
    "EFFECT-MIST",
    1,
    {},
    [],
    "__proto__",
  ]) {
    assert.equal(resolveEffect(value).id, "effect-none");
  }
});

test("public loading and content normalization preserve effects without changing content", () => {
  for (const { id: effectId } of getAllEffects()) {
    const store = getStoreWithData(
      {
        id: "test-store",
        effectId,
        templateId: "layout-minimal",
        themeId: "theme-candy",
      },
      [{ id: "category", name: "Category" }],
      [{ id: "item", categoryId: "category", name: "Product", price: 15 }],
      [],
    );
    const content = normalizeStoreContent(store);
    assert.equal(content.effectId, effectId);
    assert.equal(content.templateId, "layout-minimal");
    assert.equal(content.themeId, "theme-candy");
    assert.equal(content.items[0].name, "Product");
  }
});

function loadEditorFunctions() {
  const source = readFileSync(
    new URL("../src/components/react/StoreEditorPage.tsx", import.meta.url),
    "utf8",
  );
  const ast = ts.createSourceFile(
    "editor.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const names = [
    "createDefaultSchedule",
    "emptyForm",
    "formFromStore",
    "makeStorePayload",
  ];
  const declarations = ast.statements.filter(
    (node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text),
  );
  assert.equal(declarations.length, names.length);
  const compiled = ts.transpileModule(
    declarations.map((node) => node.getText(ast)).join("\n"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const templates = loadModule("../src/lib/templates.ts");
  const dependencies = {
    resolveEffect,
    resolveTemplate: templates.resolveTemplate,
    resolveStoreTheme: templates.resolveStoreTheme,
    normalizeSlug: (slug) => slug,
    toPositiveNumber: (value) => Number(value),
    serverTimestamp: () => "timestamp",
    dateInputInTimeZone: () => "2026-01-01",
    subscriptionEndDate: () => "2026-02-01",
    WEEK_DAYS: [
      ["monday", "Lunes"],
      ["tuesday", "Martes"],
    ],
  };
  return new Function(
    ...Object.keys(dependencies),
    `${compiled}\nreturn { emptyForm, formFromStore, makeStorePayload };`,
  )(...Object.values(dependencies));
}

test("editor payload carries the selected effect without coupling it to theme or template", () => {
  const { emptyForm, formFromStore, makeStorePayload } = loadEditorFunctions();
  assert.equal(emptyForm().effectId, "effect-none");
  assert.equal(formFromStore({ id: "legacy" }).effectId, "effect-none");
  assert.equal(
    formFromStore({ id: "unknown", effectId: "invalid" }).effectId,
    "effect-none",
  );
  for (const { id: effectId } of getAllEffects()) {
    const form = formFromStore({
      id: "store",
      name: "Store",
      slug: "store",
      effectId,
      templateId: "layout-minimal",
      themeId: "theme-candy",
    });
    assert.equal(form.effectId, effectId);
    const payload = makeStorePayload(form, false);
    assert.equal(payload.effectId, effectId);
    assert.equal(
      normalizeStoreContent(getStoreWithData(payload, [], [], [])).effectId,
      effectId,
    );
  }
});
