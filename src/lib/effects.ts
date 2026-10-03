export type EffectId =
  | "effect-none"
  | "effect-mist"
  | "effect-storm"
  | "effect-glass"
  | "effect-particles"
  | "effect-gel"
  | "effect-elastic";

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
    id: "effect-mist",
    name: "Niebla",
    description: "Bruma suave que se desplaza lentamente por los bordes.",
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
    name: "Partículas",
    description: "Partículas ligeras que flotan alrededor del catálogo.",
  },
  {
    id: "effect-gel",
    name: "Gel",
    description: "Gotas orgánicas que fluyen y cambian de forma.",
  },
  {
    id: "effect-elastic",
    name: "Elástico",
    description:
      "Cintas decorativas que se estiran y recuperan su forma sin mover los controles.",
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
