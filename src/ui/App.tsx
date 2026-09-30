import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { sound } from "../audio/sound";
import { CASES } from "../game/cases";
import { isCorrect } from "../game/rules";
import { currentCase, initialState, reducer } from "../game/state";
import type { CharacterId } from "../game/types";
import { worldReady } from "../loader";
import { CampScene } from "../scene/CampScene";
import { type OpeningPhase, wantsTitle } from "../scene/opening";
import { createActionGate } from "./actionGate";
import { Board } from "./Board";
import { attachDrag } from "./dragInput";
import { createKeyOwnership, keyboardCommand } from "./keyboard";
import { MuteButton } from "./MuteButton";
import { Guide, Title } from "./Opening";
import { InspectPanel, IntroCard, TalkPanel } from "./Panels";
import { Replay } from "./Replay";
import { Finale, ReportCard } from "./Report";
import { Tags } from "./Tags";
import { useReplay } from "./useReplay";
import { useSoundscape } from "./useSoundscape";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const GUIDE_KEY = "campsite-guide-v1";
const initialGuide = () => {
  try {
    return localStorage.getItem(GUIDE_KEY) ? -1 : 0;
  } catch {
    return 0;
  }
};

export function App({ onFailure }: { onFailure: (error: unknown) => void }) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    wantsTitle ? initialState() : reducer(initialState(), { type: "begin" }),
  );
  const [opening, setOpening] = useState<OpeningPhase>(wantsTitle ? "title" : "done");
  const [guide, setGuide] = useState(initialGuide);
  const def = currentCase(state);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<CampScene | null>(null);
  const [ready, setReady] = useState(false);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [talking, setTalking] = useState<CharacterId | null>(null);
  const [board, setBoard] = useState(false);
  const [report, setReport] = useState<{ image: string | null } | null>(null);
  const { replay, run, clear } = useReplay(scene);
  const actions = useRef(createActionGate());
  const mounted = useRef(false);
  const dragInput = useRef<ReturnType<typeof attachDrag> | null>(null);
  const keyOwnership = useRef(createKeyOwnership());
  const focusFrame = useRef<number | null>(null);
  const live = useRef({ state, scene, ready, opening, replay, inspecting, talking, board, report });
  live.current = { state, scene, ready, opening, replay, inspecting, talking, board, report };
  const active = useCallback(
    () =>
      mounted.current && live.current.ready && live.current.opening === "done" && !document.hidden,
    [],
  );
  const canInvestigate = useCallback(
    () =>
      active() &&
      live.current.state.phase === "investigate" &&
      !live.current.replay &&
      !actions.current.pending,
    [active],
  );
  const canTurn = useCallback(
    () => canInvestigate() && !live.current.board && !live.current.talking,
    [canInvestigate],
  );
  useSoundscape(def.time, replay !== null || report !== null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    mounted.current = true;
    const gate = createActionGate();
    actions.current = gate;
    const fail = (error: unknown) => {
      if (!alive) return;
      alive = false;
      mounted.current = false;
      gate.dispose();
      dragInput.current?.clear();
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
      focusFrame.current = null;
      onFailure(error);
    };
    let s: CampScene;
    try {
      s = new CampScene(canvas, reducedMotion(), fail);
    } catch (error) {
      fail(error);
      return;
    }
    if (!alive) {
      s.dispose();
      return;
    }
    s.opening.onDone = () => {
      if (!alive) return;
      live.current.opening = "done";
      setOpening("done");
      dispatch({ type: "begin" });
    };
    s.onFirstFrame(() => {
      if (!alive) return;
      live.current.ready = true;
      setReady(true);
      worldReady();
    });
    const ro = new ResizeObserver(() => {
      if (!alive) return;
      try {
        s.resize();
      } catch (error) {
        fail(error);
      }
    });
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    setScene(s);
    return () => {
      alive = false;
      mounted.current = false;
      gate.dispose();
      dragInput.current?.clear();
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
      focusFrame.current = null;
      ro.disconnect();
      s.dispose();
    };
  }, [onFailure]);

  useEffect(() => {
    actions.current.cancel();
    clear();
    dragInput.current?.clear();
    scene?.setCase(def);
    setInspecting(null);
    setTalking(null);
    setBoard(false);
    setReport(null);
  }, [scene, def, clear]);

  useEffect(() => {
    scene?.inspect(inspecting);
  }, [scene, inspecting]);

  const openInspect = (id: string) => {
    if (!canInvestigate() || !def.clues.some((clue) => clue.id === id)) return;
    dragInput.current?.clear();
    live.current.talking = null;
    live.current.board = false;
    live.current.inspecting = id;
    setTalking(null);
    setBoard(false);
    setGuide((g) => (g === 0 ? 1 : g));
    sound.play("pickup");
    setInspecting(id);
    dispatch({ type: "inspect", clueId: id });
  };
  const openTalk = (id: CharacterId) => {
    if (!canInvestigate() || !def.statements.some((statement) => statement.character === id))
      return;
    dragInput.current?.clear();
    live.current.inspecting = null;
    live.current.talking = id;
    setInspecting(null);
    sound.play("talk");
    setTalking(id);
    setGuide((g) => (g === 2 ? 3 : g));
    dispatch({ type: "talk", character: id });
  };

  const test = async () => {
    if (!canInvestigate() || !live.current.board || !scene) return;
    const gate = actions.current;
    const ticket = gate.begin();
    if (ticket === null) return;
    dragInput.current?.clear();
    if (guide === 3) skipGuide();
    setBoard(false);
    sound.play("click");
    dispatch({ type: "tested" });
    try {
      await run(
        def,
        { order: [...state.order], explanation: state.explanation },
        [...state.found],
        "test",
      );
    } catch (error) {
      if (gate.current(ticket) && mounted.current) onFailure(error);
    } finally {
      gate.finish(ticket);
    }
  };

  const backToBoard = useCallback(() => {
    if (!mounted.current || live.current.state.phase !== "investigate") return;
    actions.current.cancel();
    dragInput.current?.clear();
    clear();
    scene?.showFound();
    live.current.board = true;
    live.current.replay = null;
    setBoard(true);
  }, [clear, scene]);

  const file = async () => {
    if (!active() || live.current.state.phase !== "investigate" || !state.explanation || !scene)
      return;
    if (live.current.replay && (!live.current.replay.done || live.current.replay.mode !== "test"))
      return;
    const gate = actions.current;
    const ticket = gate.begin();
    if (ticket === null) return;
    dragInput.current?.clear();
    const recon = { order: [...state.order], explanation: state.explanation };
    dispatch({ type: "file" });
    sound.play("stamp");
    if (!isCorrect(def, recon)) {
      sound.play("returned");
      clear();
      scene.showFound();
      setBoard(true);
      // Duplicate activation in this task is one filing, even before React commits.
      queueMicrotask(() => gate.finish(ticket));
      return;
    }
    live.current.state = { ...state, phase: "report" };
    setBoard(false);
    const all = def.clues.map((c) => c.id);
    try {
      const finished = await run(def, def.truth, all, "payoff");
      if (!finished || !gate.current(ticket) || !mounted.current) return;
      const image = scene.snapshot();
      if (!gate.current(ticket) || !mounted.current) return;
      setReport({ image });
      clear();
    } catch (error) {
      if (gate.current(ticket) && mounted.current) onFailure(error);
    } finally {
      gate.finish(ticket);
    }
  };

  const next = () => {
    if (!active() || live.current.state.phase !== "report" || !live.current.report) return;
    live.current.report = null;
    actions.current.cancel();
    dragInput.current?.clear();
    sound.play("click");
    setReport(null);
    dispatch({ type: "next" });
  };

  const investigating = state.phase === "investigate";
  const panelOpen = inspecting !== null || talking !== null || board;

  const skipGuide = () => {
    setGuide(-1);
    try {
      localStorage.setItem(GUIDE_KEY, "seen");
    } catch {
      /* Storage is optional. */
    }
    // Removing a focused help button must leave a usable camp control selected.
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      if (!canInvestigate()) return;
      const app = canvasRef.current?.closest(".app");
      const target = Array.from(
        app?.querySelectorAll<HTMLElement>(".sheet h2, .board h2, .tag-clue, .btn-board, .view") ??
          [],
      ).find(
        (element) => !element.closest("[hidden], [inert]") && element.style.visibility !== "hidden",
      );
      target?.focus({ preventScroll: true });
    });
  };
  const turn = useCallback(
    (x: number, y: number) => {
      if (!canTurn()) return;
      scene?.turn(x, y);
      if (inspecting) setGuide((g) => (g === 1 ? 2 : g));
    },
    [scene, inspecting, canTurn],
  );

  useEffect(() => {
    const keys = keyOwnership.current;
    const onKey = (e: KeyboardEvent) => {
      if (!canInvestigate()) return;
      const command = keyboardCommand(e, e.target);
      if (!command) return;
      if (command.kind === "close") {
        dragInput.current?.clear();
        keys.clear();
        live.current.inspecting = null;
        live.current.talking = null;
        live.current.board = false;
        setInspecting(null);
        setTalking(null);
        setBoard(false);
        return;
      }
      if (command.kind === "turn") {
        if (!canTurn() || !keys.accept(e)) return;
        e.preventDefault();
        turn(command.x, command.y);
      } else {
        dragInput.current?.clear();
        keys.clear();
        const wasOpen = live.current.board;
        live.current.inspecting = null;
        live.current.talking = null;
        live.current.board = !wasOpen;
        setInspecting(null);
        setTalking(null);
        sound.play(wasOpen ? "board-close" : "board-open");
        setBoard(!wasOpen);
      }
    };
    const onUp = (e: KeyboardEvent) => keys.release(e);
    const hidden = () => {
      if (document.hidden) keys.clear();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", keys.clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      keys.clear();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", keys.clear);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [canInvestigate, canTurn, turn]);

  useEffect(() => {
    keyOwnership.current.clear();
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    const binding = attachDrag(canvas, {
      active: canTurn,
      turn: (x, y) => {
        turn(x, y);
        if (live.current.inspecting) sound.play("turn", { volume: 0.5, gap: 0.25 });
      },
    });
    dragInput.current = binding;
    return () => {
      binding.detach();
      if (dragInput.current === binding) dragInput.current = null;
    };
  }, [scene, canTurn, turn]);

  useEffect(() => {
    keyOwnership.current.clear();
    if (!ready || opening !== "done" || !investigating || replay || board || talking) {
      dragInput.current?.clear();
    }
  }, [ready, opening, investigating, replay, board, talking]);

  const found = def.clues.filter((c) => state.found.includes(c.id)).length;
  const clue = def.clues.find((c) => c.id === inspecting);

  return (
    <main className={`app time-${def.time} ${inspecting ? "is-inspecting" : ""}`}>
      <div className="stage">
        <canvas
          ref={canvasRef}
          className="view"
          tabIndex={-1}
          inert={
            !ready || opening !== "done" || !investigating || !!replay || board || talking !== null
          }
          aria-label={
            inspecting
              ? "Evidence close-up. Drag or use the arrow keys to turn it."
              : `The campground: ${def.title}. Drag or use the arrow keys to look around.`
          }
        />
        {scene && ready && opening === "done" && investigating && (
          <Tags
            hidden={panelOpen || !!replay}
            scene={scene}
            def={def}
            found={state.found}
            heard={state.heard}
            onInspect={openInspect}
            onTalk={openTalk}
          />
        )}
      </div>

      {ready &&
        opening === "done" &&
        state.phase !== "intro" &&
        state.phase !== "finale" &&
        !report && (
          <header className="hud">
            <p className="hud-case">
              <span className="hud-no">No. {def.number}</span> {def.title}
            </p>
            <p className="hud-count" aria-live="polite">
              Evidence {found}/{def.clues.length} · Statements {state.heard.length}/
              {def.statements.length}
            </p>
          </header>
        )}

      {opening === "title" && (
        <Title
          def={def}
          ready={ready}
          onBegin={() => {
            if (!ready || !scene || live.current.opening !== "title") return;
            const calm = reducedMotion();
            sound.play("begin");
            live.current.opening = calm ? "done" : "glide";
            setOpening(live.current.opening);
            scene.opening.begin(calm);
          }}
        />
      )}
      {ready && opening === "done" && state.phase === "investigate" && !replay && guide >= 0 && (
        <Guide step={guide} panelOpen={panelOpen} onSkip={skipGuide} />
      )}
      {ready &&
        opening === "done" &&
        state.phase === "investigate" &&
        !replay &&
        !panelOpen &&
        guide < 0 && (
          <button
            className="guide-replay"
            type="button"
            aria-label="Replay the guide"
            onClick={() => {
              if (!canInvestigate()) return;
              dragInput.current?.clear();
              setInspecting(null);
              setTalking(null);
              setBoard(false);
              setGuide(0);
            }}
          >
            ?
          </button>
        )}

      {scene && !scene.webgl && (
        <p className="nogl">The 3D view needs WebGL; the tags and board still work.</p>
      )}

      {ready && opening === "done" && state.phase === "intro" && (
        <IntroCard
          def={def}
          onBegin={() => {
            if (!active() || live.current.state.phase !== "intro") return;
            live.current.state = { ...live.current.state, phase: "investigate" };
            sound.play("begin");
            dispatch({ type: "begin" });
          }}
        />
      )}

      {ready && opening === "done" && state.phase === "investigate" && !replay && !panelOpen && (
        <div className="dock">
          <button
            type="button"
            className="btn btn-primary btn-board"
            onClick={() => {
              if (!canInvestigate()) return;
              dragInput.current?.clear();
              live.current.board = true;
              sound.play("board-open");
              setBoard(true);
            }}
            aria-keyshortcuts="B"
          >
            Incident Board
          </button>
        </div>
      )}

      {clue && (
        <InspectPanel
          clue={clue}
          onTurn={(x, y) => {
            if (!canTurn()) return;
            sound.play("turn");
            turn(x, y);
          }}
          onClose={() => {
            dragInput.current?.clear();
            live.current.inspecting = null;
            sound.play("click");
            setInspecting(null);
          }}
        />
      )}
      {talking && (
        <TalkPanel
          def={def}
          who={talking}
          found={state.found}
          onClose={() => {
            live.current.talking = null;
            sound.play("click");
            setTalking(null);
          }}
        />
      )}
      {board && state.phase === "investigate" && (
        <Board
          def={def}
          state={state}
          onMove={(eventId, delta) => {
            if (!canInvestigate() || !live.current.board) return;
            sound.play("tick");
            dispatch({ type: "move", eventId, delta });
          }}
          onChoose={(explanation) => {
            if (!canInvestigate() || !live.current.board) return;
            sound.play("select");
            dispatch({ type: "choose", explanation });
          }}
          onTest={test}
          onFile={file}
          onClose={() => {
            live.current.board = false;
            sound.play("board-close");
            setBoard(false);
          }}
        />
      )}
      {replay && <Replay def={def} replay={replay} onBack={backToBoard} onFile={file} />}

      {state.phase === "report" && report && (
        <ReportCard
          def={def}
          image={report.image}
          acorns={state.results[state.caseIndex] ?? 1}
          returned={state.returned}
          isLast={state.caseIndex === CASES.length - 1}
          onNext={next}
        />
      )}
      {state.phase === "finale" && (
        <Finale
          results={state.results}
          onReplay={() => {
            if (!active() || live.current.state.phase !== "finale") return;
            actions.current.cancel();
            dragInput.current?.clear();
            live.current.state = { ...live.current.state, phase: "intro" };
            sound.play("begin");
            dispatch({ type: "restart" });
          }}
        />
      )}
      <MuteButton />
    </main>
  );
}
