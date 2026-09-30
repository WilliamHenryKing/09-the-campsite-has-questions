import { useEffect, useRef } from "react";
import type { CaseDef } from "../game/types";
import "./opening.css";

export function Title({ def, onBegin }: { def: CaseDef; onBegin: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  return (
    <section className="opening" aria-labelledby="opening-title">
      <div className="opening-copy">
        <p className="rise opening-eyebrow">Department of minor incidents · Casebook 09</p>
        <h1 className="rise" id="opening-title">
          The campsite
          <br />
          has <em>questions.</em>
        </h1>
        <p className="rise opening-premise">
          Three campers. Three tall tales.
          <br />
          The evidence would like a word.
        </p>
        <p className="rise opening-incident">
          <strong>First incident · {def.title}</strong>
          <br />
          {def.complaint}
        </p>
        <div className="rise">
          <button ref={button} type="button" className="opening-button" onClick={onBegin}>
            Open the casebook
          </button>
          <span className="enter-note">or press Enter</span>
        </div>
      </div>
    </section>
  );
}

export function Guide({
  step,
  panelOpen,
  onSkip,
}: {
  step: number;
  panelOpen: boolean;
  onSkip: () => void;
}) {
  const steps = [
    [
      "Look for the little things",
      "Select a ? evidence tag in the camp. Every object has a fact the campers may have overlooked.",
    ],
    [
      "Turn it over",
      "Drag the evidence, use the arrow keys, or tap a turn button. Read its fact, then return to camp.",
    ],
    [
      "Hear their side",
      "Back to camp, then select a camper's speech tag. Statements tell you what they believe; the evidence tells you what happened.",
    ],
    [
      "Put the story to the test",
      "Open the Incident Board (B). Move the events into order, choose a reason, then test against the scene. A contradiction is a useful clue.",
    ],
  ];
  return (
    <aside
      className={`case-guide ${panelOpen ? "is-panel-open" : ""}`}
      aria-label="Investigation guide"
      aria-live="polite"
    >
      <p className="opening-eyebrow">
        {step + 1}/4 · {steps[step]?.[0]}
      </p>
      <p>{steps[step]?.[1]}</p>
      <div className="guide-foot">
        <span aria-hidden="true">{steps.map((_, i) => (i === step ? "● " : "○ "))}</span>
        <button type="button" onClick={onSkip}>
          Skip the guide
        </button>
      </div>
    </aside>
  );
}
