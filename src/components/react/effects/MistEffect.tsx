import "./mist.css";

const wisps = [
  "store-fx-mist__wisp--one",
  "store-fx-mist__wisp--two",
  "store-fx-mist__wisp--three",
  "store-fx-mist__wisp--four",
  "store-fx-mist__wisp--five",
] as const;

export default function MistEffect() {
  return (
    <div className="store-fx-mist" aria-hidden="true">
      {wisps.map((wisp) => (
        <span key={wisp} className={`store-fx-mist__wisp ${wisp}`} />
      ))}
    </div>
  );
}
