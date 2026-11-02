// Work page reading controls (SPEC §8): copy control, inline notes, selection
// menu, verse-range highlight. Dependency-free; the page works without it.

import { es } from "../i18n/es.ts";
import { verseRange } from "../lib/cite.ts";

const poem = document.querySelector<HTMLElement>(".poem");
const group = document.querySelector<HTMLElement>(".copygroup");
const citation = group?.dataset.cite ?? "";

/* Toast */
const toastEl = document.getElementById("toast");
let toastTimer: number | undefined;
function toast(text: string) {
  if (!toastEl) return;
  toastEl.textContent = text;
  toastEl.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("on"), 1900);
}

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast(es.work.toastFailed);
  }
}

const pageUrl = () => location.origin + location.pathname;

/** A verse's text as read: no number, no note markers. */
function verseText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll(".vn, .nref").forEach((n) => n.remove());
  return (clone.textContent ?? "").trim();
}

/* Copy control */
const more = document.getElementById("copy-more");
const menu = document.getElementById("copy-menu");
function setMenu(open: boolean) {
  if (!menu || !more) return;
  menu.hidden = !open;
  more.setAttribute("aria-expanded", String(open));
  if (open) menu.querySelector<HTMLElement>("[role=menuitem]")?.focus();
}
more?.addEventListener("click", (e) => {
  e.stopPropagation();
  setMenu(menu?.hidden === true);
});
menu?.addEventListener("keydown", (e) => {
  const items = [...menu.querySelectorAll<HTMLElement>("[role=menuitem]")];
  const i = items.indexOf(document.activeElement as HTMLElement);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    items[(i + step + items.length) % items.length]?.focus();
  } else if (e.key === "Escape") {
    setMenu(false);
    more?.focus();
  }
});
document.addEventListener("click", (e) => {
  if (!(e.target as Element).closest(".copygroup")) setMenu(false);
});

document.getElementById("copy-main")?.addEventListener("click", () => {
  if (!poem) return;
  const text = [...poem.querySelectorAll(".stanza")]
    .map((stanza) =>
      [...stanza.querySelectorAll(".verse, .label")]
        .map((l) =>
          l.classList.contains("label")
            ? `[${l.textContent?.trim()}]`
            : verseText(l),
        )
        .join("\n"),
    )
    .join("\n\n");
  void copy(`${text}\n\n— ${citation}.`, es.work.toastPoem);
});
document.getElementById("m-link")?.addEventListener("click", () => {
  void copy(pageUrl(), es.work.toastLink);
  setMenu(false);
});

/* Inline notes: the same notes as the list below, opened under the verse. */
function closeNotes() {
  document.querySelectorAll("aside.note-inline").forEach((n) => n.remove());
  document
    .querySelectorAll(".nref button")
    .forEach((b) => b.setAttribute("aria-expanded", "false"));
}
for (const btn of document.querySelectorAll<HTMLButtonElement>(
  ".nref button",
)) {
  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") === "true";
    closeNotes();
    if (open) return;
    const verse = btn.closest(".verse");
    const item = document.getElementById(btn.dataset.note ?? "");
    if (!verse || !item) return;
    const aside = document.createElement("aside");
    aside.className = "note-inline";
    const lead = document.createElement("span");
    lead.className = "lead";
    lead.textContent = item.querySelector(".nv")?.textContent ?? "";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.setAttribute("aria-label", es.work.noteClose);
    close.textContent = "×";
    close.addEventListener("click", () => {
      closeNotes();
      btn.focus();
    });
    aside.append(lead, item.querySelector(".nt")?.textContent ?? "", close);
    verse.after(aside);
    btn.setAttribute("aria-expanded", "true");
  });
}

/* Verse-range highlight: #vA-B highlights A..B and shows a clear chip. */
let chip: HTMLButtonElement | null = null;
function clearHighlight() {
  document
    .querySelectorAll(".verse.hl")
    .forEach((v) => v.classList.remove("hl"));
  chip?.remove();
  chip = null;
}
function applyHash() {
  clearHighlight();
  const m = /^#v(\d+)-(\d+)$/.exec(location.hash);
  if (!m) return;
  const [a, b] = [Number(m[1]), Number(m[2])].sort((x, y) => x - y) as [
    number,
    number,
  ];
  for (let i = a; i <= b; i++)
    document.getElementById(`v${i}`)?.classList.add("hl");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document
    .getElementById(`v${a}`)
    ?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip-clear";
  chip.textContent = es.work.clearHighlight(verseRange(a, b));
  chip.addEventListener("click", () => {
    clearHighlight();
    history.replaceState(null, "", location.pathname);
  });
  document.body.append(chip);
}
addEventListener("hashchange", applyHash);
applyHash();

