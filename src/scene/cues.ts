// Stages call cue() at moments that deserve a sound; the app decides what, if anything, plays.
// Cues are silenced while a reduced-motion replay jumps straight to its end state.

let handler: (name: string) => void = () => {};
let muted = false;

export function setCueHandler(fn: (name: string) => void) {
  handler = fn;
}

export function muteCues(on: boolean) {
  muted = on;
}

export function cue(name: string) {
  if (!muted) handler(name);
}
