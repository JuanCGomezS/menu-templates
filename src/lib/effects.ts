export type EffectId =
  | "effect-none"
  | "effect-smoke"
  | "effect-storm"
  | "effect-glass"
  | "effect-particles"
  | "effect-snow"
  | "effect-petals"
  | "effect-ribbons"
  | "effect-hearts"
  | "effect-pumpkins"
  | "effect-eggs"
  | "effect-streamers"
  | "effect-candles";

export interface EffectConfig {
  id: EffectId;
  name: string;
  description: string;
}

const EFFECTS: readonly EffectConfig[] = [
  {
    id: "effect-none",
    name: "Sin efecto",
    description: "Presentación sin animación ambiental.",
  },
  {
    id: "effect-smoke",
    name: "Humo ascendente",
    description:
      "Penachos de humo cálido que ascienden desde la base y se disipan.",
  },
  {
    id: "effect-storm",
    name: "Lluvia",
    description:
      "Gotas en profundidad, ráfagas y salpicaduras, sin iconos ni destellos.",
  },
  {
    id: "effect-glass",
    name: "Cristal mojado",
    description:
      "Gotas que se acumulan, se unen y resbalan dejando rastros sobre un cristal simulado.",
  },
  {
    id: "effect-particles",
    name: "Partículas prismáticas",
    description:
      "Destellos y pequeñas piezas de color que recorren el fondo con calma.",
  },
  {
    id: "effect-snow",
    name: "Lluvia de nieve",
    description: "Copos ligeros para el tema navideño.",
  },
  {
    id: "effect-petals",
    name: "Flores al viento",
    description: "Pétalos suaves para el tema del Día de la Madre.",
  },
  {
    id: "effect-ribbons",
    name: "Cintas de celebración",
    description: "Tiras de papel sobrias para el tema del Día del Padre.",
  },
  {
    id: "effect-hearts",
    name: "Lluvia de corazones",
    description: "Corazones flotantes para el tema de San Valentín.",
  },
  {
    id: "effect-pumpkins",
    name: "Lluvia de calabazas",
    description: "Pequeñas calabazas para el tema de Halloween.",
  },
  {
    id: "effect-eggs",
    name: "Lluvia de Pascua",
    description: "Huevos de colores para el tema de Pascua.",
  },
  {
    id: "effect-streamers",
    name: "Brillos patrios",
    description: "Cintas azul, amarilla y roja para el tema de Independencia.",
  },
  {
    id: "effect-candles",
    name: "Velitas encendidas",
    description: "Luces cálidas para el tema del Día de las Velitas.",
  },
];

export function resolveEffect(id: unknown): EffectConfig {
  return EFFECTS.find((effect) => effect.id === id) ?? EFFECTS[0];
}

export function getAllEffects(): EffectConfig[] {
  return [
    EFFECTS[0],
    ...EFFECTS.slice(1).sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
    ),
  ];
}
