import { useEffect, useRef } from "react";

/** Focuses a new panel and returns to its opener after the panel closes. */
export function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  // Capture before React hides the scene tags or removes the button that opened the panel.
  const opener = useRef(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  useEffect(() => {
    ref.current?.focus();
    const previous = opener.current;
    return () => {
      window.requestAnimationFrame(() => {
        // Another panel may already have taken focus in the same transition.
        const active = document.activeElement;
        if (active && active !== document.body && active.isConnected) return;
        const canReturn =
          previous &&
          previous !== document.body &&
          previous.isConnected &&
          !previous.closest("[hidden], [inert]");
        const target = canReturn
          ? previous
          : (document.querySelector<HTMLElement>(".btn-board") ??
            document.querySelector<HTMLElement>(".view"));
        target?.focus({ preventScroll: true });
      });
    };
  }, []);
  return ref;
}
