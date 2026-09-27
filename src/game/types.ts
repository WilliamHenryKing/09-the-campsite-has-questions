// Shared shapes for cases, evidence and reconstructions. Pure data, no DOM.

export type CharacterId = "gus" | "marge" | "pip";

/** A clue proves exactly one relationship: an order between two events, or the explanation. */
export type Constraint =
  | { kind: "before"; first: string; after: string }
  | { kind: "explanation"; id: string };

export interface CaseEvent {
  id: string;
  label: string;
}

export interface Explanation {
  id: string;
  label: string;
}

export interface Clue {
  id: string;
  name: string;
  /** What the player sees in the inspect view, in one or two plain sentences. */
  fact: string;
  /** The short conclusion written on the incident board once found. */
  note: string;
  constraint: Constraint;
}

export interface Statement {
  character: CharacterId;
  text: string;
  /** Unreliable statements are stamped once the clue that disproves them is found. */
  contradictedBy?: string;
}

export interface CaseDef {
  id: string;
  number: number;
  title: string;
  time: "afternoon" | "rain" | "dawn";
  complaint: string;
  reportedBy: CharacterId;
  events: CaseEvent[];
  explanations: Explanation[];
  clues: Clue[];
  statements: Statement[];
  truth: Reconstruction;
  /** One line for the closing report. */
  verdict: string;
}

export interface Reconstruction {
  order: string[];
  explanation: string | null;
}

export type StepStatus = "supported" | "unverified" | "contradiction";

export interface StepResult {
  eventId: string;
  status: StepStatus;
  clueId?: string;
}

export interface Evaluation {
  steps: StepResult[];
  explanation: { status: StepStatus; clueId?: string };
  /** Index of the first failing beat: steps first, then the explanation (index = steps.length). */
  firstContradiction: number | null;
  fullySupported: boolean;
}
