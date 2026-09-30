interface DragHandlers {
  active: () => boolean;
  turn: (dx: number, dy: number) => void;
}

/** One owned contact turns the camp or evidence; transitions and cancellation release it. */
export function attachDrag(canvas: HTMLCanvasElement, handlers: DragHandlers) {
  let drag: { id: number; x: number; y: number } | null = null;
  let disposed = false;
  const clear = () => {
    const id = drag?.id;
    drag = null;
    if (id === undefined) return;
    try {
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    } catch {
      // A hidden page may have lost capture before its visibility event arrives.
    }
  };
  const down = (event: PointerEvent) => {
    if (disposed || !handlers.active() || drag || event.isPrimary === false || event.button !== 0)
      return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      clear();
      return;
    }
    canvas.focus({ preventScroll: true });
    event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    const owner = drag;
    if (!owner || event.pointerId !== owner.id) return;
    if (disposed || !handlers.active()) {
      clear();
      return;
    }
    const dx = event.clientX - owner.x;
    const dy = event.clientY - owner.y;
    if (dx || dy) handlers.turn(dx * 0.006, dy * 0.006);
    owner.x = event.clientX;
    owner.y = event.clientY;
    event.preventDefault();
  };
  const end = (event: PointerEvent) => {
    if (drag?.id === event.pointerId) clear();
  };
  const hidden = () => {
    if (document.hidden) clear();
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("lostpointercapture", end);
  window.addEventListener("blur", clear);
  window.addEventListener("resize", clear);
  document.addEventListener("visibilitychange", hidden);
  const detach = () => {
    if (disposed) return;
    disposed = true;
    clear();
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", end);
    canvas.removeEventListener("pointercancel", end);
    canvas.removeEventListener("lostpointercapture", end);
    window.removeEventListener("blur", clear);
    window.removeEventListener("resize", clear);
    document.removeEventListener("visibilitychange", hidden);
  };
  return { clear, detach };
}
