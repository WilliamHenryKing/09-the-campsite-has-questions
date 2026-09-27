import type { CaseDef } from "../game/types";
import { useAutoFocus } from "./useAutoFocus";
import type { ReplayState } from "./useReplay";

interface Props {
  def: CaseDef;
  replay: ReplayState;
  onBack: () => void;
  onFile: () => void;
}

const STATUS = {
  supported: { mark: "✓", text: "backed by evidence" },
  unverified: { mark: "?", text: "no evidence either way yet" },
  contradiction: { mark: "✗", text: "contradiction" },
} as const;

/** Captions for the reconstruction as it plays: each beat, its evidence, and the verdict. */
export function Replay({ def, replay, onBack, onFile }: Props) {
  const { recon, evaluation, shown, stoppedAt, done, mode } = replay;
  const beats = [
    ...recon.order.map((id, i) => ({
      key: id,
      label: def.events.find((e) => e.id === id)?.label ?? id,
      result: evaluation.steps[i],
    })),
    ...(recon.explanation
      ? [
          {
            key: "why",
            label: def.explanations.find((e) => e.id === recon.explanation)?.label ?? "",
            result: evaluation.explanation,
          },
        ]
      : []),
  ];
  const failedClue =
    stoppedAt !== null
      ? def.clues.find((c) => c.id === beats[stoppedAt]?.result?.clueId)
      : undefined;
  const unverified = beats.filter((b) => b.result?.status === "unverified").length;

  return (
    <section className="paper strip" aria-labelledby="replay-title" aria-live="polite">
      <p className="form-kicker" id="replay-title">
        {mode === "payoff" ? "Official reconstruction" : "Testing your reconstruction"}
      </p>
      <ol className="beats">
        {beats.map((b, i) => {
          const state =
            i < shown
              ? mode === "payoff"
                ? "supported"
                : (b.result?.status ?? "unverified")
              : null;
          return (
            <li
              key={b.key}
              className={`beat ${i === shown && !done ? "is-now" : ""} ${state ? `is-${state}` : ""}`}
            >
              <span className="beat-mark" aria-hidden="true">
                {state ? STATUS[state].mark : i + 1}
              </span>
              <span>
                {b.label}
                {state && mode === "test" && (
                  <span className="sr-only"> ({STATUS[state].text})</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {done && mode === "test" && (
        <Outcome
          clueName={failedClue?.name}
          note={failedClue?.note}
          unverified={unverified}
          onBack={onBack}
          onFile={onFile}
          canFile={!!recon.explanation}
        />
      )}
    </section>
  );
}

interface OutcomeProps {
  clueName?: string;
  note?: string;
  unverified: number;
  canFile: boolean;
  onBack: () => void;
  onFile: () => void;
}

function Outcome({ clueName, note, unverified, canFile, onBack, onFile }: OutcomeProps) {
  const focus = useAutoFocus<HTMLButtonElement>();
  return (
    <div className="outcome">
      {clueName ? (
        <p className="stamp stamp-red">
          Contradiction · {clueName}: {note}
        </p>
      ) : unverified > 0 ? (
        <p className="stamp stamp-amber">
          Nothing you've found disagrees, but {unverified}{" "}
          {unverified === 1 ? "beat is" : "beats are"} unproven.
        </p>
      ) : (
        <p className="stamp stamp-green">Every beat is backed by evidence.</p>
      )}
      <div className="board-actions">
        <button type="button" className="btn" onClick={onBack} ref={focus}>
          Back to the board
        </button>
        {!clueName && canFile && (
          <button type="button" className="btn btn-primary" onClick={onFile}>
            File this report
          </button>
        )}
      </div>
    </div>
  );
}
