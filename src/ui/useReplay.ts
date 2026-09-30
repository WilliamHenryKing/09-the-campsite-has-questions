import { useCallback, useEffect, useRef, useState } from "react";
import { sound } from "../audio/sound";
import { evaluate } from "../game/rules";
import type { CaseDef, Evaluation, Reconstruction } from "../game/types";
import type { CampScene } from "../scene/CampScene";
import { replayDelay } from "./replayDelay";

export interface ReplayState {
  mode: "test" | "payoff";
  recon: Reconstruction;
  evaluation: Evaluation;
  /** Beats played so far; the explanation is beat index `order.length`. */
  shown: number;
  stoppedAt: number | null;
  done: boolean;
}

/**
 * Plays a reconstruction beat by beat in the scene and stops at the first beat that
 * disagrees with evidence the player has found.
 */
export function useReplay(scene: CampScene | null) {
  const [replay, setReplay] = useState<ReplayState | null>(null);
  const token = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      token.current++;
      controller.current?.abort();
      scene?.cancelPlayback();
    },
    [scene],
  );

  const run = useCallback(
    async (def: CaseDef, recon: Reconstruction, found: string[], mode: ReplayState["mode"]) => {
      if (!scene) return null;
      controller.current?.abort();
      const lifetime = new AbortController();
      controller.current = lifetime;
      const my = ++token.current;
      const evaluation = evaluate(def, recon, found);
      let state: ReplayState = { mode, recon, evaluation, shown: 0, stoppedAt: null, done: false };
      setReplay(state);
      scene.beginReconstruction({ mode, explanation: recon.explanation });
      if (!(await replayDelay(450, lifetime.signal))) return null;
      const beats = [...recon.order, recon.explanation ?? ""];
      for (let i = 0; i < beats.length; i++) {
        if (token.current !== my) return null;
        const beat = beats[i] as string;
        if (i < recon.order.length) await scene.playEvent(beat);
        else if (beat) await scene.playExplanation(beat);
        if (token.current !== my) return null;
        const failed = evaluation.firstContradiction === i;
        const clueId =
          i < recon.order.length ? evaluation.steps[i]?.clueId : evaluation.explanation.clueId;
        if (failed && clueId) scene.flag(clueId);
        if (beat) {
          const status =
            i < recon.order.length ? evaluation.steps[i]?.status : evaluation.explanation.status;
          sound.play(
            mode === "payoff" || status === "supported"
              ? "beat-ok"
              : status === "contradiction"
                ? "contradiction"
                : "beat-unproven",
          );
        }
        state = { ...state, shown: i + 1, stoppedAt: failed ? i : null, done: failed };
        setReplay(state);
        if (failed) return state;
        if (!(await replayDelay(250, lifetime.signal))) return null;
        if (token.current !== my) return null;
      }
      state = { ...state, done: true };
      setReplay(state);
      return state;
    },
    [scene],
  );

  const clear = useCallback(() => {
    token.current++;
    controller.current?.abort();
    scene?.cancelPlayback();
    setReplay(null);
  }, [scene]);

  return { replay, run, clear };
}
