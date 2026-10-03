type Random = () => number;

type Drop = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  gravity: number;
  length: number;
  width: number;
  alpha: number;
  depth: number;
  sway: number;
  phase: number;
};

type Splash = {
  x: number;
  age: number;
  duration: number;
  spread: number;
  rise: number;
  alpha: number;
  direction: number;
};

const MAX_DELTA_SECONDS = 0.05;
const MAX_SPLASHES = 56;

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

export function createRainScene(
  width: number,
  height: number,
  random: Random = Math.random,
): (ctx: CanvasRenderingContext2D, dt: number, time: number) => void {
  const sceneWidth = Math.max(1, finite(width, 1));
  const sceneHeight = Math.max(1, finite(height, 1));
  const dropCount = sceneWidth < 720 ? 80 : 180;
  const drops: Drop[] = [];
  const splashes: Splash[] = [];

  const resetDrop = (drop: Drop, fromTop: boolean) => {
    const depth = 0.35 + random() * 0.65;
    drop.depth = depth;
    drop.length = 7 + 17 * depth + random() * 8;
    drop.x = random() * sceneWidth;
    drop.y = fromTop
      ? -drop.length - random() * sceneHeight * 0.16
      : random() * sceneHeight;
    drop.velocityX = (random() - 0.5) * (12 + 22 * depth);
    drop.velocityY = 330 + 410 * depth + random() * 100;
    drop.gravity = 90 + 150 * depth;
    drop.width = 0.45 + depth * 0.95;
    drop.alpha = 0.16 + depth * 0.29;
    drop.sway = 4 + random() * 16;
    drop.phase = random() * Math.PI * 2;
  };

  for (let index = 0; index < dropCount; index += 1) {
    const drop = {} as Drop;
    resetDrop(drop, false);
    drops.push(drop);
  }

  const spawnSplash = (x: number) => {
    const splash =
      splashes.length < MAX_SPLASHES ? ({} as Splash) : splashes.shift();
    if (!splash) return;

    splash.x = x;
    splash.age = 0;
    splash.duration = 0.16 + random() * 0.16;
    splash.spread = 4 + random() * 10;
    splash.rise = 1.5 + random() * 5;
    splash.alpha = 0.1 + random() * 0.18;
    splash.direction = random() < 0.5 ? -1 : 1;
    splashes.push(splash);
  };

  return (ctx, dt, time) => {
    const delta = Math.min(MAX_DELTA_SECONDS, Math.max(0, finite(dt, 0)));
    const now = finite(time, 0);
    const wind = Math.sin(now * 0.41) * 26 + Math.sin(now * 1.17 + 0.8) * 11;

    ctx.clearRect(0, 0, sceneWidth, sceneHeight);
    ctx.lineCap = "round";

    for (const drop of drops) {
      const gust =
        wind * (0.25 + drop.depth * 0.75) +
        Math.sin(now * 1.9 + drop.phase) * drop.sway;
      drop.velocityY += drop.gravity * delta;
      drop.x += (drop.velocityX + gust) * delta;
      drop.y += drop.velocityY * delta;

      if (drop.x < -drop.length) drop.x += sceneWidth + drop.length;
      if (drop.x > sceneWidth + drop.length) drop.x -= sceneWidth + drop.length;

      if (drop.y > sceneHeight + drop.length) {
        spawnSplash(drop.x);
        resetDrop(drop, true);
        continue;
      }

      const tailX = drop.x - (drop.velocityX + gust) * 0.045;
      const tailY = drop.y - drop.length;
      const outline = ctx.createLinearGradient(tailX, tailY, drop.x, drop.y);
      outline.addColorStop(0, "rgba(7, 21, 34, 0)");
      outline.addColorStop(0.7, `rgba(7, 21, 34, ${drop.alpha * 0.32})`);
      outline.addColorStop(1, `rgba(7, 21, 34, ${drop.alpha * 0.5})`);
      ctx.strokeStyle = outline;
      ctx.lineWidth = drop.width + 0.7;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(drop.x, drop.y);
      ctx.stroke();

      const highlight = ctx.createLinearGradient(tailX, tailY, drop.x, drop.y);
      highlight.addColorStop(0, "rgba(185, 222, 255, 0)");
      highlight.addColorStop(0.58, `rgba(185, 222, 255, ${drop.alpha * 0.46})`);
      highlight.addColorStop(1, `rgba(239, 249, 255, ${drop.alpha})`);
      ctx.strokeStyle = highlight;
      ctx.lineWidth = drop.width;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(drop.x, drop.y);
      ctx.stroke();
    }

    for (let index = splashes.length - 1; index >= 0; index -= 1) {
      const splash = splashes[index];
      splash.age += delta;
      if (splash.age >= splash.duration) {
        splashes.splice(index, 1);
        continue;
      }

      const progress = splash.age / splash.duration;
      const opacity = splash.alpha * (1 - progress) * (1 - progress);
      const spread = splash.spread * progress;
      const rise = splash.rise * Math.sin(progress * Math.PI);
      ctx.strokeStyle = `rgba(202, 232, 255, ${opacity})`;
      ctx.lineWidth = 0.55 + (1 - progress) * 0.45;
      ctx.beginPath();
      ctx.moveTo(splash.x - spread, sceneHeight);
      ctx.quadraticCurveTo(
        splash.x - spread * 0.35,
        sceneHeight - rise,
        splash.x,
        sceneHeight - rise * 0.28,
      );
      ctx.quadraticCurveTo(
        splash.x + spread * 0.35,
        sceneHeight - rise * 0.7,
        splash.x + spread * splash.direction,
        sceneHeight,
      );
      ctx.stroke();
    }
  };
}
