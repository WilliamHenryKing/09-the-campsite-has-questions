/** Async UI completions belong to the action that started them, even after cancellation. */
export function createActionGate() {
  let generation = 0;
  let pending = false;
  let disposed = false;
  return {
    begin(): number | null {
      if (pending || disposed) return null;
      pending = true;
      return ++generation;
    },
    current(ticket: number) {
      return !disposed && ticket === generation;
    },
    finish(ticket: number) {
      if (!disposed && ticket === generation) pending = false;
    },
    cancel() {
      generation++;
      pending = false;
    },
    dispose() {
      disposed = true;
      generation++;
      pending = false;
    },
    get pending() {
      return pending;
    },
  };
}
