// Find in the text of the work. Matches are painted with the CSS Custom
// Highlight API, so the poem's markup is never changed; a browser without
// it still gets the count and the jump to each match.

import { es } from "../i18n/es.ts";
import { matches } from "../lib/find.ts";

const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const poem = document.querySelector<HTMLElement>(".poem");
const panel = document.getElementById("find");
const opener = document.getElementById("find-open");
if (poem && panel && opener) setup(poem, panel, opener);

function setup(poem: HTMLElement, panel: HTMLElement, opener: HTMLElement) {
  const input = byId<HTMLInputElement>("find-input");
  const count = byId("find-count");
  const paints = "highlights" in CSS;
  let found: Range[] = [];
  let at = -1;

  /** The text of the verses: not their numbers, notes or buttons. */
  function* verseText() {
    for (const verse of poem.querySelectorAll(".verse")) {
      const walker = document.createTreeWalker(verse, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode())
        if (!node.parentElement?.closest(".vn, .nref")) yield node as Text;
    }
  }

  function search() {
    const query = input.value.trim();
    found = [];
    at = -1;
    if (query)
      for (const node of verseText())
        for (const start of matches(node.data, query)) {
          const range = new Range();
          range.setStart(node, start);
          range.setEnd(node, start + query.length);
          found.push(range);
        }
    if (paints) CSS.highlights.set("find", new Highlight(...found));
    step(1);
  }

  /** Moves to the next (1) or previous (-1) match, wrapping around. */
  function step(by: number) {
    if (!found.length) {
      if (paints) CSS.highlights.delete("find-current");
      count.textContent = input.value.trim() ? es.work.findNone : "";
      return;
    }
    at = (at + by + found.length) % found.length;
    const range = found[at] as Range;
    const verse = range.startContainer.parentElement?.closest(".verse");
    if (paints) CSS.highlights.set("find-current", new Highlight(range));
    verse?.scrollIntoView({ block: "center", behavior: "smooth" });
    count.textContent = es.work.findCount(
      at + 1,
      found.length,
      Number(verse?.id.slice(1)),
    );
  }

  function close() {
    panel.hidden = true;
    if (paints) {
      CSS.highlights.delete("find");
      CSS.highlights.delete("find-current");
    }
    opener.focus();
  }

  opener.addEventListener("click", () => {
    // Just under the site header, which stays at the top of the screen.
    const header = document.querySelector("[data-bar]");
    if (header)
      panel.style.top = `calc(${header.getBoundingClientRect().height}px + var(--s-2))`;
    panel.hidden = false;
    input.focus();
    input.select();
    if (input.value) search();
  });
  input.addEventListener("input", search);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") step(e.shiftKey ? -1 : 1);
    if (e.key === "Escape") close();
  });
  byId("find-prev").addEventListener("click", () => step(-1));
  byId("find-next").addEventListener("click", () => step(1));
  byId("find-close").addEventListener("click", close);
}
