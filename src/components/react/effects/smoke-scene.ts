type SmokeParticle = {
  age: number;
  duration: number;
  x: number;
  y: number;
  originX: number;
  radius: number;
  riseSpeed: number;
  phase: number;
  sway: number;
  drift: number;
};

type Random = () => number;

const MAX_DELTA_SECONDS = 0.05;

export function createSmokeScene(
  width: number,
  height: number,
  random: Random = Math.random,
): (ctx: CanvasRenderingContext2D, delta: number, time: number) => void {
  const particles: SmokeParticle[] = [];
  const isCompact = width < 640;
  const maxParticles = isCompact ? 48 : 80;
  const spawnInterval = isCompact ? 0.13 : 0.09;
  let spawnElapsed = spawnInterval;

  const spawn = (initialProgress = 0) => {
    if (particles.length >= maxParticles) return;

    const duration = 5.2 + random() * 4.6;
    const riseSpeed = height * (0.09 + random() * 0.055);
    const sourceX = width * (0.5 + (random() - 0.5) * 0.09);
    const particle: SmokeParticle = {
      age: duration * initialProgress,
      duration,
      x: sourceX,
      y:
        height +
        28 +
        random() * 36 -
        riseSpeed * duration * initialProgress * (0.9 + initialProgress * 0.14),
      originX: sourceX,
      radius: 13 + random() * 25,
      riseSpeed,
      phase: random() * Math.PI * 2,
      sway: width * (0.05 + random() * 0.1),
      drift: (random() - 0.5) * width * 0.025,
    };

    particles.push(particle);
  };

  for (let index = 0; index < (isCompact ? 4 : 7); index += 1) {
    spawn(0.13 + random() * 0.46);
  }

  return (ctx, rawDelta, time) => {
    const delta = Math.min(MAX_DELTA_SECONDS, Math.max(0, rawDelta));
    spawnElapsed += delta;
    while (spawnElapsed >= spawnInterval) {
      spawn();
      spawnElapsed -= spawnInterval;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.age += delta;
      if (particle.age >= particle.duration) {
        particles.splice(index, 1);
        continue;
      }

      const progress = particle.age / particle.duration;
      const turbulence =
        Math.sin(time * 1.12 + particle.phase + progress * 7.4) * 0.62 +
        Math.sin(time * 0.43 + particle.phase * 1.8 + progress * 15.2) * 0.38;
      const gust =
        Math.sin(time * 0.19 + particle.phase * 0.6) * width * 0.018 +
        Math.sin(time * 0.07 + particle.phase) * width * 0.022;

      particle.y -= particle.riseSpeed * delta * (0.9 + progress * 0.28);
      particle.x +=
        (turbulence * particle.sway * (0.35 + progress * 0.9) +
          gust +
          particle.drift) *
        delta;

      const waveX =
        particle.originX +
        Math.sin(progress * Math.PI * 2.3 + particle.phase) *
          particle.sway *
          (0.14 + progress * 0.52);
      particle.x += (waveX - particle.x) * delta * 0.38;

      const envelope = Math.sin(Math.min(1, progress * 1.16) * Math.PI);
      const opacity = envelope * envelope * (0.1 + (1 - progress) * 0.18);
      const radius = particle.radius * (0.55 + progress * 2.35);
      const gradient = ctx.createRadialGradient(
        particle.x - radius * 0.17,
        particle.y - radius * 0.14,
        radius * 0.03,
        particle.x,
        particle.y,
        radius,
      );

      gradient.addColorStop(0, `rgba(250, 252, 253, ${opacity * 0.92})`);
      gradient.addColorStop(0.28, `rgba(226, 234, 238, ${opacity})`);
      gradient.addColorStop(0.68, `rgba(178, 191, 199, ${opacity * 0.45})`);
      gradient.addColorStop(1, "rgba(178, 191, 199, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(
        particle.x,
        particle.y,
        radius * (0.68 + progress * 0.28),
        radius * (1.14 + progress * 0.45),
        turbulence * 0.34,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  };
}
