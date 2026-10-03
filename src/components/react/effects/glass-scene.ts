type Random = () => number;

type Drop = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  falling: boolean;
  distance: number;
  phase: number;
  adhesion: number;
};

type Trail = {
  x: number;
  y: number;
  length: number;
  width: number;
  age: number;
  life: number;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

export function createGlassScene(
  width: number,
  height: number,
  rng: Random = Math.random,
): (ctx: CanvasRenderingContext2D, dt: number, time: number) => void {
  width = Math.max(1, Number.isFinite(width) ? width : 1);
  height = Math.max(1, Number.isFinite(height) ? height : 1);
  const mobile = Math.min(width, height) < 680;
  const maxDrops = mobile ? 90 : 150;
  const maxTrails = mobile ? 140 : 240;
  const drops: Drop[] = [];
  const trails: Trail[] = [];
  const initialCount = Math.min(
    maxDrops,
    Math.max(28, Math.round((width * height) / (mobile ? 10_000 : 15_000))),
  );
  let water = 0;

  const makeDrop = (fromTop = false): Drop => {
    const r = 1.2 + rng() ** 1.5 * 4.6;
    return {
      x: clamp(r + rng() * Math.max(1, width - r * 2), r, width - r),
      y: fromTop
        ? r + rng() * height * 0.14
        : clamp(r + rng() * Math.max(1, height - r * 2), r, height - r),
      r,
      vx: (rng() - 0.5) * 1.5,
      vy: 0,
      age: 0,
      life: 14 + rng() * 28,
      falling: false,
      distance: 0,
      phase: rng() * Math.PI * 2,
      adhesion: 4.5 + rng() * 2.5,
    };
  };

  for (let index = 0; index < initialCount; index += 1) {
    const drop = makeDrop();
    if (index % 9 === 0) {
      drop.r = 6.5 + rng() * 3;
      drop.falling = true;
      drop.vy = 30 + rng() * 25;
    }
    drops.push(drop);
  }

  const addTrail = (drop: Drop, length: number) => {
    trails.push({
      x: drop.x,
      y: drop.y - length,
      length,
      width: clamp(drop.r * 0.28, 0.35, 1.8),
      age: 0,
      life: 1.6 + rng() * 1.8,
    });
    if (trails.length > maxTrails) trails.splice(0, trails.length - maxTrails);
  };

  const mergeDrops = () => {
    for (let left = 0; left < drops.length; left += 1) {
      const first = drops[left];
      for (let right = drops.length - 1; right > left; right -= 1) {
        const second = drops[right];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const mergeDistance = (first.r + second.r) * 0.82;
        if (dx * dx + dy * dy > mergeDistance * mergeDistance) continue;

        const firstArea = first.r * first.r;
        const secondArea = second.r * second.r;
        const area = firstArea + secondArea;
        first.x = (first.x * firstArea + second.x * secondArea) / area;
        first.y = (first.y * firstArea + second.y * secondArea) / area;
        first.vx = (first.vx * firstArea + second.vx * secondArea) / area;
        first.vy = (first.vy * firstArea + second.vy * secondArea) / area;
        first.r = Math.sqrt(area);
        first.life = Math.max(first.life, second.life);
        first.age = Math.min(first.age, second.age);
        first.falling ||= second.falling;
        drops.splice(right, 1);
      }
    }
  };

  return (ctx, dt, time) => {
    const step = Number.isFinite(dt) ? clamp(dt, 0, 0.05) : 0;
    const now = Number.isFinite(time) ? time : 0;
    const waterInterval = mobile ? 0.48 : 0.3;
    water = Math.min(water + step, waterInterval);

    while (water >= waterInterval && drops.length < maxDrops) {
      water -= waterInterval;
      const incoming = makeDrop(rng() < 0.38);
      if (drops.length && rng() < 0.55) {
        const anchor = drops[Math.floor(rng() * drops.length)];
        incoming.x = clamp(
          anchor.x + (rng() - 0.5) * anchor.r * 0.8,
          incoming.r,
          width - incoming.r,
        );
        incoming.y = clamp(
          anchor.y + (rng() - 0.5) * anchor.r * 0.8,
          incoming.r,
          height - incoming.r,
        );
      }
      drops.push(incoming);
    }

    for (let index = trails.length - 1; index >= 0; index -= 1) {
      const trail = trails[index];
      trail.age += step;
      if (trail.age >= trail.life) trails.splice(index, 1);
    }

    for (let index = drops.length - 1; index >= 0; index -= 1) {
      const drop = drops[index];
      drop.age += step;

      if (!drop.falling) {
        if (drop.r > drop.adhesion && drop.age > 1.2) drop.falling = true;
      }

      if (drop.falling) {
        const previousY = drop.y;
        drop.vy = Math.min(drop.vy + (42 + drop.r * 10) * step, 220);
        drop.vx *= 0.16 ** step;
        drop.x = clamp(drop.x + drop.vx * step, drop.r, width - drop.r);
        drop.y += drop.vy * step;
        drop.distance += drop.y - previousY;
        const trailSpacing = Math.max(3, drop.r * 1.35);
        if (drop.distance >= trailSpacing) {
          addTrail(drop, Math.min(drop.distance * 1.8, 28 + drop.r * 3));
          drop.distance = 0;
        }
      }

      if (drop.age >= drop.life || drop.y - drop.r > height + 16) {
        drops.splice(index, 1);
      }
    }

    mergeDrops();

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.lineCap = "round";

    for (const trail of trails) {
      const opacity = (1 - trail.age / trail.life) ** 1.8;
      ctx.strokeStyle = `rgba(205, 220, 232, ${opacity * 0.18})`;
      ctx.lineWidth = trail.width * 2.4;
      ctx.beginPath();
      ctx.moveTo(trail.x, trail.y);
      ctx.lineTo(trail.x, trail.y + trail.length);
      ctx.stroke();
      ctx.strokeStyle = `rgba(20, 34, 48, ${opacity * 0.12})`;
      ctx.lineWidth = trail.width;
      ctx.beginPath();
      ctx.moveTo(trail.x + trail.width * 0.65, trail.y + trail.width);
      ctx.lineTo(trail.x + trail.width * 0.65, trail.y + trail.length);
      ctx.stroke();
    }

    for (const drop of drops) {
      const speed = Math.abs(drop.vy);
      const stretch = 1 + clamp(speed / 150, 0, 0.72);
      const pulse = 0.9 + Math.sin(now / 1.1 + drop.phase) * 0.06;
      const rx = drop.r;
      const ry = drop.r * stretch;

      ctx.save();
      ctx.translate(drop.x, drop.y);
      ctx.scale(1, stretch);

      ctx.beginPath();
      ctx.moveTo(0, -drop.r);
      ctx.bezierCurveTo(
        rx * 0.9,
        -drop.r * 0.95,
        rx * 1.1,
        drop.r * 0.65,
        rx * 0.45,
        drop.r * 0.95,
      );
      ctx.bezierCurveTo(
        -rx * 0.8,
        drop.r * 1.2,
        -rx * 1.2,
        -drop.r * 0.6,
        0,
        -drop.r,
      );
      const lens = ctx.createRadialGradient(
        -rx * 0.28,
        -drop.r * 0.35,
        0,
        0,
        0,
        drop.r * 1.2,
      );
      lens.addColorStop(0, "rgba(248, 253, 255, 0.24)");
      lens.addColorStop(0.42, "rgba(180, 210, 225, 0.025)");
      lens.addColorStop(0.82, "rgba(26, 42, 53, 0.09)");
      lens.addColorStop(1, "rgba(8, 21, 31, 0.3)");
      ctx.fillStyle = lens;
      ctx.fill();
      ctx.strokeStyle = `rgba(17, 31, 44, ${0.25 * pulse})`;
      ctx.lineWidth = clamp(drop.r * 0.24, 0.35, 1.15);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        -rx * 0.1,
        -drop.r * 0.12,
        drop.r * 0.82,
        Math.PI * 1.1,
        Math.PI * 1.86,
      );
      ctx.strokeStyle = `rgba(245, 251, 255, ${0.3 * pulse})`;
      ctx.lineWidth = clamp(drop.r * 0.24, 0.38, 1.25);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        rx * 0.14,
        drop.r * 0.16,
        drop.r * 0.8,
        Math.PI * 0.08,
        Math.PI * 0.78,
      );
      ctx.strokeStyle = "rgba(9, 24, 37, 0.14)";
      ctx.lineWidth = clamp(drop.r * 0.18, 0.3, 0.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        -rx * 0.28,
        -drop.r * 0.32,
        Math.max(0.25, rx * 0.23),
        Math.max(0.18, drop.r * 0.1),
        -0.55,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(255, 255, 255, ${0.34 * pulse})`;
      ctx.fill();
      ctx.restore();

      if (
        drops.length < maxDrops &&
        drop.falling &&
        drop.r > 2.2 &&
        rng() < step * 0.55
      ) {
        const beadRadius = clamp(drop.r * (0.16 + rng() * 0.12), 0.5, 1.4);
        drop.r = Math.sqrt(drop.r * drop.r - beadRadius * beadRadius);
        drops.push({
          ...makeDrop(),
          x: clamp(drop.x + (rng() - 0.5) * drop.r * 2.4, 0.5, width - 0.5),
          y: clamp(drop.y - ry * 0.55, 0.5, height - 0.5),
          r: beadRadius,
          life: 2 + rng() * 3,
        });
      }
    }

    ctx.restore();
  };
}
