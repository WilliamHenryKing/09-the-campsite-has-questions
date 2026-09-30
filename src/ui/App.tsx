import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { sound } from "../audio/sound";
import { CASES } from "../game/cases";
import { isCorrect } from "../game/rules";
import { currentCase, initialState, reducer } from "../game/state";
import type { CharacterId } from "../game/types";
import { worldReady } from "../loader";
import { CampScene } from "../scene/CampScene";
import { type OpeningPhase, wantsTitle } from "../scene/opening";
import { Board } from "./Board";
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

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    wantsTitle ? initialState() : reducer(initialState(), { type: "begin" }),
  );
  const [opening, setOpening] = useState<OpeningPhase>(wantsTitle ? "title" : "done");
  const [guide, setGuide] = useState(initialGuide);
  const def = currentCase(state);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<CampScene | null>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [talking, setTalking] = useState<CharacterId | null>(null);
  const [board, setBoard] = useState(false);
  const [report, setReport] = useState<{ image: string | null } | null>(null);
  const { replay, run, clear } = useReplay(scene);
  useSoundscape(def.time, replay !== null || report !== null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = new CampScene(canvas, reducedMotion());
    s.opening.onDone = () => {
      setOpening("done");
      dispatch({ type: "begin" });
    };
    s.onFirstFrame(worldReady);
    const ro = new ResizeObserver(() => s.resize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    setScene(s);
    return () => {
      ro.disconnect();
      s.dispose();
    };
  }, []);

  useEffect(() => {
    scene?.setCase(def);
    setInspecting(null);
    setTalking(null);
    setBoard(false);
    setReport(null);
  }, [scene, def]);

  useEffect(() => {
    scene?.inspect(inspecting);
  }, [scene, inspecting]);

  const openInspect = (id: string) => {
    setTalking(null);
    setBoard(false);
    setGuide((g) => (g === 0 ? 1 : g));
    sound.play("pickup");
    setInspecting(id);
    dispatch({ type: "inspect", clueId: id });
  };
  const openTalk = (id: CharacterId) => {
    setInspecting(null);
    sound.play("talk");
    setTalking(id);
    setGuide((g) => (g === 2 ? 3 : g));
    dispatch({ type: "talk", character: id });
  };

  const test = async () => {
    if (guide === 3) skipGuide();
    setBoard(false);
    sound.play("click");
    dispatch({ type: "tested" });
    await run(def, { order: state.order, explanation: state.explanation }, state.found, "test");
  };

  const backToBoard = useCallback(() => {
    clear();
    scene?.showFound();
    setBoard(true);
  }, [clear, scene]);

  const file = async () => {
    const recon = { order: state.order, explanation: state.explanation };
    dispatch({ type: "file" });
    sound.play("stamp");
    if (!isCorrect(def, recon)) {
      sound.play("returned");
      backToBoard();
      return;
    }
    setBoard(false);
    const all = def.clues.map((c) => c.id);
    const finished = await run(def, def.truth, all, "payoff");
    if (!finished) return;
    setReport({ image: scene?.snapshot() ?? null });
    clear();
  };

  const next = () => {
    sound.play("click");
    setReport(null);
    dispatch({ type: "next" });
  };

  const investigating = state.phase === "investigate" || (state.phase === "report" && !report);
  const panelOpen = inspecting !== null || talking !== null || board;

  const skipGuide = () => {
    setGuide(-1);
    try {
      localStorage.setItem(GUIDE_KEY, "seen");
    } catch {
      /* Storage is optional. */
    }
  };
  const turn = useCallback(
    (x: number, y: number) => {
      scene?.turn(x, y);
      if (inspecting) setGuide((g) => (g === 1 ? 2 : g));
    },
    [scene, inspecting],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (opening !== "done" || !investigating || replay) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "Escape") {
        setInspecting(null);
        setTalking(null);
        setBoard(false);
        return;
      }
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !scene) return;
      const turns: Record<string, [number, number]> = {
        ArrowLeft: [-0.15, 0],
        ArrowRight: [0.15, 0],
        ArrowUp: [0, -0.15],
        ArrowDown: [0, 0.15],
      };
      const t = turns[e.key];
      if (t) {
        if (board || talking) return;
        e.preventDefault();
        turn(t[0], t[1]);
      } else if ((e.key === "b" || e.key === "B") && state.phase === "investigate" && !replay) {
        setInspecting(null);
        setTalking(null);
        setBoard((b) => {
          sound.play(b ? "board-close" : "board-open");
          return !b;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scene, state.phase, replay, opening, investigating, turn, board, talking]);

  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (
      opening !== "done" ||
      !investigating ||
      replay ||
      board ||
      talking ||
      e.target !== canvasRef.current
    )
      return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !scene) return;
    turn((e.clientX - d.x) * 0.006, (e.clientY - d.y) * 0.006);
    if (inspecting) sound.play("turn", { volume: 0.5, gap: 0.25 });
    d.x = e.clientX;
    d.y = e.clientY;
  };
  const endDrag = () => {
    drag.current = null;
  };

  const found = def.clues.filter((c) => state.found.includes(c.id)).length;
  const clue = def.clues.find((c) => c.id === inspecting);

  return (
    <main className={`app time-${def.time} ${inspecting ? "is-inspecting" : ""}`}>
      <div
        className="stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <canvas
          ref={canvasRef}
          className="view"
          tabIndex={-1}
          aria-label={
            inspecting
              ? "Evidence close-up. Drag or use the arrow keys to turn it."
              : `The campground: ${def.title}. Drag or use the arrow keys to look around.`
          }
        />
        {scene && opening === "done" && investigating && (
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

      {opening === "done" && state.phase !== "intro" && state.phase !== "finale" && !report && (
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
          onBegin={() => {
            if (!scene) return;
            sound.play("begin");
            setOpening(reducedMotion() ? "done" : "glide");
            scene.opening.begin(reducedMotion());
          }}
        />
      )}
      {opening === "done" && state.phase === "investigate" && !replay && guide >= 0 && (
        <Guide step={guide} panelOpen={panelOpen} onSkip={skipGuide} />
      )}
      {opening === "done" &&
        state.phase === "investigate" &&
        !replay &&
        !panelOpen &&
        guide < 0 && (
          <button
            className="guide-replay"
            type="button"
            aria-label="Replay the guide"
            onClick={() => {
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

      {opening === "done" && state.phase === "intro" && (
        <IntroCard
          def={def}
          onBegin={() => {
            sound.play("begin");
            dispatch({ type: "begin" });
          }}
        />
      )}

      {state.phase === "investigate" && !replay && !panelOpen && (
        <div className="dock">
          <button
            type="button"
            className="btn btn-primary btn-board"
            onClick={() => {
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
            sound.play("turn");
            turn(x, y);
          }}
          onClose={() => {
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
            sound.play("tick");
            dispatch({ type: "move", eventId, delta });
          }}
          onChoose={(explanation) => {
            sound.play("select");
            dispatch({ type: "choose", explanation });
          }}
          onTest={test}
          onFile={file}
          onClose={() => {
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
            sound.play("begin");
            dispatch({ type: "restart" });
          }}
        />
      )}
      <MuteButton />
    </main>
  );
}
