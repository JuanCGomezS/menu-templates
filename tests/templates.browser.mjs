import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";
import { demoLabels } from "./fixtures/templates/demo-store.mjs";

const preview = process.argv.includes("--preview");
const captureOnly = process.argv.includes("--capture-only");
const capture = process.argv.includes("--capture") || captureOnly;
const chromePath = process.env.CHROME_PATH;
assert.ok(
  preview || chromePath,
  "Set CHROME_PATH to an installed Chromium executable.",
);
const root = process.cwd();
const profile = await mkdtemp(join(tmpdir(), "templates-browser-"));
const cssDirectory = join(root, "dist", "_astro");
const cssFiles = (await readdir(cssDirectory)).filter((name) =>
  name.endsWith(".css"),
);
assert.ok(
  cssFiles.length,
  "Build first so dist/_astro contains the template CSS.",
);
const builtCss = (
  await Promise.all(
    cssFiles.map((name) => readFile(join(cssDirectory, name), "utf8")),
  )
).join("\n");
const page = `<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Plantillas · datos demo</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/__templates.css"><style>@font-face{font-family:Archivo;src:url('/tests/fixtures/templates/fonts/archivo.woff2') format('woff2');font-weight:400 800;font-display:swap}@font-face{font-family:'Material Icons Outlined';src:url('/tests/fixtures/templates/fonts/material-icons-outlined.woff2') format('woff2');font-weight:400;font-display:swap}.material-icons-outlined{font-family:'Material Icons Outlined';font-weight:normal;font-style:normal;font-size:24px;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;font-feature-settings:'liga';-webkit-font-smoothing:antialiased}body{margin:0;font-family:Archivo,sans-serif}.is-capture .template-preview label{display:none}.is-capture .template-preview{padding:.5rem 1rem;font-size:12px}button,select{font:inherit}.template-preview{display:flex;position:relative;z-index:1200;flex-wrap:wrap;gap:.75rem;align-items:center;padding:1rem;background:#15211a;color:#fff;font:14px Archivo,system-ui,sans-serif}.template-preview select{max-width:15rem;padding:.45rem;color:#17252c}.template-preview label{display:flex;gap:.4rem;align-items:center}</style></head><body><nav class="template-preview" aria-label="Vista de prueba de plantillas"><strong>${demoLabels.previewLabel}</strong><label>Layout <select id="preview-layout"></select></label><label>Tema <select id="preview-theme"></select></label><label>Escenario <select id="preview-scenario"><option value="default">Normal</option><option value="soldout">Agotado</option><option value="no-order">Sin pedidos</option><option value="unavailable">No disponible en mesa</option><option value="closed">Cerrado</option><option value="no-photos">Sin fotos</option><option value="empty">Vacío</option><option value="empty-category">Categoría vacía</option><option value="long-names">Nombres largos</option><option value="product_store">Tienda de productos</option></select></label></nav><div id="app"></div><script type="module">import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {PublicStoreTemplateView} from '/src/components/react/RestaurantMenuView.tsx';import {getAllTemplates,getAllThemes} from '/src/lib/templates.ts';import {createDemoStore} from '/tests/fixtures/templates/demo-store.mjs';const root=createRoot(document.getElementById('app'));const allLayouts=getAllTemplates();const matrixComponents=['garden','chronicle','invitation','billboard','spotlight','ribbon'];const matrixLayouts=allLayouts.filter(template=>matrixComponents.includes(template.component));const themes=getAllThemes();const layoutSelect=document.getElementById('preview-layout');const themeSelect=document.getElementById('preview-theme');const scenarioSelect=document.getElementById('preview-scenario');for(const template of allLayouts){const option=document.createElement('option');option.value=template.id;option.textContent=template.name;layoutSelect.append(option)}for(const theme of themes){const option=document.createElement('option');option.value=theme.id;option.textContent=theme.name;themeSelect.append(option)}const afterPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const waitForImages=async()=>{const images=[...document.images];await Promise.all(images.map(async image=>{image.loading='eager';if(!image.complete)await new Promise(resolve=>{image.onload=image.onerror=resolve});if(image.decode)await image.decode().catch(()=>{})}))};window.templateRegistry={layouts:allLayouts.map(template=>template.id),matrixLayouts:matrixLayouts.map(template=>template.id),themes:themes.map(theme=>theme.id)};window.showTemplate=async(layout='layout-garden',theme='theme-herb',scenario='default')=>{layoutSelect.value=layout;themeSelect.value=theme;scenarioSelect.value=scenario;flushSync(()=>root.render(React.createElement(PublicStoreTemplateView,{key:layout+':'+theme+':'+scenario,store:createDemoStore({layout,theme,scenario})})));await document.fonts.ready;await waitForImages();await afterPaint();return true};document.querySelector('.template-preview').addEventListener('change',()=>{void window.showTemplate(layoutSelect.value,themeSelect.value,scenarioSelect.value)});const params=new URLSearchParams(location.search);const initialLayout=allLayouts.some(template=>template.id===params.get('layout'))?params.get('layout'):'layout-garden';const initialTheme=themes.some(theme=>theme.id===params.get('theme'))?params.get('theme'):'theme-herb';const initialScenario=[...scenarioSelect.options].some(option=>option.value===params.get('scenario'))?params.get('scenario'):'default';window.showTemplate(initialLayout,initialTheme,initialScenario).then(()=>{window.ready=true});</script></body></html>`;

