import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { CASES } from "../game/cases";
import { isCorrect } from "../game/rules";
import { currentCase, initialState, reducer } from "../game/state";
import type { CharacterId } from "../game/types";
import { worldReady } from "../loader";
import { CampScene } from "../scene/CampScene";
import { Board } from "./Board";
import { Hint, InspectPanel, IntroCard, TalkPanel } from "./Panels";
import { Replay } from "./Replay";
import { Finale, ReportCard } from "./Report";
import { Tags } from "./Tags";
import { useReplay } from "./useReplay";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const def = currentCase(state);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<CampScene | null>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [talking, setTalking] = useState<CharacterId | null>(null);
  const [board, setBoard] = useState(false);
  const [hint, setHint] = useState(true);
  const [report, setReport] = useState<{ image: string | null } | null>(null);
  const { replay, run, clear } = useReplay(scene);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = new CampScene(canvas, reducedMotion());
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
    setHint(false);
    setInspecting(id);
    dispatch({ type: "inspect", clueId: id });
  };
  const openTalk = (id: CharacterId) => {
    setInspecting(null);
    setTalking(id);
    dispatch({ type: "talk", character: id });
  };

  const test = async () => {
    setBoard(false);
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
    if (!isCorrect(def, recon)) {
      backToBoard();
      return;
    }
    setBoard(false);
    const all = def.clues.map((c) => c.id);
    await run(def, def.truth, all, "payoff");
    setReport({ image: scene?.snapshot() ?? null });
    clear();
  };

  const next = () => {
    setReport(null);
    dispatch({ type: "next" });
  };

  const investigating = state.phase === "investigate" || (state.phase === "report" && !report);
  const panelOpen = inspecting !== null || talking !== null || board;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "Escape") {
        setInspecting(null);
        setTalking(null);
        setBoard(false);
        return;
      }
      if (tag === "INPUT" || !scene) return;
      const turns: Record<string, [number, number]> = {
        ArrowLeft: [-0.15, 0],
        ArrowRight: [0.15, 0],
        ArrowUp: [0, -0.15],
        ArrowDown: [0, 0.15],
      };
      const t = turns[e.key];
      if (t) {
        e.preventDefault();
        scene.turn(t[0], t[1]);
      } else if ((e.key === "b" || e.key === "B") && state.phase === "investigate" && !replay) {
        setInspecting(null);
        setTalking(null);
        setBoard((b) => !b);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scene, state.phase, replay]);

  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target !== canvasRef.current) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !scene) return;
    scene.turn((e.clientX - d.x) * 0.006, (e.clientY - d.y) * 0.006);
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
        {scene && investigating && !replay && !inspecting && (
          <Tags
            scene={scene}
            def={def}
            found={state.found}
            heard={state.heard}
            onInspect={openInspect}
            onTalk={openTalk}
          />
        )}
      </div>

      {state.phase !== "intro" && state.phase !== "finale" && !report && (
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

      {scene && !scene.webgl && (
        <p className="nogl">The 3D view needs WebGL; the tags and board still work.</p>
      )}

      {state.phase === "intro" && (
        <IntroCard def={def} onBegin={() => dispatch({ type: "begin" })} />
      )}

      {state.phase === "investigate" && !replay && !panelOpen && (
        <div className="dock">
          {state.caseIndex === 0 && hint && <Hint onClose={() => setHint(false)} />}
          <button
            type="button"
            className="btn btn-primary btn-board"
            onClick={() => setBoard(true)}
            aria-keyshortcuts="B"
          >
            Incident Board
          </button>
        </div>
      )}

      {clue && (
        <InspectPanel
          clue={clue}
          onTurn={(x, y) => scene?.turn(x, y)}
          onClose={() => setInspecting(null)}
        />
      )}
      {talking && (
        <TalkPanel def={def} who={talking} found={state.found} onClose={() => setTalking(null)} />
      )}
      {board && state.phase === "investigate" && (
        <Board
          def={def}
          state={state}
          onMove={(eventId, delta) => dispatch({ type: "move", eventId, delta })}
          onChoose={(explanation) => dispatch({ type: "choose", explanation })}
          onTest={test}
          onFile={file}
          onClose={() => setBoard(false)}
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
        <Finale results={state.results} onReplay={() => dispatch({ type: "restart" })} />
      )}
    </main>
  );
}
