import { CASES } from "./cases";
import { acornsFor, initialOrder, isCorrect, moveEvent } from "./rules";
import type { CaseDef, CharacterId } from "./types";

export type Phase = "intro" | "investigate" | "report" | "finale";

export interface GameState {
  caseIndex: number;
  phase: Phase;
  found: string[];
  heard: CharacterId[];
  order: string[];
  explanation: string | null;
  tests: number;
  returned: number;
  /** Acorns earned per closed case, in case order. */
  results: number[];
  lastFiling: "returned" | null;
}

export type Action =
  | { type: "begin" }
  | { type: "inspect"; clueId: string }
  | { type: "talk"; character: CharacterId }
  | { type: "move"; eventId: string; delta: -1 | 1 }
  | { type: "choose"; explanation: string }
  | { type: "tested" }
  | { type: "file" }
  | { type: "next" }
  | { type: "restart" };

export function currentCase(state: GameState): CaseDef {
  return CASES[state.caseIndex] ?? (CASES[0] as CaseDef);
}

function openCase(caseIndex: number, results: number[]): GameState {
  const def = CASES[caseIndex] ?? (CASES[0] as CaseDef);
  return {
    caseIndex,
    phase: "intro",
    found: [],
    heard: [],
    order: initialOrder(def),
    explanation: null,
    tests: 0,
    returned: 0,
    results,
    lastFiling: null,
  };
}

export function initialState(): GameState {
  return openCase(0, []);
}

export function reducer(state: GameState, action: Action): GameState {
  const def = currentCase(state);
  switch (action.type) {
    case "begin":
      return state.phase === "intro" ? { ...state, phase: "investigate" } : state;
    case "inspect":
      if (state.found.includes(action.clueId) || !def.clues.some((c) => c.id === action.clueId)) {
        return state;
      }
      return { ...state, found: [...state.found, action.clueId] };
    case "talk":
      return state.heard.includes(action.character)
        ? state
        : { ...state, heard: [...state.heard, action.character] };
    case "move":
      return {
        ...state,
        order: moveEvent(state.order, action.eventId, action.delta),
        lastFiling: null,
      };
    case "choose":
      if (!def.explanations.some((e) => e.id === action.explanation)) return state;
      return { ...state, explanation: action.explanation, lastFiling: null };
    case "tested":
      return { ...state, tests: state.tests + 1 };
    case "file": {
      if (state.phase !== "investigate" || state.explanation === null) return state;
      if (isCorrect(def, { order: state.order, explanation: state.explanation })) {
        return {
          ...state,
          phase: "report",
          results: [...state.results, acornsFor(state.returned)],
          lastFiling: null,
        };
      }
      return { ...state, returned: state.returned + 1, lastFiling: "returned" };
    }
    case "next":
      if (state.phase !== "report") return state;
      return state.caseIndex + 1 < CASES.length
        ? openCase(state.caseIndex + 1, state.results)
        : { ...state, phase: "finale" };
    case "restart":
      return initialState();
  }
}
