import type { CSSProperties } from "react";
import "./seasonal.css";

const motifs = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  style: {
    "--motif-left": `${(index * 29 + 7) % 101}%`,
    "--motif-delay": `${-((index * 1.73) % 12)}s`,
    "--motif-duration": `${8 + (index % 5) * 1.35}s`,
    "--motif-size": `${0.55 + (index % 4) * 0.15}rem`,
  } as CSSProperties,
}));

export default function SeasonalEffect() {
  return (
    <div className="store-fx-seasonal" aria-hidden="true">
      {motifs.map((motif) => (
        <span key={motif.id} className="store-fx-motif" style={motif.style} />
      ))}
    </div>
  );
}
