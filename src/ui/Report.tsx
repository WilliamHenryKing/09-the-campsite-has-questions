import { useEffect } from "react";
import { sound } from "../audio/sound";
import { CASES, CAST } from "../game/cases";
import type { CaseDef } from "../game/types";
import { useAutoFocus } from "./useAutoFocus";

function Acorns({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="acorns" role="img" aria-label={`${n} of ${of} acorns`}>
      {Array.from({ length: of }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative row
        <span key={i} className={i < n ? "acorn" : "acorn is-empty"} aria-hidden="true">
          ●
        </span>
      ))}
    </span>
  );
}

interface ReportProps {
  def: CaseDef;
  image: string | null;
  acorns: number;
  returned: number;
  isLast: boolean;
  onNext: () => void;
}

/** The illustrated incident report: the payoff for a closed case. */
export function ReportCard({ def, image, acorns, returned, isLast, onNext }: ReportProps) {
  const focus = useAutoFocus<HTMLHeadingElement>();
  useEffect(() => sound.play("jingle-closed"), []);
  const doubtful = def.statements.filter((s) => s.contradictedBy);
  return (
    <div className="veil">
      <article className="paper report" aria-labelledby="report-title">
        <p className="form-kicker">Incident Report No. {def.number}</p>
        <h1 id="report-title" className="form-title" ref={focus} tabIndex={-1} data-keyboard-scroll>
          {def.title}
        </h1>
        <p className="stamp stamp-green stamp-big" aria-hidden="true">
          Case closed
        </p>
        {image && (
          <img
            className="report-img"
            src={image}
            alt={`Illustration: the campground after ${def.title.toLowerCase()}`}
          />
        )}
        <ol className="report-seq">
          {def.truth.order.map((id) => (
            <li key={id}>{def.events.find((e) => e.id === id)?.label}</li>
          ))}
        </ol>
        <p className="finding">{def.verdict}</p>
        {doubtful.map((s) => (
          <p key={s.character} className="small">
            Witness note: {CAST[s.character].name}'s account was confident, detailed and wrong.
          </p>
        ))}
        <div className="report-foot">
          <Acorns n={acorns} />
          <span className="small">
            {returned === 0
              ? "Filed first time. The Committee is delighted."
              : `Returned ${returned}× before acceptance.`}
          </span>
        </div>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          {isLast ? "Close the season's log" : "Next incident"}
        </button>
      </article>
    </div>
  );
}

export function Finale({ results, onReplay }: { results: number[]; onReplay: () => void }) {
  const focus = useAutoFocus<HTMLHeadingElement>();
  useEffect(() => sound.play("jingle-finale"), []);
  const total = results.reduce((a, b) => a + b, 0);
  return (
    <div className="veil">
      <article className="paper report" aria-labelledby="finale-title">
        <p className="form-kicker">End of season</p>
        <h1 id="finale-title" className="form-title" ref={focus} tabIndex={-1} data-keyboard-scroll>
          The campsite has no further questions
        </h1>
        <ul className="season">
          {CASES.map((c, i) => (
            <li key={c.id}>
              <span>
                No. {c.number} · {c.title}
              </span>
              <Acorns n={results[i] ?? 0} />
            </li>
          ))}
        </ul>
        <p className="finding">
          {total} of {CASES.length * 3} acorns.{" "}
          {total === CASES.length * 3
            ? "Warden Gus has laminated your reports."
            : "Warden Gus has filed your reports under 'Mostly Correct'."}
        </p>
        <button type="button" className="btn btn-primary" onClick={onReplay}>
          Play again
        </button>
      </article>
    </div>
  );
}
