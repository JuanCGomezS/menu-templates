import { useEffect, useRef } from "react";

type DrawFrame = (
  context: CanvasRenderingContext2D,
  delta: number,
  time: number,
) => void;
type CreateScene = (width: number, height: number) => DrawFrame;

export function useWaterCanvas(createScene: CreateScene) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let context: CanvasRenderingContext2D | null;
    try {
      context = canvas.getContext("2d");
    } catch {
      return;
    }
    if (!context) return;
    const ctx = context;
    let frame = 0;
    let last = 0;
    let time = 0;
    let draw: DrawFrame | undefined;
    let stopped = false;
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        1.5,
        Math.sqrt(2_500_000 / (width * height)),
      );
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      try {
        draw = createScene(width, height);
      } catch {
        draw = undefined;
      }
      last = 0;
    };
    const animate = (now: number) => {
      if (stopped) return;
      const delta = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      time += delta;
      try {
        draw?.(ctx, delta, time);
      } catch {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      frame = requestAnimationFrame(animate);
    };
    let observer: ResizeObserver | undefined;
    try {
      observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();
      frame = requestAnimationFrame(animate);
    } catch {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      return;
    }
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [createScene]);
  return ref;
}
