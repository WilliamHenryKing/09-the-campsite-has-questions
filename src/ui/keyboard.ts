const EDITING =
  "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox'], [role='slider'], [role='spinbutton'], [role='combobox']";

const asElement = (target: EventTarget | null) =>
  target && "closest" in target ? (target as Element) : null;

export function isEditingTarget(target: EventTarget | null) {
  return Boolean(asElement(target)?.closest(EDITING));
}

export interface KeyInput {
  key: string;
  code?: string;
  repeat?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  defaultPrevented?: boolean;
}

export function hasNativeKeyOwner(target: EventTarget | null) {
  return isEditingTarget(target) || Boolean(asElement(target)?.matches("[data-keyboard-scroll]"));
}

export function suppressRepeatedActivation(event: KeyInput, target: EventTarget | null) {
  return Boolean(
    event.repeat &&
      (event.key === " " || event.key === "Enter") &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !hasNativeKeyOwner(target),
  );
}

export type CampCommand =
  | { kind: "close" }
  | { kind: "board" }
  | { kind: "turn"; x: number; y: number };

/** A repeat received after blur or a panel transition is not a new physical press. */
export function createKeyOwnership() {
  const held = new Set<string>();
  return {
    accept(event: KeyInput) {
      const code = event.code || event.key;
      if (event.repeat && !held.has(code)) return false;
      held.add(code);
      return true;
    },
    release(event: KeyInput) {
      held.delete(event.code || event.key);
    },
    clear: () => held.clear(),
  };
}

export function keyboardCommand(event: KeyInput, target: EventTarget | null): CampCommand | null {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isEditingTarget(target)) {
    // Radio arrows remain native, while Escape still closes the incident board.
    return event.key === "Escape" &&
      asElement(target)?.closest("input[type='radio'], input[type='checkbox']")
      ? { kind: "close" }
      : null;
  }
  if (event.key === "Escape") return { kind: "close" };
  if (event.code === "KeyB" || event.key.toLowerCase() === "b") {
    return event.repeat ? null : { kind: "board" };
  }
  if (hasNativeKeyOwner(target)) return null;
  switch (event.key) {
    case "ArrowLeft":
      return { kind: "turn", x: -0.15, y: 0 };
    case "ArrowRight":
      return { kind: "turn", x: 0.15, y: 0 };
    case "ArrowUp":
      return { kind: "turn", x: 0, y: -0.15 };
    case "ArrowDown":
      return { kind: "turn", x: 0, y: 0.15 };
    default:
      return null;
  }
}
