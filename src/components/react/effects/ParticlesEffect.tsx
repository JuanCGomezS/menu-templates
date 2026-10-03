import "./particles.css";

const particles = [
  "particle--1",
  "particle--2",
  "particle--3",
  "particle--4",
  "particle--5",
  "particle--6",
  "particle--7",
  "particle--8",
  "particle--9",
  "particle--10",
  "particle--11",
  "particle--12",
  "particle--13",
  "particle--14",
  "particle--15",
  "particle--16",
  "particle--17",
  "particle--18",
  "particle--19",
  "particle--20",
  "particle--21",
  "particle--22",
  "particle--23",
  "particle--24",
] as const;

export default function ParticlesEffect() {
  return (
    <div className="store-fx-particles" aria-hidden="true">
      {particles.map((particle) => (
        <span key={particle} className={`store-fx-particle ${particle}`} />
      ))}
    </div>
  );
}
