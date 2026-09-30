import { CAST } from "../game/cases";
import type { CaseDef, CharacterId, Clue } from "../game/types";
import { useAutoFocus } from "./useAutoFocus";

export function IntroCard({ def, onBegin }: { def: CaseDef; onBegin: () => void }) {
  const focus = useAutoFocus<HTMLButtonElement>();
  return (
    <div className="veil">
      <section className="paper intro" aria-labelledby="intro-title">
        <p className="form-kicker">Campground Incident Form No. {def.number}</p>
        <h1 id="intro-title" className="form-title">
          {def.title}
        </h1>
        <dl className="form-fields">
          <dt>Reported by</dt>
          <dd>{CAST[def.reportedBy].name}</dd>
          <dt>Complaint</dt>
          <dd className="typed">{def.complaint}</dd>
        </dl>
        <p className="small">
          Find three pieces of evidence, hear the campers out, then test your reconstruction against
          the scene.
        </p>
        <button type="button" className="btn btn-primary" onClick={onBegin} ref={focus}>
          Begin investigation
        </button>
      </section>
    </div>
  );
}

export function Hint({ onClose }: { onClose: () => void }) {
  return (
    <aside className="hint" aria-label="How to play">
      <p>
        <strong>Tap a ? tag</strong> to pick up evidence and drag to turn it.{" "}
        <strong>Tap a camper</strong> to hear them out. Drag the camp (or use the arrow keys) to
        look around. When you have a theory, open the <strong>Incident Board</strong>.
      </p>
      <button type="button" className="btn btn-quiet" onClick={onClose}>
        Got it
      </button>
    </aside>
  );
}

interface InspectProps {
  clue: Clue;
  onTurn: (dx: number, dy: number) => void;
  onClose: () => void;
}

export function InspectPanel({ clue, onTurn, onClose }: InspectProps) {
  const step = 0.4;
  const focus = useAutoFocus<HTMLHeadingElement>();
  return (
    <section className="paper sheet inspect" aria-labelledby="inspect-title">
      <p className="form-kicker">Evidence</p>
      <h2 id="inspect-title" className="sheet-title" tabIndex={-1} ref={focus}>
        {clue.name}
      </h2>
      <p className="fact">{clue.fact}</p>
      <fieldset className="turns" aria-label="Turn the evidence">
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => onTurn(-step, 0)}
          aria-label="Turn left"
        >
          ◀
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => onTurn(0, -step)}
          aria-label="Tilt up"
        >
          ▲
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => onTurn(0, step)}
          aria-label="Tilt down"
        >
          ▼
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => onTurn(step, 0)}
          aria-label="Turn right"
        >
          ▶
        </button>
        <span className="small">or drag it</span>
      </fieldset>
      <button type="button" className="btn btn-primary" onClick={onClose}>
        Back to camp
      </button>
    </section>
  );
}

interface TalkProps {
  def: CaseDef;
  who: CharacterId;
  found: string[];
  onClose: () => void;
}

export function TalkPanel({ def, who, found, onClose }: TalkProps) {
  const focus = useAutoFocus<HTMLHeadingElement>();
  const s = def.statements.find((x) => x.character === who);
  if (!s) return null;
  const disproof =
    s.contradictedBy && found.includes(s.contradictedBy)
      ? def.clues.find((c) => c.id === s.contradictedBy)
      : undefined;
  return (
    <section className="paper sheet talk" aria-labelledby="talk-title">
      <p className="form-kicker">Statement</p>
      <h2 id="talk-title" className="sheet-title" tabIndex={-1} ref={focus}>
        {CAST[who].name} <span className="role">· {CAST[who].role}</span>
      </h2>
      <blockquote className={`bubble who-${who}`}>{s.text}</blockquote>
      {disproof && (
        <p className="stamp stamp-red" role="note">
          Doubtful: see {disproof.name}
        </p>
      )}
      <button type="button" className="btn btn-primary" onClick={onClose}>
        Thank you
      </button>
    </section>
  );
}
