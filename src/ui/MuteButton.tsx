import { useEffect, useState } from "react";
import { sound } from "../audio/sound";

/** Persistent sound toggle, always in the corner; M does the same. */
export function MuteButton() {
  const [muted, setMuted] = useState(sound.muted);
  useEffect(() => sound.onMute(setMuted), []);
  return (
    <button
      type="button"
      className="mute"
      onClick={() => sound.toggle()}
      aria-pressed={muted}
      aria-label={muted ? "Sound off. Turn sound on" : "Sound on. Turn sound off"}
      aria-keyshortcuts="M"
      title="Sound (M)"
    >
      <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
    </button>
  );
}
