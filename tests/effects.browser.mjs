import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdtemp,
  rm,
  mkdir,
  writeFile,
  readFile,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const preview = process.argv.includes("--preview");
const chromePath = process.env.CHROME_PATH;
assert.ok(
  preview || chromePath,
  "Set CHROME_PATH to an installed Chromium executable.",
);
const profile = await mkdtemp(join(tmpdir(), "store-effects-"));
const root = process.cwd();
const cssFiles = (await readdir(join(root, "dist/_astro"))).filter((name) =>
  name.endsWith(".css"),
);
const builtCss = (
  await Promise.all(
    cssFiles.map((name) => readFile(join(root, "dist/_astro", name), "utf8")),
  )
).join("\n");
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
  server: { host: "127.0.0.1", port: preview ? 4176 : 0, strictPort: true },
  logLevel: "error",
  plugins: [
    {
      name: "effects-browser-fixture",
      enforce: "pre",
      resolveId(id) {
        if (id.endsWith("/lib/firebase") || id === "./firebase")
          return "\0effects-test-firebase";
      },
      load(id) {
        if (id === "\0effects-test-firebase")
          return 'export const app = null, db = null, auth = null, storage = null, vapidKey = "";';
      },
      configureServer(devServer) {
        devServer.middlewares.use((req, res, next) => {
          const pathname = new URL(req.url, "http://localhost").pathname;
          if (pathname === "/__effects.css") {
            res.setHeader("Content-Type", "text/css");
            res.end(builtCss);
            return;
          }
          if (pathname !== "/__effects") return next();
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
const page = `<!doctype html><html><head><link rel="icon" href="data:,"><link rel="stylesheet" href="/__effects.css"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;font:16px sans-serif;background:#111827;color:#fff8ef}.test-content{padding:32px;min-height:120vh}.test-content h1{font-size:48px}button{font:inherit}#app{--store-bg:#fff8ef;--store-surface:#ffffff;--store-text:#111827;--store-accent:#f97316;--store-accent-secondary:#62c9ca;--store-accent-tertiary:#f5d866}
</style></head><body><div id="app"></div><script type="module">
import React from 'react';
import { createRoot } from 'react-dom/client';
import StoreEffectLayer from '/src/components/react/StoreEffectLayer.tsx';
import { PublicStoreTemplateView } from '/src/components/react/RestaurantMenuView.tsx';
window.waterFrames = 0;
const originalClear = CanvasRenderingContext2D.prototype.clearRect;
CanvasRenderingContext2D.prototype.clearRect = function(...args) {
  if (this.canvas.classList.contains('store-fx-water')) window.waterFrames++;
  return originalClear.apply(this, args);
};
const root = createRoot(document.getElementById('app'));
window.showEffect = id => root.render(React.createElement(StoreEffectLayer, {effectId:id}, React.createElement('main',{className:'test-content'},React.createElement('h1',null,'Store effects'),React.createElement('p',null,'Catalog content must remain readable.'),React.createElement('button',{id:'order',onClick:()=>window.orders++},'Add product'))));
window.showStore = (templateId, effectId, themeId = 'theme-default') => {
  const schedule = Object.fromEntries(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day=>[day,{open:'00:00',close:'23:59',closed:false}]));
  const store = {id:'fixture',name:'Studio Store',slug:'fixture',active:true,isActive:true,currency:'USD',templateId,themeId,effectId,schedule,timeZone:'America/Bogota',capabilities:{inStoreOrdering:true},contact:{address:'Sample address'},categories:[{id:'collection',name:'Collection',items:[{id:'sample',categoryId:'collection',name:'Everyday essential',description:'A sample item to verify that content and ordering remain accessible.',price:25,order:0}]}]};
  root.render(React.createElement(PublicStoreTemplateView,{store}));
};
window.orders = 0;
if (${preview}) {
  const toolbar = document.createElement('nav');
  toolbar.setAttribute('aria-label', 'Vista de prueba de efectos');
  toolbar.style.cssText = 'position:relative;z-index:30;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:16px;background:#17252c;color:#fff;font:14px system-ui';
  toolbar.innerHTML = '<span>Vista de prueba · datos de ejemplo</span><label>Efecto <select id="preview-effect" style="color:#17252c;padding:10px"><option value="effect-storm">Lluvia</option><option value="effect-glass">Cristal mojado</option><option value="effect-none">Sin efecto</option></select></label><label>Plantilla <select id="preview-layout" style="color:#17252c;padding:10px"><option value="minimal">Minimalista</option><option value="brasa">Nocturna</option><option value="natural">Botánica</option><option value="elegant">Arquitectónica</option><option value="frutal">Fotográfica</option></select></label>';
  document.body.insertBefore(toolbar, document.getElementById('app'));
  const update = () => window.showStore('layout-' + document.getElementById('preview-layout').value, document.getElementById('preview-effect').value);
  toolbar.addEventListener('change', update);
  update();
} else window.showEffect(new URLSearchParams(location.search).get('effect') || 'effect-none');
window.ready = true;
</script></body></html>`;
let chrome;
let socket;
try {
  await server.listen();
  const port = server.httpServer.address().port;
  if (preview) {
    console.log(`Effects preview: http://localhost:${port}/__effects`);
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
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown")
        exceptions.push(
          message.params.exceptionDetails.exception?.description ??
            message.params.exceptionDetails.text,
        );
      if (
        message.method === "Log.entryAdded" &&
        message.params.entry.level === "error"
      )
        console.error(message.params.entry.text);
      if (message.method === "Network.loadingFailed")
        console.error("Network failure:", message.params.errorText);
      if (
        message.method === "Network.responseReceived" &&
        message.params.response.status >= 400
      )
        console.error(
          message.params.response.status,
          message.params.response.url,
        );
      if (!message.id) return;
      const callback = pending.get(message.id);
      if (!callback) return;
      pending.delete(message.id);
      clearTimeout(callback.timer);
      if (message.error)
        callback.reject(new Error(JSON.stringify(message.error)));
      else callback.resolve(message.result);
    });
    function send(method, params = {}, sessionId) {
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP timed out: ${method}`));
        }, 15000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params, sessionId }));
      });
    }
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
          `${result.exceptionDetails.text}; browser exceptions: ${exceptions.join("; ")}`,
        );
      return result.result.value;
    };
    const waitFor = (expression) =>
      evaluate(
        `new Promise((resolve,reject)=>{let n=0;const check=()=>{if(${expression})resolve(true);else if(n++>150)reject(new Error('Condition timed out: '+${JSON.stringify(expression)}));else setTimeout(check,40)};check()})`,
      );
    const clickElement = async (expression) => {
      const point = await evaluate(
        `(async()=>{const element=${expression};element.scrollIntoView({block:'center'});await new Promise(requestAnimationFrame);const r=element.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;return {x,y,reachable:element.contains(document.elementFromPoint(x,y))}})()`,
      );
      assert.ok(
        point.reachable,
        "Control must receive pointer events above effects",
      );
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
    await command("Log.enable");
    await command("Network.enable");
    await command("Page.enable");
    await command("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    const navigation = new Promise((resolve, reject) => {
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
      url: `http://127.0.0.1:${port}/__effects?effect=effect-storm`,
    });
    await navigation;
    await waitFor(
      'window.ready && document.querySelector(".store-fx-controls")',
    );
    assert.equal(
      await evaluate('!!document.querySelector("[data-store-effect]")'),
      false,
    );
    assert.equal(
      await evaluate(
        'performance.getEntriesByType("resource").some(r=>/StormEffect/.test(r.name))',
      ),
      false,
    );
    console.log("PASS reduced motion: no renderer loaded");
    await command("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
    await waitFor('document.querySelector("[data-store-effect]")');
    const effects = ["mist", "storm", "glass", "particles", "gel", "elastic"];
    const screenshotDir = process.env.EFFECT_SCREENSHOTS;
    if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
    for (const width of [375, 1440]) {
      await command("Emulation.setDeviceMetricsOverride", {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: width < 640,
      });
      for (const effect of effects) {
        await evaluate(`window.showEffect('effect-${effect}')`);
        await waitFor(
          `document.querySelector('[data-store-effect="effect-${effect}"]')`,
        );
        assert.equal(
          await evaluate(
            'document.querySelector(".store-fx-stage").parentElement.tagName',
          ),
          "MAIN",
        );
        assert.equal(
          await evaluate(
            'getComputedStyle(document.querySelector(".store-fx-stage")).zIndex',
          ),
          "-1",
        );
        assert.equal(
          await evaluate(
            'getComputedStyle(document.querySelector("main")).isolation',
          ),
          "isolate",
        );
        if (effect === "storm" || effect === "glass") {
          await waitFor(
            'document.querySelector("canvas.store-fx-water")?.width > 0',
          );
          const first = await evaluate(
            'document.querySelector("canvas.store-fx-water").toDataURL()',
          );
          await evaluate("new Promise(resolve=>setTimeout(resolve,250))");
          const second = await evaluate(
            'document.querySelector("canvas.store-fx-water").toDataURL()',
          );
          assert.notEqual(
            first,
            second,
            "Water simulation must evolve over time",
          );
        }
        assert.equal(
          await evaluate(
            'getComputedStyle(document.querySelector(".store-fx-stage")).pointerEvents',
          ),
          "none",
        );
        assert.equal(
          await evaluate("document.documentElement.scrollWidth <= innerWidth"),
          true,
        );
        await evaluate(
          'document.querySelector(".store-fx-controls button").click()',
        );
        await waitFor('!document.querySelector("[data-store-effect]")');
        const stoppedFrames = await evaluate("window.waterFrames");
        await evaluate("new Promise(resolve=>setTimeout(resolve,100))");
        assert.equal(
          await evaluate("window.waterFrames"),
          stoppedFrames,
          "Paused canvas must stop drawing",
        );
        assert.equal(
          await evaluate(
            'document.querySelector(".store-fx-controls button").getAttribute("aria-pressed")',
          ),
          "true",
        );
        await evaluate('document.getElementById("order").click()');
        await evaluate(
          'document.querySelector(".store-fx-controls button").click()',
        );
        await waitFor('document.querySelector("[data-store-effect]")');
        if (screenshotDir) {
          await evaluate("new Promise(resolve=>setTimeout(resolve,1200))");
          const { data } = await command("Page.captureScreenshot", {
            format: "png",
          });
          await writeFile(
            join(screenshotDir, `${effect}-${width}.png`),
            Buffer.from(data, "base64"),
          );
        }
        console.log(
          `PASS ${effect} ${width}px: mounted, pause/resume, no overflow`,
        );
      }
    }
    assert.equal(await evaluate("window.orders"), effects.length * 2);
    await evaluate(
      'document.querySelector(".store-fx-controls button").click();window.showEffect("effect-gel")',
    );
    await waitFor(
      'document.querySelector(".store-fx-controls button").textContent.includes("Gel")',
    );
    assert.equal(
      await evaluate('!!document.querySelector("[data-store-effect]")'),
      false,
    );
    console.log("PASS pause persists across effect changes");
    await evaluate(
      'document.querySelector(".store-fx-controls button").click()',
    );
    await waitFor('document.querySelector("[data-store-effect]")');
    await evaluate(
      'Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))',
    );
    await waitFor('!document.querySelector("[data-store-effect]")');
    await evaluate(
      'delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))',
    );
    await waitFor('document.querySelector("[data-store-effect]")');
    console.log("PASS visibility-change lifecycle (simulated hidden document)");
    await command("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await waitFor('!document.querySelector("[data-store-effect]")');
    await evaluate('window.showEffect("unknown")');
    await waitFor('!document.querySelector(".store-fx-controls")');
    assert.equal(
      await evaluate('!!document.querySelector("[data-store-effect]")'),
      false,
    );
    assert.deepEqual(exceptions, []);
    console.log(
      "PASS dynamic reduced motion, unknown fallback, no browser exceptions",
    );
    await command("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
    const layouts = [
      "minimal",
      "natural",
      "warm",
      "elegant",
      "confetti",
      "brasa",
      "illustrated",
      "mascot",
      "frutal",
    ];
    for (const width of [375, 1440]) {
      await command("Emulation.setDeviceMetricsOverride", {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: width < 640,
      });
      for (const [index, layout] of layouts.entries()) {
        const effect = effects[index % effects.length];
        await evaluate(
          `window.showStore('layout-${layout}', 'effect-${effect}')`,
        );
        await waitFor(
          `document.querySelector('[data-store-effect="effect-${effect}"]')`,
        );
        assert.equal(
          await evaluate(
            `Number(getComputedStyle(document.querySelector("aside[aria-label='Carrito de pedido']")).zIndex) > 20`,
          ),
          true,
        );
        const cart = `document.querySelector("aside[aria-label='Carrito de pedido']")`;
        if (await evaluate(`!!${cart}.querySelector('form')`)) {
          await clickElement(`${cart}.querySelector('button')`);
          await waitFor(`!${cart}.querySelector('form')`);
        }
        const before = await evaluate(`${cart}.textContent`);
        await clickElement(
          `Array.from(document.querySelectorAll('main button')).find(button=>button.textContent.includes('Agregar'))`,
        );
        await waitFor(`${cart}.textContent !== ${JSON.stringify(before)}`);
        assert.equal(await evaluate(`!!${cart}.querySelector('form')`), false);
        await evaluate("window.scrollTo(0,0)");
        if (screenshotDir) {
          const { data } = await command("Page.captureScreenshot", {
            format: "png",
          });
          await writeFile(
            join(screenshotDir, `store-${layout}-${width}.png`),
            Buffer.from(data, "base64"),
          );
        }
        console.log(`PASS real layout ${layout} + ${effect}, ${width}px`);
      }
    }
    for (const width of [375, 1440]) {
      await command("Emulation.setDeviceMetricsOverride", {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: width < 640,
      });
      for (const effect of ["storm", "glass"]) {
        await evaluate(
          `window.showStore('layout-minimal', 'effect-${effect}')`,
        );
        await waitFor(
          `document.querySelector('[data-store-effect="effect-${effect}"] canvas')`,
        );
        assert.equal(
          await evaluate(
            'document.querySelector(".store-fx-stage").parentElement.tagName',
          ),
          "MAIN",
        );
        for (let moment = 0; moment < 3; moment++) {
          await evaluate("new Promise(resolve=>setTimeout(resolve,700))");
          if (screenshotDir) {
            const { data } = await command("Page.captureScreenshot", {
              format: "png",
            });
            await writeFile(
              join(screenshotDir, `water-${effect}-${width}-${moment}.png`),
              Buffer.from(data, "base64"),
            );
          }
        }
        await command("Emulation.setEmulatedMedia", {
          features: [{ name: "prefers-reduced-motion", value: "reduce" }],
        });
        await waitFor('!document.querySelector("canvas.store-fx-water")');
        const count = await evaluate("window.waterFrames");
        await evaluate("new Promise(resolve=>setTimeout(resolve,100))");
        assert.equal(await evaluate("window.waterFrames"), count);
        await command("Emulation.setEmulatedMedia", {
          features: [
            { name: "prefers-reduced-motion", value: "no-preference" },
          ],
        });
        await waitFor('document.querySelector("canvas.store-fx-water")');
        console.log(
          `PASS water ${effect} ${width}px: background stacking, temporal capture, reduced motion cleanup`,
        );
      }
    }
    await evaluate('window.showEffect("effect-none")');
  await waitFor('!document.querySelector(".store-fx-stage")');
  await evaluate('window.savedObserver = window.ResizeObserver; window.ResizeObserver = class { constructor() { throw new Error("Simulated observer failure"); } }; window.showEffect("effect-glass")');
  await waitFor('document.querySelector("canvas.store-fx-water")');
  await clickElement('document.getElementById("order")');
  assert.ok(await evaluate('!!document.querySelector("main")'), 'Observer failure must preserve catalog');
  await evaluate('window.ResizeObserver = window.savedObserver; delete window.savedObserver; window.showEffect("effect-none")');
  await waitFor('!document.querySelector(".store-fx-stage")');
  console.log('PASS ResizeObserver failure leaves catalog usable');
  assert.deepEqual(exceptions, []);
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
