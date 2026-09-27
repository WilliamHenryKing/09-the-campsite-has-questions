import { useEffect, useRef } from "react";

/** Moves keyboard focus to an element when a panel opens, so keyboard play never gets lost. */
export function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}
