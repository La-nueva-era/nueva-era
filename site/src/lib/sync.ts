// Listening in step with the text: which stanza a moment of the song
// belongs to. A stanza's time is its `@t=` timestamp, in seconds; stanzas
// without one have `null` and are never the current stanza.

export type StanzaTimes = readonly (number | null)[];

/** Index of the stanza sounding at `seconds`: the last timed stanza, in
 *  reading order, that has already started. -1 before the first one. */
export function stanzaAt(times: StanzaTimes, seconds: number): number {
  let found = -1;
  times.forEach((t, i) => {
    if (t !== null && t <= seconds) found = i;
  });
  return found;
}

/** 75 → "1:15". */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
