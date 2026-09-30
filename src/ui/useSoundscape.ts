import { useEffect } from "react";
import { type Ambience, type Sfx, sound } from "../audio/sound";
import { setCueHandler } from "../scene/cues";
import { isEditingTarget, suppressRepeatedActivation } from "./keyboard";

/**
 * Starts audio on the first gesture, routes scene cues to effects, follows the case's time
 * of day with its ambience, ducks the music when asked, and binds M to mute.
 */
export function useSoundscape(time: Ambience, ducked: boolean) {
  useEffect(() => {
    setCueHandler((name) => sound.play(name as Sfx, { gap: name === "step" ? 0.12 : 0.04 }));
    const unlock = () => {
      sound.unlock();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (suppressRepeatedActivation(e, e.target)) e.preventDefault();
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || isEditingTarget(e.target)) return;
      if (e.key.toLowerCase() === "m") sound.toggle();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("keydown", onKey);
      setCueHandler(() => {});
      sound.dispose();
    };
  }, []);

  useEffect(() => {
    sound.setAmbience(time);
  }, [time]);

  useEffect(() => {
    sound.duck(ducked);
  }, [ducked]);
}