/* Selection menu: works for mouse and for touch long-press selections. */
let selMenu: HTMLDivElement | null = null;
const closeSelMenu = () => {
  selMenu?.remove();
  selMenu = null;
};
const verseOf = (node: Node | null) =>
  (node instanceof Element ? node : node?.parentElement)?.closest<HTMLElement>(
    ".poem .verse",
  ) ?? null;

function menuButton(label: string, icon: string, onClick: () => void) {
  const b = document.createElement("button");
  b.type = "button";
  b.innerHTML = icon;
  b.append(label);
  b.addEventListener("click", onClick);
  return b;
}
const ICON_LINK =
  '<svg class="mi" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 10a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';
const ICON_COPY =
  '<svg class="mi" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';

/** The selected part of each verse lo..hi: one line per verse, a blank line between stanzas. */
function quotedText(range: Range, lo: number, hi: number): string {
  let out = "";
  let stanza: Element | null = null;
  for (let n = lo; n <= hi; n++) {
    const verse = document.getElementById(`v${n}`);
    if (!verse) continue;
    const part = document.createRange();
    part.selectNodeContents(verse);
    if (n === lo) part.setStart(range.startContainer, range.startOffset);
    if (n === hi) part.setEnd(range.endContainer, range.endOffset);
    const holder = document.createElement("p");
    holder.append(part.cloneContents());
    const text = verseText(holder);
    const here = verse.closest(".stanza");
    if (out !== "") out += here === stanza ? "\n" : "\n\n";
    out += text;
    stanza = here;
  }
  return out.trim();
}

function showSelMenu() {
  const sel = getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return closeSelMenu();
  const a = verseOf(sel.anchorNode);
  const b = verseOf(sel.focusNode);
  if (!a || !b) return closeSelMenu();
  const n1 = Number(a.id.slice(1));
  const n2 = Number(b.id.slice(1));
  const [lo, hi] = n1 <= n2 ? [n1, n2] : [n2, n1];
  const hash = lo === hi ? `#v${lo}` : `#v${lo}-${hi}`;
  const quote = quotedText(sel.getRangeAt(0), lo, hi);

  closeSelMenu();
  const menuEl = document.createElement("div");
  menuEl.className = "selmenu";
  menuEl.setAttribute("role", "menu");
  menuEl.append(
    menuButton(es.work.selQuoteLink, ICON_LINK, () => {
      void copy(pageUrl() + hash, es.work.toastQuoteLink);
      history.replaceState(null, "", hash);
      applyHash();
      closeSelMenu();
      getSelection()?.removeAllRanges();
    }),
    menuButton(es.work.selQuoteText, ICON_COPY, () => {
      void copy(
        `«${quote}»\n— ${citation}, ${verseRange(lo, hi)}.`,
        es.work.toastQuote,
      );
      closeSelMenu();
      getSelection()?.removeAllRanges();
    }),
  );
  const r = sel.getRangeAt(0).getBoundingClientRect();
  const half = 130;
  const x = Math.min(
    Math.max(r.left + r.width / 2 + scrollX, scrollX + half),
    scrollX + innerWidth - half,
  );
  menuEl.style.left = `${x}px`;
  menuEl.style.top = `${Math.max(r.top + scrollY, scrollY + 8)}px`;
  document.body.append(menuEl);
  selMenu = menuEl;
}

let selTimer: number | undefined;
document.addEventListener("selectionchange", () => {
  clearTimeout(selTimer);
  selTimer = window.setTimeout(() => {
    // Leave the menu alone while the pointer is still selecting or inside it.
    if (selMenu?.contains(document.activeElement)) return;
    showSelMenu();
  }, 250);
});
document.addEventListener("pointerdown", (e) => {
  if (!(e.target as Element).closest(".selmenu")) closeSelMenu();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSelMenu();
    closeNotes();
  }
});
