import { createGlassScene } from "./glass-scene";
import { useWaterCanvas } from "./useWaterCanvas";

export default function GlassEffect() {
  const ref = useWaterCanvas(createGlassScene);
  return <canvas ref={ref} className="store-fx-water" aria-hidden="true" />;
}
