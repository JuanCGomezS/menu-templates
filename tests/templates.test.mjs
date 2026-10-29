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

const templates = loadModule("../src/lib/templates.ts");
const newLayouts = [
  "layout-garden",
  "layout-chronicle",
  "layout-invitation",
  "layout-billboard",
  "layout-spotlight",
  "layout-ribbon",
];
const newThemes = [
  "theme-mexican",
  "theme-herb",
  "theme-charcoal",
  "theme-cacao",
  "theme-matcha",
];
const existingLayoutIds = [
  "layout-minimal",
  "layout-natural",
  "layout-warm",
  "layout-elegant",
  "layout-frutal",
  "layout-mascot",
  "layout-illustrated",
  "layout-brasa",
  "layout-confetti",
];
const existingThemeIds = [
  "theme-default",
  "theme-candy",
  "theme-christmas",
  "theme-mothers-day",
  "theme-halloween",
  "theme-valentine",
  "theme-fathers-day",
  "theme-easter",
  "theme-independence",
  "theme-velitas",
];

function luminance(color) {
  const channels = color
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(left, right) {
  const [lighter, darker] = [luminance(left), luminance(right)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

test("new layouts are registered with exact IDs and resolve to their own components", () => {
  for (const id of newLayouts) {
    const template = templates.getTemplateById(id);
    assert.ok(template, `${id} must be registered`);
    assert.equal(templates.resolveTemplate(id).id, id);
    assert.equal(templates.getTemplateComponent(id), template.component);
    assert.equal(template.component, id.replace("layout-", ""));
  }
});

test("existing IDs remain resolvable and generic layouts do not select a theme", () => {
  for (const id of existingLayoutIds) {
    assert.equal(templates.resolveTemplate(id).id, id);
  }
  for (const id of existingThemeIds) {
    assert.equal(templates.resolveTheme(id).id, id);
  }
  for (const layoutId of newLayouts) {
    assert.equal(templates.resolveStoreTheme(layoutId).id, "theme-default");
  }
});

test("Mexican and Independence themes resolve to their exact IDs", () => {
  assert.equal(templates.resolveTheme("theme-mexican").id, "theme-mexican");
  assert.equal(
    templates.resolveTheme("theme-independence").id,
    "theme-independence",
  );
  assert.notEqual(
    templates.resolveTheme("theme-mexican").id,
    templates.resolveTheme("theme-independence").id,
  );
  assert.equal(
    templates.resolveTemplate("layout-mexican").id,
    "layout-minimal",
  );
  assert.equal(
    templates.resolveStoreTheme("layout-garden", "theme-mexican").id,
    "theme-mexican",
  );
  assert.equal(
    templates.resolveTemplate("layout-garden theme-mexican").id,
    "layout-garden",
  );
});

test("every selectable theme has AA contrast on primary actions", () => {
  for (const theme of templates.getAllThemes()) {
    const { accent, onAccent } = theme.tokens;
    assert.ok(onAccent, `${theme.id} must specify onAccent`);
    assert.ok(
      contrast(accent, onAccent) >= 4.5,
      `${theme.id}: accent/onAccent`,
    );
  }
});

test("new theme tokens meet AA contrast for text and primary actions", () => {
  for (const id of newThemes) {
    const theme = templates.resolveTheme(id);
    assert.equal(theme.id, id);
    const { text, background, surface, accent, onAccent } = theme.tokens;
    assert.ok(contrast(text, background) >= 4.5, `${id}: text/background`);
    assert.ok(contrast(text, surface) >= 4.5, `${id}: text/surface`);
    assert.ok(onAccent, `${id} must specify onAccent`);
    assert.ok(contrast(accent, onAccent) >= 4.5, `${id}: accent/onAccent`);
  }
});
