import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { resolveEffect, type EffectId } from "../../lib/effects";
import "./effects/effect-layer.css";

type AnimatedEffectId = Exclude<EffectId, "effect-none">;

const loaders: Record<
  AnimatedEffectId,
  () => Promise<{ default: ComponentType }>
> = {
  "effect-smoke": () => import("./effects/SmokeEffect"),
  "effect-storm": () => import("./effects/StormEffect"),
  "effect-glass": () => import("./effects/GlassEffect"),
  "effect-particles": () => import("./effects/ParticlesEffect"),
  "effect-snow": () => import("./effects/SeasonalEffect"),
  "effect-petals": () => import("./effects/SeasonalEffect"),
  "effect-ribbons": () => import("./effects/SeasonalEffect"),
  "effect-hearts": () => import("./effects/SeasonalEffect"),
  "effect-pumpkins": () => import("./effects/SeasonalEffect"),
  "effect-eggs": () => import("./effects/SeasonalEffect"),
  "effect-streamers": () => import("./effects/SeasonalEffect"),
  "effect-candles": () => import("./effects/SeasonalEffect"),
};

export default function StoreEffectLayer({
  effectId,
  children,
}: {
  effectId?: string;
  children: ReactNode;
}) {
  const effect = resolveEffect(effectId);
  const scope = useRef<HTMLDivElement>(null);
  const [surface, setSurface] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const main = scope.current?.querySelector("main") ?? null;
    setSurface(main);
    main?.classList.add("store-fx-surface");
    return () => main?.classList.remove("store-fx-surface");
  }, [children, effect.id]);
  const [environment, setEnvironment] = useState<{
    id: EffectId | null;
    reduced: boolean;
    visible: boolean;
  }>({ id: null, reduced: true, visible: false });
  const [loaded, setLoaded] = useState<{
    id: EffectId;
    Renderer: ComponentType;
  } | null>(null);
  const [failedId, setFailedId] = useState<EffectId | null>(null);

  useEffect(() => {
    if (effect.id === "effect-none") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const refresh = () =>
      setEnvironment({
        id: effect.id,
        reduced: preference.matches,
        visible: !document.hidden,
      });
    refresh();
    preference.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      preference.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [effect.id]);

  const running =
    environment.id === effect.id &&
    environment.visible &&
    !environment.reduced &&
    failedId !== effect.id;

  useEffect(() => {
    if (!running || effect.id === "effect-none") return;
    let cancelled = false;
    loaders[effect.id]().then(
      ({ default: Renderer }) => {
        if (!cancelled) setLoaded({ id: effect.id, Renderer });
      },
      () => {
        if (!cancelled) setFailedId(effect.id);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [effect.id, running]);

  if (effect.id === "effect-none") return <>{children}</>;
  const Renderer = loaded?.id === effect.id ? loaded.Renderer : null;

  return (
    <div ref={scope}>
      {children}
      {running &&
        Renderer &&
        surface &&
        createPortal(
          <div
            className="store-fx-stage"
            data-store-effect={effect.id}
            aria-hidden="true"
          >
            <Renderer />
          </div>,
          surface,
        )}
    </div>
  );
}