const server = await createServer({
  configFile: false,
  root,
  cacheDir: join(profile, "vite-cache"),
  esbuild: { jsx: "automatic" },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "firebase/firestore",
      "firebase/functions",
      "leaflet",
    ],
    noDiscovery: true,
  },
  server: { host: "127.0.0.1", port: preview ? 4177 : 0, strictPort: true },
  logLevel: "error",
  plugins: [
    {
      name: "templates-browser-fixture",
      enforce: "pre",
      resolveId(id) {
        if (id.endsWith("/lib/firebase") || id === "./firebase")
          return "\0templates-test-firebase";
      },
      load(id) {
        if (id === "\0templates-test-firebase")
          return 'export const app = null, db = null, auth = null, storage = null, vapidKey = "";';
      },
      configureServer(devServer) {
        devServer.middlewares.use((req, res, next) => {
          const pathname = new URL(req.url, "http://localhost").pathname;
          if (pathname === "/__templates.css") {
            res.setHeader("Content-Type", "text/css");
            res.end(builtCss);
            return;
          }
          if (pathname !== "/__templates") return next();
          devServer
            .transformIndexHtml(req.url, page)
            .then((html) => {
              res.setHeader("Content-Type", "text/html");
              res.end(html);
            })
            .catch(next);
        });
      },
    },
  ],
});

