import { describe, expect, test } from "bun:test";
import { CASES } from "../src/game/cases";
import {
  acornsFor,
  consistentReconstructions,
  evaluate,
  initialOrder,
  isCorrect,
  moveEvent,
  permutations,
} from "../src/game/rules";
import { type GameState, initialState, reducer } from "../src/game/state";
import type { CaseDef } from "../src/game/types";

const picnic = CASES[0] as CaseDef;

describe("case design is fair", () => {
  for (const def of CASES) {
    test(`${def.title}: three clues, two explanations, one surviving reconstruction`, () => {
      expect(def.clues).toHaveLength(3);
      expect(def.explanations).toHaveLength(2);
      const survivors = consistentReconstructions(def);
      expect(survivors).toHaveLength(1);
      expect(isCorrect(def, survivors[0] ?? { order: [], explanation: null })).toBe(true);
    });

    test(`${def.title}: no single clue is enough on its own`, () => {
      for (const clue of def.clues) {
        let alive = 0;
        for (const order of permutations(def.events.map((e) => e.id))) {
          for (const ex of def.explanations) {
            const ev = evaluate(def, { order, explanation: ex.id }, [clue.id]);
            if (ev.firstContradiction === null) alive++;
          }
        }
        expect(alive).toBeGreaterThan(1);
      }
    });

    test(`${def.title}: every unreliable statement is disproved by a real clue`, () => {
      const ids = def.clues.map((c) => c.id);
      for (const s of def.statements) {
        if (s.contradictedBy) expect(ids).toContain(s.contradictedBy);
      }
      expect(def.statements.some((s) => s.contradictedBy)).toBe(true);
    });

    test(`${def.title}: the board never opens on the answer`, () => {
      const opening = { order: initialOrder(def), explanation: def.truth.explanation };
      expect(isCorrect(def, opening)).toBe(false);
    });
  }
});

describe("evaluate", () => {
  test("clues the player has not found never judge the reconstruction", () => {
    const ev = evaluate(picnic, { order: ["basket", "chair", "nap"], explanation: "raccoon" }, []);
    expect(ev.firstContradiction).toBeNull();
    expect(ev.steps.every((s) => s.status === "unverified")).toBe(true);
    expect(ev.explanation.status).toBe("unverified");
    expect(ev.fullySupported).toBe(false);
  });

  test("a violated order shows on the later event, citing the clue", () => {
    const ev = evaluate(picnic, { order: ["basket", "chair", "nap"], explanation: null }, [
      "drips",
    ]);
    expect(ev.steps[0]).toEqual({ eventId: "basket", status: "unverified" });
    expect(ev.steps[1]).toEqual({ eventId: "chair", status: "contradiction", clueId: "drips" });
    expect(ev.firstContradiction).toBe(1);
  });

  test("the wrong explanation is contradicted after all steps", () => {
    const ev = evaluate(picnic, { order: ["nap", "chair", "basket"], explanation: "raccoon" }, [
      "book",
      "drips",
      "sunclock",
    ]);
    expect(ev.firstContradiction).toBe(3);
    expect(ev.explanation).toEqual({ status: "contradiction", clueId: "sunclock" });
  });

  test("the truth with every clue is fully supported", () => {
    const all = picnic.clues.map((c) => c.id);
    const ev = evaluate(picnic, picnic.truth, all);
    expect(ev.firstContradiction).toBeNull();
    expect(ev.fullySupported).toBe(true);
  });
});

describe("helpers", () => {
  test("permutations of three", () => {
    expect(permutations([1, 2, 3])).toHaveLength(6);
  });

  test("moveEvent swaps neighbours and ignores the edges", () => {
    expect(moveEvent(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveEvent(["a", "b", "c"], "a", -1)).toEqual(["a", "b", "c"]);
    expect(moveEvent(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
  });

  test("acorns fall with returned reports but never below one", () => {
    expect(acornsFor(0)).toBe(3);
    expect(acornsFor(1)).toBe(2);
    expect(acornsFor(5)).toBe(1);
  });
});

describe("game flow", () => {
  function solve(state: GameState): GameState {
    const def = CASES[state.caseIndex] as CaseDef;
    let s = reducer(state, { type: "begin" });
    for (const c of def.clues) s = reducer(s, { type: "inspect", clueId: c.id });
    def.truth.order.forEach((id, target) => {
      while (s.order.indexOf(id) > target) s = reducer(s, { type: "move", eventId: id, delta: -1 });
    });
    s = reducer(s, { type: "choose", explanation: def.truth.explanation as string });
    return reducer(s, { type: "file" });
  }

  test("a wrong filing is returned and costs an acorn", () => {
    let s = reducer(initialState(), { type: "begin" });
    s = reducer(s, { type: "choose", explanation: "raccoon" });
    s = reducer(s, { type: "file" });
    expect(s.phase).toBe("investigate");
    expect(s.lastFiling).toBe("returned");
    s = solve(s);
    expect(s.phase).toBe("report");
    expect(s.results).toEqual([2]);
  });

  test("inspecting is idempotent and ignores unknown clues", () => {
    let s = reducer(initialState(), { type: "inspect", clueId: "book" });
    s = reducer(s, { type: "inspect", clueId: "book" });
    s = reducer(s, { type: "inspect", clueId: "nonsense" });
    expect(s.found).toEqual(["book"]);
  });

  test("filing needs an explanation", () => {
    const s = reducer(reducer(initialState(), { type: "begin" }), { type: "file" });
    expect(s.returned).toBe(0);
    expect(s.phase).toBe("investigate");
  });

  test("three solved cases reach the finale, and replay starts over", () => {
    let s = initialState();
    for (let i = 0; i < CASES.length; i++) {
      s = solve(s);
      expect(s.phase).toBe("report");
      s = reducer(s, { type: "next" });
    }
    expect(s.phase).toBe("finale");
    expect(s.results).toEqual([3, 3, 3]);
    s = reducer(s, { type: "restart" });
    expect(s.caseIndex).toBe(0);
    expect(s.results).toEqual([]);
  });
});
