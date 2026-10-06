import { createSmokeScene } from "./smoke-scene";
import "./smoke.css";
import { useWaterCanvas } from "./useWaterCanvas";

export default function SmokeEffect() {
  const ref = useWaterCanvas(createSmokeScene, { respectReducedMotion: true });
  return <canvas ref={ref} className="store-fx-smoke" aria-hidden="true" />;
}
