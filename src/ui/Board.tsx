import { CAST } from "../game/cases";
import { evaluate } from "../game/rules";
import type { GameState } from "../game/state";
import type { CaseDef } from "../game/types";
import { useAutoFocus } from "./useAutoFocus";

interface Props {
  def: CaseDef;
  state: GameState;
  onMove: (eventId: string, delta: -1 | 1) => void;
  onChoose: (id: string) => void;
  onTest: () => void;
  onFile: () => void;
  onClose: () => void;
}

/** Why the Committee sent a report back, phrased from what the player has already found. */
function returnReason(def: CaseDef, state: GameState): string {
  const ev = evaluate(def, { order: state.order, explanation: state.explanation }, state.found);
  const bad =
    ev.steps.find((s) => s.status === "contradiction")?.clueId ??
    (ev.explanation.status === "contradiction" ? ev.explanation.clueId : undefined);
  if (bad) {
    const clue = def.clues.find((c) => c.id === bad);
    return `It contradicts evidence you already hold: ${clue?.name ?? "a clue"}. Try testing it against the scene.`;
  }
  return "Parts of it aren't backed by any evidence yet. The Committee suggests finding the rest.";
}

export function Board({ def, state, onMove, onChoose, onTest, onFile, onClose }: Props) {
  const focus = useAutoFocus<HTMLHeadingElement>();
  const label = (id: string) => def.events.find((e) => e.id === id)?.label ?? id;
  const found = def.clues.filter((c) => state.found.includes(c.id));

  return (
    <section className="paper sheet board" aria-labelledby="board-title">
      <div className="sheet-head">
        <div>
          <p className="form-kicker">Form 7-C · Reconstruction of events</p>
          <h2 id="board-title" className="sheet-title" tabIndex={-1} ref={focus}>
            Incident Board
          </h2>
        </div>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={onClose}
          aria-label="Close the board"
        >
          ✕
        </button>
      </div>

      <h3 className="board-h">1 · What happened, in order</h3>
      <ol className="timeline">
        {state.order.map((id, i) => (
          <li key={id} className="event-card">
            <span className="event-n" aria-hidden="true">
              {i + 1}
            </span>
            <span className="event-label">{label(id)}</span>
            <span className="event-moves">
              <button
                type="button"
                className="btn btn-icon"
                disabled={i === 0}
                onClick={() => onMove(id, -1)}
                aria-label={`Move earlier: ${label(id)}`}
              >
                ▲
              </button>
              <button
                type="button"
                className="btn btn-icon"
                disabled={i === state.order.length - 1}
                onClick={() => onMove(id, 1)}
                aria-label={`Move later: ${label(id)}`}
              >
                ▼
              </button>
            </span>
          </li>
        ))}
      </ol>

      <fieldset className="explain">
        <legend className="board-h">2 · Who, and why</legend>
        {def.explanations.map((e) => (
          <label key={e.id} className={`choice ${state.explanation === e.id ? "is-on" : ""}`}>
            <input
              type="radio"
              name="explanation"
              value={e.id}
              checked={state.explanation === e.id}
              onChange={() => onChoose(e.id)}
            />
            <span>{e.label}</span>
          </label>
        ))}
      </fieldset>

      <h3 className="board-h">
        Evidence pinned ({found.length}/{def.clues.length})
      </h3>
      {found.length === 0 ? (
        <p className="small">Nothing pinned yet. Inspect the ? tags around camp.</p>
      ) : (
        <ul className="pins">
          {found.map((c) => (
            <li key={c.id}>
              <strong>{c.name}.</strong> {c.fact}
            </li>
          ))}
        </ul>
      )}
      {state.heard.length > 0 && (
        <ul className="pins pins-said">
          {def.statements
            .filter((s) => state.heard.includes(s.character))
            .map((s) => (
              <li key={s.character}>
                <strong>{CAST[s.character].name}:</strong> “{s.text}”
                {s.contradictedBy && state.found.includes(s.contradictedBy) && (
                  <span className="mini-stamp">doubtful</span>
                )}
              </li>
            ))}
        </ul>
      )}

      {state.lastFiling === "returned" && (
        <p className="returned" role="alert">
          <strong>Report returned by the Campground Committee.</strong> {returnReason(def, state)}
        </p>
      )}

      <div className="board-actions">
        <button type="button" className="btn" onClick={onTest}>
          Test against the scene
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onFile}
          disabled={!state.explanation}
        >
          File report
        </button>
      </div>
      {!state.explanation && <p className="small">Choose who and why before filing.</p>}
    </section>
  );
}
