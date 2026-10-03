import { createRainScene } from "./rain-scene";
import { useWaterCanvas } from "./useWaterCanvas";

export default function StormEffect() {
  const ref = useWaterCanvas(createRainScene);
  return <canvas ref={ref} className="store-fx-water" aria-hidden="true" />;
}
