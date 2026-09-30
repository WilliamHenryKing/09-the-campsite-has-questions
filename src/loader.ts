// The incident book stays closed until a real first frame is ready.
let revealed = false;
let failed = false;
let removeTimer = 0;
let slowTimer = 0;

function recovery(message: string, focus: boolean) {
  let veil = document.getElementById("arrival");
  if (!veil) {
    veil = document.createElement("div");
    veil.id = "arrival";
    document.body.append(veil);
  }
  veil.classList.remove("is-done");
  veil.setAttribute("role", "status");
  veil.setAttribute("aria-live", "polite");
  veil.innerHTML =
    '<div class="book"><p class="kicker">Campground incident book</p><p class="title"></p><button type="button">Reload</button></div>';
  const title = veil.querySelector(".title");
  if (title) title.textContent = message;
  const button = veil.querySelector("button");
  if (button) {
    button.style.cssText =
      "font:700 16px system-ui;padding:12px 20px;border:2px solid #2b2a33;border-radius:6px;background:#f7f0df;color:#2b2a33;cursor:pointer";
    button.onclick = () => location.reload();
    if (focus) button.focus();
  }
}

export function worldReady() {
  if (revealed || failed) return;
  revealed = true;
  clearTimeout(slowTimer);
  const root = document.getElementById("root");
  if (root) root.inert = false;
  document.querySelector<HTMLElement>(".opening-button")?.focus();
  const veil = document.getElementById("arrival");
  veil?.classList.add("is-done");
  removeTimer = window.setTimeout(() => veil?.remove(), 700);
}

export function worldFailed() {
  failed = true;
  clearTimeout(slowTimer);
  clearTimeout(removeTimer);
  recovery("The camp could not load. Please try again.", true);
}

slowTimer = window.setTimeout(() => {
  if (!revealed && !failed) recovery("Still unpacking the evidence…", false);
}, 30_000);
import.meta.hot?.dispose(() => {
  clearTimeout(slowTimer);
  clearTimeout(removeTimer);
});
