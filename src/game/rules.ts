import type { CaseDef, Clue, Evaluation, Reconstruction, StepResult, StepStatus } from "./types";

/** Every ordering of a list. Cases have three events, so this stays tiny. */
export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  const out: T[][] = [];
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([item, ...tail]);
  });
  return out;
}

function foundClues(def: CaseDef, found: readonly string[]): Clue[] {
  return def.clues.filter((c) => found.includes(c.id));
}

/**
 * Tests a reconstruction against the evidence the player has actually found.
 * An ordering clue that is violated shows up on the later of its two events, the moment
 * the replay makes the contradiction visible. Unfound clues never judge anything.
 */
export function evaluate(
  def: CaseDef,
  recon: Reconstruction,
  found: readonly string[],
): Evaluation {
  const clues = foundClues(def, found);
  const pos = new Map(recon.order.map((id, i) => [id, i]));
  const at = (id: string) => pos.get(id) ?? -1;

  const steps: StepResult[] = recon.order.map((eventId) => {
    let supportedBy: string | undefined;
    for (const clue of clues) {
      const c = clue.constraint;
      if (c.kind !== "before" || (c.first !== eventId && c.after !== eventId)) continue;
      const holds = at(c.first) < at(c.after);
      const later = at(c.first) > at(c.after) ? c.first : c.after;
      if (!holds && later === eventId) {
        return { eventId, status: "contradiction", clueId: clue.id };
      }
      if (holds) supportedBy ??= clue.id;
    }
    return supportedBy
      ? { eventId, status: "supported", clueId: supportedBy }
      : { eventId, status: "unverified" };
  });

  let explanation: { status: StepStatus; clueId?: string } = { status: "unverified" };
  const judge = clues.find((c) => c.constraint.kind === "explanation");
  if (judge && recon.explanation && judge.constraint.kind === "explanation") {
    explanation =
      judge.constraint.id === recon.explanation
        ? { status: "supported", clueId: judge.id }
        : { status: "contradiction", clueId: judge.id };
  }

  const stepFail = steps.findIndex((s) => s.status === "contradiction");
  const firstContradiction =
    stepFail >= 0 ? stepFail : explanation.status === "contradiction" ? steps.length : null;
  const fullySupported =
    steps.every((s) => s.status === "supported") && explanation.status === "supported";
  return { steps, explanation, firstContradiction, fullySupported };
}

export function isCorrect(def: CaseDef, recon: Reconstruction): boolean {
  return (
    recon.explanation === def.truth.explanation &&
    recon.order.length === def.truth.order.length &&
    recon.order.every((id, i) => id === def.truth.order[i])
  );
}

/** All reconstructions that survive every clue. A fair case has exactly one. */
export function consistentReconstructions(def: CaseDef): Reconstruction[] {
  const all = def.clues.map((c) => c.id);
  const out: Reconstruction[] = [];
  for (const order of permutations(def.events.map((e) => e.id))) {
    for (const ex of def.explanations) {
      const recon = { order, explanation: ex.id };
      if (evaluate(def, recon, all).firstContradiction === null) out.push(recon);
    }
  }
  return out;
}

/** The board opens in reverse order so the first arrangement is never the answer. */
export function initialOrder(def: CaseDef): string[] {
  return [...def.truth.order].reverse();
}

/** Three acorns for a clean filing, one fewer for each returned report, never below one. */
export function acornsFor(returned: number): number {
  return Math.max(1, 3 - returned);
}

export function moveEvent(order: readonly string[], eventId: string, delta: -1 | 1): string[] {
  const i = order.indexOf(eventId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= order.length) return order.slice();
  const next = order.slice();
  [next[i], next[j]] = [next[j] as string, next[i] as string];
  return next;
}
