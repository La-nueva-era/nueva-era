// Work page player. Loads YouTube's player only when the reader presses
// play, then keeps it within reach while they read: a bar with a timeline,
// and the video itself floating as a mini video that can be dragged around.
// In works whose stanzas carry timestamps it also marks the stanza that is
// sounding and lets the reader start the song from any of them.

import { es } from "../i18n/es.ts";
import { formatTime, stanzaAt, type StanzaTimes } from "../lib/sync.ts";

/* The parts of YouTube's IFrame Player API used here. */
interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getIframe(): HTMLIFrameElement;
}
interface YouTubeApi {
  Player: new (
    host: HTMLElement,
    options: {
      host: string;
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, number>;
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
}
declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}
const PLAYING = 1;

/** Decides each stanza's time from the timestamps written in the work. */
export type TimeSource = (authored: StanzaTimes) => StanzaTimes;

let timeSource: TimeSource = (authored) => authored;
let refreshTimes = () => {};
let readTime = (): number | null => null;

/** Replaces where stanza times come from (the dev timing tool does). */
export function useTimes(source: TimeSource) {
  timeSource = source;
  refreshTimes();
}

/** Seconds into the song, or null while there is no player. */
export function currentTime(): number | null {
  return readTime();
}

const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

function loadApi(): Promise<YouTubeApi> {
  return new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT as YouTubeApi);
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = reject;
    document.head.append(script);
  });
}

/** The plain embed, for when YouTube's script cannot be loaded (a content
 *  blocker, say): the video still plays, without the bar or the sync. */