let chrome;
let socket;
try {
  await server.listen();
  const port = server.httpServer.address().port;
  if (preview) {
    console.log(`Templates preview: http://localhost:${port}/__templates`);
    await new Promise((resolve) => {
      process.once("SIGINT", resolve);
      process.once("SIGTERM", resolve);
    });
  } else {
    chrome = spawn(
      chromePath,
      [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--remote-debugging-port=0",
        `--user-data-dir=${profile}`,
        "about:blank",
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    const endpoint = await new Promise((resolve, reject) => {
      let stderr = "";
      const timer = setTimeout(
        () => reject(new Error("Chromium startup timed out")),
        15000,
      );
      chrome.once("error", reject);
      chrome.stderr.on("data", (chunk) => {
        stderr += chunk;
        const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve) =>
      socket.addEventListener("open", resolve, { once: true }),
    );
    let nextId = 0;
    const pending = new Map();
    const exceptions = [];
    const networkWrites = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown")
        exceptions.push(
          message.params.exceptionDetails.exception?.description ??
            message.params.exceptionDetails.text,
        );
      if (
        message.method === "Network.requestWillBeSent" &&
        !["GET", "HEAD", "OPTIONS"].includes(message.params.request.method)
      )
        networkWrites.push({
          method: message.params.request.method,
          url: message.params.request.url,
        });
      if (!message.id) return;
      const callback = pending.get(message.id);
      if (!callback) return;
      pending.delete(message.id);
      clearTimeout(callback.timer);
      if (message.error)
        callback.reject(new Error(JSON.stringify(message.error)));
      else callback.resolve(message.result);
    });
    const send = (method, params = {}, sessionId) =>
      new Promise((resolve, reject) => {
        const id = ++nextId;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP timed out: ${method}`));
        }, 15000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params, sessionId }));
      });
    const { targetId } = await send("Target.createTarget", {
      url: "about:blank",
    });
    const { sessionId } = await send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    const command = (method, params) => send(method, params, sessionId);
    const evaluate = async (expression) => {
      const result = await command("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (result.exceptionDetails)
        throw new Error(
          `${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}; browser errors: ${exceptions.join("; ")}`,
        );
      return result.result.value;
    };
    const waitFor = (expression) =>
      evaluate(
        `new Promise((resolve,reject)=>{let attempts=0;const check=()=>{if(${expression})resolve(true);else if(attempts++>150)reject(new Error('Timed out: '+${JSON.stringify(expression)}));else setTimeout(check,40)};check()})`,
      );
    const click = async (expression) => {
      const point = await evaluate(
        `(async()=>{const element=${expression};element.scrollIntoView({block:'center'});await new Promise(requestAnimationFrame);const box=element.getBoundingClientRect();const x=box.left+box.width/2,y=box.top+box.height/2;return{x,y,reachable:element.contains(document.elementFromPoint(x,y))}})()`,
      );
      assert.ok(point.reachable, "Controls must remain above template content");
      await command("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: point.x,
        y: point.y,
        button: "left",
        clickCount: 1,
      });
      await command("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: point.x,
        y: point.y,
        button: "left",
        clickCount: 1,
      });
    };
    await command("Runtime.enable");
    await command("Page.enable");
    await command("Network.enable");
    await command("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    const loaded = new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Page load timed out")),
        15000,
      );
      const onMessage = (event) => {
        const message = JSON.parse(event.data);
        if (
          message.method === "Page.loadEventFired" &&
          message.sessionId === sessionId
        ) {
          clearTimeout(timer);
          socket.removeEventListener("message", onMessage);
          resolve();
        }
      };
      socket.addEventListener("message", onMessage);
    });
    await command("Page.navigate", {
      url: `http://127.0.0.1:${port}/__templates`,
    });
    await loaded;
    await waitFor("window.ready && document.querySelector('.store-atelier')");
    const registry = await evaluate("window.templateRegistry");
    assert.deepEqual(
      [...registry.matrixLayouts].sort(),
      [
        "layout-garden",
        "layout-chronicle",
        "layout-invitation",
        "layout-billboard",
        "layout-spotlight",
        "layout-ribbon",
      ].sort(),
    );
    assert.equal(
      registry.themes.length,
      15,
      "the visual matrix must cover all fifteen themes",
    );
    assert.ok(
      registry.layouts.length > registry.matrixLayouts.length,
      "preview must expose every registered layout",
    );
    assert.equal(
      await evaluate(
        "getComputedStyle(document.querySelector('.template-preview')).position",
      ),
      "relative",
    );
    assert.equal(
      await evaluate(
        "document.querySelector('.template-preview strong').textContent",
      ),
      demoLabels.previewLabel,
    );
    const dimensions = [
      [375, 900],
      [1440, 1000],
    ];
    const inspect = async (layout, theme, scenario, width, height) => {
      await command("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width <= 375,
      });
      await evaluate(
        `window.showTemplate(${JSON.stringify(layout)},${JSON.stringify(theme)},${JSON.stringify(scenario)})`,
      );
      return evaluate(
        `(()=>{const root=document.querySelector('.store-atelier');const text=root.textContent;const anchors=[...root.querySelectorAll('a')].map(anchor=>({text:anchor.textContent.trim(),href:anchor.getAttribute('href')}));const foreground='rgb('+getComputedStyle(root).getPropertyValue('--store-on-accent').trim().slice(1).match(/../g).map(value=>parseInt(value,16)).join(', ')+')';const primaryActions=[...root.querySelectorAll('.billboard-action,.spotlight-intro>a,.ribbon-top>a,.garden-category .atelier-purchase button,.chronicle-product .atelier-purchase button,.invitation-category .atelier-purchase button')];return {primaryForegrounds:primaryActions.every(action=>getComputedStyle(action).color===foreground),h1Count:root.querySelectorAll('h1').length,longPrice:root.querySelector('.atelier-price')?.textContent==='$ '+(1234567).toLocaleString(),theme:root.dataset.theme,overflow:document.documentElement.scrollWidth<=innerWidth,text,anchors,buttons:[...root.querySelectorAll('button')].map(button=>({text:button.textContent,aria:button.getAttribute('aria-label')})),photos:root.querySelectorAll('img').length,decorations:[...root.querySelectorAll('.atelier-decoration')].map(node=>node.className),catalogLabel:root.querySelector('#atelier-catalog')?.getAttribute('aria-label')}})()`,
      );
    };
    if (!captureOnly) {
      for (const [width, height] of dimensions) {
        for (const layout of registry.matrixLayouts)
          for (const theme of registry.themes) {
            const result = await inspect(
              layout,
              theme,
              "default",
              width,
              height,
            );
            assert.equal(
              result.h1Count,
              1,
              `${layout} must have one page heading`,
            );
            assert.equal(
              result.primaryForegrounds,
              true,
              `${layout} + ${theme} must render the accessible on-accent foreground`,
            );
            assert.equal(
              result.overflow,
              true,
              `${layout} + ${theme} must not overflow at ${width}px`,
            );
            assert.ok(
              demoLabels.categories.every((label) =>
                result.text.includes(label),
              ),
              `${layout} + ${theme} categories`,
            );
            assert.ok(
              demoLabels.products.every((label) => result.text.includes(label)),
              `${layout} + ${theme} products`,
            );
            assert.ok(
              result.anchors.length > 0 &&
                result.anchors.every((anchor) => anchor.text && anchor.href),
              `${layout} + ${theme} anchors`,
            );
            if (theme === "theme-mexican")
              assert.deepEqual(result.decorations, [
                "atelier-decoration atelier-decoration--mexican",
              ]);
            else if (theme === "theme-christmas")
              assert.deepEqual(result.decorations, [
                "atelier-decoration atelier-decoration--christmas",
              ]);
            else assert.deepEqual(result.decorations, []);
          }
      }
      const legacyLayouts = registry.layouts.filter(
        (layout) => !registry.matrixLayouts.includes(layout),
      );
      for (const [width, height] of dimensions) {
        await command("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: width === 375,
        });
        for (const layout of legacyLayouts)
          for (const theme of [
            "theme-candy",
            "theme-mothers-day",
            "theme-valentine",
            "theme-easter",
          ]) {
            await evaluate(
              `window.showTemplate(${JSON.stringify(layout)},${JSON.stringify(theme)},'default')`,
            );
            const legacy = await evaluate(
              `(()=>{const main=document.querySelector('main');return {headings:main?.querySelectorAll('h1').length,text:main?.textContent,overflow:document.documentElement.scrollWidth>innerWidth}})()`,
            );
            assert.equal(
              legacy.headings,
              1,
              `${layout} + ${theme} legacy heading`,
            );
            assert.ok(
              demoLabels.products.every((product) =>
                legacy.text.includes(product),
              ),
              `${layout} + ${theme} preserves legacy products`,
            );
            assert.equal(
              legacy.overflow,
              false,
              `${layout} + ${theme} legacy overflow at ${width}px`,
            );
          }
      }
      console.log(
        `PASS ${legacyLayouts.length} legacy layouts × 4 adjusted themes at both viewports`,
      );
      for (const [width, height] of dimensions)
        for (const layout of registry.matrixLayouts)
          for (const scenario of [
            "soldout",
            "no-order",
            "closed",
            "no-photos",
            "empty",
            "empty-category",
            "long-names",
            "product_store",
          ]) {
            const state = await inspect(
              layout,
              "theme-herb",
              scenario,
              width,
              height,
            );
            assert.equal(
              state.overflow,
              true,
              `${layout} ${scenario} must not overflow at ${width}px`,
            );
            if (scenario === "soldout") {
              assert.ok(
                state.text.includes("Agotado"),
                `${layout} sold-out label`,
              );
              assert.equal(
                state.buttons.some((button) =>
                  button.aria?.includes(demoLabels.products[0]),
                ),
                false,
                `${layout} does not offer the sold-out product`,
              );
            }
            if (["no-order", "closed"].includes(scenario))
              assert.equal(
                state.buttons.some((button) => button.text.includes("Agregar")),
                false,
                `${layout} ${scenario} add controls`,
              );
            if (scenario === "no-photos")
              assert.equal(state.photos, 0, `${layout} no photos`);
            if (scenario === "empty")
              assert.ok(
                state.text.includes("Pronto encontrarás productos aquí."),
                `${layout} empty message`,
              );
            if (scenario === "empty-category")
              assert.ok(
                state.text.includes(demoLabels.categories[0]),
                `${layout} empty category remains visible`,
              );
            if (scenario === "product_store")
              assert.equal(
                state.catalogLabel,
                "catálogo",
                `${layout} product-store labels`,
              );
          }
      for (const layout of registry.matrixLayouts) {
        const state = await inspect(
          layout,
          "theme-herb",
          "long-names",
          320,
          800,
        );
        assert.equal(
          state.overflow,
          true,
          `${layout} long names must not overflow at 320px`,
        );
        assert.ok(
          state.text.includes(demoLabels.longStoreName) &&
            state.text.includes(demoLabels.longCategoryName) &&
            state.text.includes(demoLabels.longProductName) &&
            state.longPrice,
          `${layout} preserves long store, category, product names and the formatted price`,
        );
      }
      networkWrites.length = 0;
      for (const layout of registry.matrixLayouts) {
        await inspect(layout, "theme-mexican", "default", 375, 900);
        const control = `document.querySelector('.store-atelier [aria-label^="Agregar"]')`;
        await command("Input.dispatchKeyEvent", {
          type: "keyDown",
          key: "Tab",
          code: "Tab",
          windowsVirtualKeyCode: 9,
        });
        const focused = await evaluate(
          `(()=>{const button=${control};button.focus();const style=getComputedStyle(button);return document.activeElement===button&&button.matches(':focus-visible')&&style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0})()`,
        );
        assert.equal(focused, true, `${layout} has visible keyboard focus`);
        await click(control);
        await waitFor(
          `document.querySelector("aside[aria-label='Carrito de pedido']")?.textContent.includes('Pedido (1)')`,
        );
        await inspect(layout, "theme-mexican", "unavailable", 375, 900);
        await click(control);
        await waitFor(
          `document.querySelector("aside[aria-label='Carrito de pedido']")?.textContent.includes('no está disponible')`,
        );
        assert.equal(
          await evaluate(
            `document.querySelector("aside[aria-label='Carrito de pedido']")?.textContent.includes('Pedido (1)')`,
          ),
          false,
          `${layout} respects ordering mode availability`,
        );
      }
      assert.equal(await evaluate("location.pathname"), "/__templates");
      assert.deepEqual(
        networkWrites,
        [],
        "adding demo products must not write to the network or checkout",
      );
      const unavailable = await inspect(
        "layout-garden",
        "theme-herb",
        "no-order",
        375,
        900,
      );
      assert.equal(
        unavailable.buttons.some((button) => button.text.includes("Agregar")),
        false,
        "unavailable ordering cannot add to the cart",
      );
    }
    if (capture) {
      const directory = join(root, ".impeccable", "review", "templates");
      await mkdir(directory, { recursive: true });
      const recommended = [
        ["layout-garden", "theme-herb"],
        ["layout-chronicle", "theme-mexican"],
        ["layout-invitation", "theme-christmas"],
        ["layout-billboard", "theme-charcoal"],
        ["layout-spotlight", "theme-cacao"],
        ["layout-ribbon", "theme-matcha"],
      ];
      for (const [layout, theme] of recommended)
        for (const [width, height] of dimensions) {
          await command("Emulation.setDeviceMetricsOverride", {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: width === 375,
          });
          await evaluate(
            `window.showTemplate(${JSON.stringify(layout)},${JSON.stringify(theme)},'default').then(()=>{window.scrollTo(0,0);return new Promise(resolve=>requestAnimationFrame(resolve))})`,
          );
          if (
            await evaluate(
              `Boolean(document.querySelector("aside [aria-label='Progreso del pedido']"))`,
            )
          ) {
            await click(
              `document.querySelector("aside[aria-label='Carrito de pedido'] > button")`,
            );
            await waitFor(
              `!document.querySelector("aside [aria-label='Progreso del pedido']")`,
            );
          }
          await evaluate(
            `document.body.classList.add('is-capture'); window.scrollTo(0,0); new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
          );
          const { cssContentSize } = await command("Page.getLayoutMetrics");
          const suffix = width === 375 ? "mobile" : "desktop";
          const fullPage = await command("Page.captureScreenshot", {
            format: "png",
            captureBeyondViewport: true,
            clip: {
              x: 0,
              y: 0,
              width: cssContentSize.width,
              height: cssContentSize.height,
              scale: 1,
            },
          });
          await writeFile(
            join(directory, `${layout}-${suffix}.png`),
            Buffer.from(fullPage.data, "base64"),
          );
          const firstViewport = await command("Page.captureScreenshot", {
            format: "png",
            captureBeyondViewport: false,
          });
          await writeFile(
            join(directory, `${layout}-${suffix}-first.png`),
            Buffer.from(firstViewport.data, "base64"),
          );
        }
    }
    assert.deepEqual(exceptions, []);
    console.log(
      `PASS ${registry.matrixLayouts.length} layouts × ${registry.themes.length} themes${captureOnly ? ", captures only" : ", scenarios, cart, overflow"}${capture ? ", captures" : ""}`,
    );
  }
} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null) {
    const exited = new Promise((resolve) => chrome.once("exit", resolve));
    chrome.kill();
    await exited;
  }
  await server.close();
  await rm(profile, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
}
