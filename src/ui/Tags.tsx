import { useEffect, useRef } from "react";
import { CAST } from "../game/cases";
import type { CaseDef, CharacterId } from "../game/types";
import type { CampScene } from "../scene/CampScene";

interface Props {
  scene: CampScene;
  def: CaseDef;
  found: string[];
  heard: CharacterId[];
  onInspect: (clueId: string) => void;
  onTalk: (c: CharacterId) => void;
}

/**
 * Evidence and camper tags pinned over the 3D scene. They are real buttons, so every clue
 * is reachable by Tab and never needs pixel hunting.
 */
export function Tags({ scene, def, found, heard, onInspect, onTalk }: Props) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(
    () =>
      scene.onAnchors((anchors) => {
        for (const a of anchors) {
          const el = refs.current.get(a.id);
          if (!el) continue;
          el.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -100%)`;
          el.style.visibility = a.onScreen ? "visible" : "hidden";
        }
      }),
    [scene],
  );

  const bind = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  };

  const talkers = def.statements.map((s) => s.character);

  return (
    <div className="tags">
      {def.clues.map((c) => {
        const seen = found.includes(c.id);
        return (
          <button
            key={c.id}
            ref={bind(c.id)}
            type="button"
            className={`tag tag-clue ${seen ? "is-seen" : ""}`}
            onClick={() => onInspect(c.id)}
            aria-label={`Inspect ${c.name}${seen ? " (examined)" : ""}`}
          >
            <span className="tag-mark" aria-hidden="true">
              {seen ? "✓" : "?"}
            </span>
            <span className="tag-label">{c.name}</span>
          </button>
        );
      })}
      {talkers.map((id) => (
        <button
          key={id}
          ref={bind(id)}
          type="button"
          className={`tag tag-talk ${heard.includes(id) ? "is-seen" : ""}`}
          onClick={() => onTalk(id)}
          aria-label={`Talk to ${CAST[id].name}`}
        >
          <span className="tag-mark" aria-hidden="true">
            “
          </span>
          <span className="tag-label">{CAST[id].name}</span>
        </button>
      ))}
    </div>
  );
}