function plainEmbed(id: string, title: string, startAt: number) {
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&start=${Math.floor(startAt)}`;
  iframe.title = title;
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.allowFullscreen = true;
  return iframe;
}

function label(button: HTMLElement, text: string) {
  button.title = text;
  button.setAttribute("aria-label", text);
}

function setup(video: HTMLElement) {
  const slot = video.parentElement as HTMLElement;
  const back = byId<HTMLButtonElement>("video-back");
  const handle = byId("video-handle");
  const bar = byId("player-bar");
  const tab = byId<HTMLButtonElement>("player-tab");
  const playBtn = byId<HTMLButtonElement>("player-play");
  const timeEl = byId("player-time");
  const durationEl = byId("player-duration");
  const range = byId<HTMLInputElement>("player-range");
  const ticks = byId("player-ticks");
  const hereBtn = byId<HTMLButtonElement>("player-here");
  const videoBtn = byId<HTMLButtonElement>("player-video");
  const seekTemplate = byId<HTMLTemplateElement>("seek-tpl");
  const stanzas = [...document.querySelectorAll<HTMLElement>(".poem .stanza")];
  const authored: StanzaTimes = stanzas.map((s) =>
    s.dataset.t === undefined ? null : Number(s.dataset.t),
  );

  let player: YouTubePlayer | undefined;
  let requested = false; // play was pressed; the player may still be loading
  let started = false; // the song has played at least once
  let playing = false;
  let duration = 0;
  let scrubbing = false;
  let barHidden = false;
  // The video floats once its slot scrolls away, unless the reader hid it.
  // Never on phones: it would cover the text, and the bar is enough there.
  const phone = matchMedia("(max-width: 640px)");
  let wantsFloat = true;
  let floating = false;
  let slotVisible = true;
  let times: StanzaTimes = authored;
  let current = -1;
  const seekButtons: (HTMLButtonElement | undefined)[] = [];

  /* Player */
  async function load(startAt: number) {
    if (requested) return;
    requested = true;
    const host = document.createElement("div");
    video.querySelector(".thumb")?.remove();
    video.querySelector(".go")?.remove();
    video.prepend(host);
    const id = video.dataset.video ?? "";
    const title = video.dataset.title ?? "";
    let api: YouTubeApi;
    try {
      api = await loadApi();
    } catch {
      host.replaceWith(plainEmbed(id, title, startAt));
      return;
    }
    const created = new api.Player(host, {
      host: "https://www.youtube-nocookie.com",
      videoId: id,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        rel: 0,
        start: Math.floor(startAt),
      },
      events: {
        onReady: () => {
          player = created;
          created.getIframe().title = title;
          window.setInterval(tick, 250);
          // A stanza chosen while the player was still loading.
          if (pending !== null) seek(pending);
          pending = null;
        },
        onStateChange: ({ data }) => {
          playing = data === PLAYING;
          if (playing) started = true;
          floatIfAway();
          render();
        },
      },
    });
  }

  let pending: number | null = null;
  function seek(seconds: number) {
    if (requested && !player) return void (pending = seconds);
    if (!player) return void load(seconds);
    player.seekTo(seconds, true);
    player.playVideo();
  }

  /* What is on screen */
  function floatIfAway() {
    if (started && wantsFloat && !slotVisible && !phone.matches)
      floating = true;
  }

  /** Room the bar takes at the bottom of the screen. Asked of the state,
   *  not the layout: while it slides out the bar still has its height. */
  const barHeight = () => (bar.hidden ? 0 : bar.offsetHeight);

  function render() {
    bar.hidden = !started || barHidden;
    tab.hidden = !started || !barHidden;
    bar.dataset.state = playing ? "playing" : "paused";
    label(playBtn, playing ? es.work.playerPause : es.work.playerPlay);
    label(
      videoBtn,
      floating ? es.work.playerHideVideo : es.work.playerShowVideo,
    );
    // The page's own floating controls move up to clear the bar.
    document.documentElement.style.setProperty(
      "--player-bar",
      `${barHeight()}px`,
    );

    video.classList.toggle("mini", floating);
    handle.hidden = !floating;
    back.hidden = !floating;
    slot.style.backgroundImage = floating
      ? `url(https://i.ytimg.com/vi/${video.dataset.video}/hqdefault.jpg)`
      : "";
    if (floating) place();
    else video.style.left = video.style.top = "";
  }

  function tick() {
    if (!player) return;
    const seconds = player.getCurrentTime() || 0;
    const total = player.getDuration() || 0;
    if (total !== duration) {
      duration = total;
      durationEl.textContent = formatTime(total);
      renderTimes();
    }
    if (!scrubbing) {
      timeEl.textContent = formatTime(seconds);
      setRange(total ? seconds / total : 0);
    }
    const sounding = stanzaAt(times, seconds);
    if (sounding === current) return;
    stanzas[current]?.classList.remove("now");
    stanzas[sounding]?.classList.add("now");
    current = sounding;
  }

  function setRange(fraction: number) {
    range.value = String(fraction * 1000);
    range.setAttribute("aria-valuetext", formatTime(fraction * duration));
    range.style.setProperty("--played", `${fraction * 100}%`);
  }

  /* Stanza times: a "listen from here" button per timed stanza, and a
     tick on the timeline. */
  function renderTimes() {
    times = timeSource(authored);
    stanzas.forEach((stanza, i) => {
      const t = times[i];
      let button = seekButtons[i];
      if (t === null || t === undefined) {
        if (button) button.hidden = true;
        return;
      }
      if (!button) {
        button = seekTemplate.content.firstElementChild?.cloneNode(
          true,
        ) as HTMLButtonElement;
        button.addEventListener("click", () => {
          const at = times[i];
          if (at !== null && at !== undefined) seek(at);
        });
        stanza.append(button);
        seekButtons[i] = button;
      }
      button.hidden = false;
      label(button, es.work.listenFrom(formatTime(t)));
    });
    hereBtn.hidden = !times.some((t) => t !== null);
    ticks.replaceChildren(
      ...times.flatMap((t) => {
        if (t === null || !duration || t > duration) return [];
        const tick = document.createElement("i");
        tick.style.left = `${(t / duration) * 100}%`;
        return [tick];
      }),
    );
    current = -1;
    for (const stanza of stanzas) stanza.classList.remove("now");
  }

  /* Floating video: it stays wherever it is dropped; only a position partly
     off screen, or behind the bar, is corrected. */
  const EDGE = 12;
  const POSITION_KEY = "player-position";

  function clamp(left: number, top: number): [number, number] {
    const box = video.getBoundingClientRect();
    const floor = window.innerHeight - barHeight() - EDGE;
    return [
      Math.max(EDGE, Math.min(left, window.innerWidth - box.width - EDGE)),
      Math.max(EDGE + handle.offsetHeight, Math.min(top, floor - box.height)),
    ];
  }

  function moveTo(left: number, top: number) {
    video.style.left = `${left}px`;
    video.style.top = `${top}px`;
  }

  function place() {
    let saved: { left: number; top: number } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(POSITION_KEY) ?? "null");
    } catch {
      // No storage, or nothing readable in it: the default corner.
    }
    // By default the bottom right corner, above the reading preferences.
    const prefs = document.querySelector(".prefs-btn")?.getBoundingClientRect();
    const box = video.getBoundingClientRect();
    moveTo(
      ...clamp(
        saved?.left ?? Infinity,
        saved?.top ?? (prefs ? prefs.top - EDGE - box.height : Infinity),
      ),
    );
  }

  let drag: { x: number; y: number } | null = null;
  handle.addEventListener("pointerdown", (e) => {
    if ((e.target as Element).closest("button")) return;
    drag = { x: e.clientX, y: e.clientY };
    handle.setPointerCapture(e.pointerId);
    video.classList.add("dragging");
  });
  handle.addEventListener("pointermove", (e) => {
    if (!drag) return;
    video.style.transform = `translate(${e.clientX - drag.x}px, ${e.clientY - drag.y}px)`;
  });
  function drop() {
    if (!drag) return;
    drag = null;
    const dropped = video.getBoundingClientRect();
    video.style.transform = "";
    const [left, top] = clamp(dropped.left, dropped.top);
    moveTo(left, top);
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify({ left, top }));
    } catch {
      // Without storage the position lasts for this visit only.
    }
    // If the drop was corrected, slide from where it was let go.
    video.style.transform = `translate(${dropped.left - left}px, ${dropped.top - top}px)`;
    void video.offsetWidth;
    video.classList.remove("dragging");
    video.style.transform = "";
  }
  handle.addEventListener("pointerup", drop);
  handle.addEventListener("pointercancel", drop);
  window.addEventListener("resize", () => {
    if (floating) place();
  });
  phone.addEventListener("change", () => {
    if (phone.matches) floating = false;
    render();
  });

  /* Controls */
  video.querySelector(".go")?.addEventListener("click", () => void load(0));
  function toggle() {
    if (playing) player?.pauseVideo();
    else player?.playVideo();
  }
  playBtn.addEventListener("click", toggle);
  // Space plays and pauses once the song has started; until then, and
  // inside any control that uses the key itself, it keeps its usual job.
  document.addEventListener("keydown", (e) => {
    if (e.key !== " " || e.repeat || !started) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const control =
      "input, textarea, select, button, a, summary, [contenteditable]";
    if ((e.target as Element).closest(control)) return;
    e.preventDefault();
    toggle();
  });
  range.addEventListener("input", () => {
    scrubbing = true;
    const fraction = Number(range.value) / 1000;
    timeEl.textContent = formatTime(fraction * duration);
    range.style.setProperty("--played", `${fraction * 100}%`);
  });
  range.addEventListener("change", () => {
    scrubbing = false;
    seek((Number(range.value) / 1000) * duration);
  });
  hereBtn.addEventListener("click", () => {
    stanzas[current]?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  videoBtn.addEventListener("click", () => {
    wantsFloat = !floating;
    if (floating) floating = false;
    else if (slotVisible)
      slot.scrollIntoView({ block: "center", behavior: "smooth" });
    else floating = true;
    render();
  });
  byId("video-hide").addEventListener("click", () => {
    wantsFloat = false;
    floating = false;
    render();
  });
  back.addEventListener("click", () => {
    floating = false;
    render();
  });
  byId("player-hide").addEventListener("click", () => {
    barHidden = true;
    render();
  });
  tab.addEventListener("click", () => {
    barHidden = false;
    render();
  });

  new IntersectionObserver(([entry]) => {
    slotVisible = entry?.isIntersecting ?? true;
    floatIfAway();
    render();
  }).observe(slot);

  refreshTimes = renderTimes;
  readTime = () => (player ? player.getCurrentTime() || 0 : null);
  renderTimes();
}

const video = document.querySelector<HTMLElement>("figure.video[data-video]");
if (video) setup(video);
