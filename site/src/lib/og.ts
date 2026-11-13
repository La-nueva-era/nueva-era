// Share images (Open Graph), 1200×630, rendered at build time: satori lays
// the card out as SVG with the text as paths, sharp rasterises it. The layout
// follows the approved prototype, odd/og-gen/gen.py (Lámina).

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import satori from "satori";
import sharp from "sharp";
import illustrationUri from "../assets/nueva-era.png?inline";
import tokensCss from "../styles/tokens.css?raw";
import { es } from "../i18n/es.ts";
import { SITE_NAME } from "../site.config.ts";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const MARGIN = 72;
const TITLE_W = 624; // text column beside the art: x 72 → 696
const TITLE_SIZES = [76, 68, 60, 52, 46, 40];
const TITLE_LINES = 3;
const TITLE_LINES_MIN = 4; // at the smallest size
const TITLE_LH = 1.1;
const ELLIPSIS = "…";

export type OgCard =
  | { kind: "default" }
  | { kind: "home" }
  | {
      kind: "work";
      title: string;
      author: string;
      series?: { title: string; position?: number | undefined } | undefined;
      /** The work's artwork, any format sharp reads. */
      art: Buffer;
    };

/**
 * The artwork inside a YouTube thumbnail: thumbnails are video frames, with
 * blurred side panels and burned-in subtitles, and the 4:3 sizes add a
 * letterbox. Keeps the centre square of the 16:9 frame, near its top.
 */
export function artBox(
  width: number,
  height: number,
): { left: number; top: number; size: number } {
  const frameHeight = Math.round((width * 9) / 16);
  const frameTop = Math.floor((height - frameHeight) / 2);
  const size = Math.round(0.44 * width);
  return {
    left: Math.floor((width - size) / 2),
    top: frameTop + Math.round(0.02 * frameHeight),
    size,
  };
}

// The dark theme's values: the first declaration of each token in tokens.css.
function token(name: string): string {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(tokensCss);
  if (!m?.[1]) throw new Error(`og: token --${name} not found in tokens.css`);
  return m[1].trim();
}

const color = {
  bg: token("bg"),
  ink: token("ink"),
  muted: token("muted"),
  faint: token("faint"),
};

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

type Node = {
  type: string;
  props: Record<string, unknown> & { style?: Record<string, unknown> };
};
type Child = Node | string;
type Style = Record<string, unknown>;

function h(type: string, style: Style, ...children: Child[]): Node {
  return { type, props: { style: { display: "flex", ...style }, children } };
}

function img(src: string, style: Style): Node {
  return { type: "img", props: { src, style } };
}

const jpegUri = (buf: Buffer) =>
  `data:image/jpeg;base64,${buf.toString("base64")}`;

const require = createRequire(import.meta.url);

type Fonts = Parameters<typeof satori>[1]["fonts"];
let fonts: Promise<Fonts> | undefined;

// Literata 400 and 600; latin-ext follows latin so satori falls back to it.
function loadFonts() {
  fonts ??= Promise.all(
    (["400", "600"] as const).flatMap((weight) =>
      ["latin", "latin-ext"].map(async (subset) => ({
        name: "Literata",
        weight: Number(weight) as 400 | 600,
        style: "normal" as const,
        data: await readFile(
          require.resolve(
            `@fontsource/literata/files/literata-${subset}-${weight}-normal.woff`,
          ),
        ),
      })),
    ),
  );
  return fonts;
}

const titleStyle = (size: number): Style => ({
  fontFamily: "Literata",
  fontSize: size,
  fontWeight: 600,
  lineHeight: TITLE_LH,
});

// Lines of a title at a size, laid out by satori itself in the title column
// (width set, height left to the content). With `break-word`, a word wider
// than the column is broken and adds lines, which reveals that it overflows.
async function titleLines(
  text: string,
  size: number,
  wordBreak: "normal" | "break-word",
): Promise<number> {
  const svg = await satori(
    h("div", { ...titleStyle(size), wordBreak }, text) as Parameters<
      typeof satori
    >[0],
    { width: TITLE_W, fonts: await loadFonts() },
  );
  const height = Number(/height="([\d.]+)"/.exec(svg)?.[1]);
  return Math.round(height / (size * TITLE_LH));
}

async function fitsAt(text: string, size: number): Promise<number | false> {
  const limit =
    size === TITLE_SIZES[TITLE_SIZES.length - 1]
      ? TITLE_LINES_MIN
      : TITLE_LINES;
  const lines = await titleLines(text, size, "normal");
  if (lines > limit) return false;
  // Same count when broken inside words: no word overflows the column.
  return (await titleLines(text, size, "break-word")) === lines ? lines : false;
}

export type TitleFit = {
  size: number;
  lines: number;
  text: string;
  /** Cut at a word boundary and ended with «…». */
  cut: boolean;
};

/**
 * Largest size at which the title wraps in three lines (four at the smallest
 * size); past the smallest size, cut at a word boundary with «…».
 */
export async function fitTitle(title: string): Promise<TitleFit> {
  for (const size of TITLE_SIZES) {
    const lines = await fitsAt(title, size);
    if (lines) return { size, lines, text: title, cut: false };
  }
  const size = TITLE_SIZES[TITLE_SIZES.length - 1] as number;
  const words = title.split(/\s+/);
  for (let k = words.length - 1; k > 0; k--) {
    const text = words.slice(0, k).join(" ") + ELLIPSIS;
    const lines = await fitsAt(text, size);
    if (lines) return { size, lines, text, cut: true };
  }
  return { size, lines: 1, text: words[0] + ELLIPSIS, cut: true };
}

const smootherstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (6 * x - 15) + 10);
};

/** Eased ramp over n pixels: 0 before fraction a, 1 after fraction b. */
function ramp(n: number, [a, b]: Edge, rising: boolean): Float64Array {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = smootherstep((i / (n - 1) - a) / (b - a));
    out[i] = rising ? v : 1 - v;
  }
  return out;
}

type Edge = [number, number];
type Fades = { left?: Edge; right?: Edge; bottom?: Edge };

/**
 * Warm duotone (black → --bg, white → --ink), then the given edges eased into
 * the page colour, baked into the pixels. Returns a JPEG.
 */
async function faded(
  src: Buffer,
  width: number,
  height: number,
  fades: Fades,
): Promise<Buffer> {
  const { data, info } = await sharp(src)
    .resize(width, height, { fit: "fill" })
    .removeAlpha()
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ones = (n: number) => new Float64Array(n).fill(1);
  const left = fades.left ? ramp(width, fades.left, true) : ones(width);
  const right = fades.right ? ramp(width, fades.right, false) : ones(width);
  const bottom = fades.bottom
    ? ramp(height, fades.bottom, false)
    : ones(height);
  const bg = rgb(color.bg);
  const ink = rgb(color.ink);
  const out = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const l = data[i * info.channels] as number;
      const t =
        (l / 255) *
        (left[x] as number) *
        (right[x] as number) *
        (bottom[y] as number);
      for (let c = 0; c < 3; c++) {
        const b = bg[c] as number;
        out[i * 3 + c] = Math.round(b + ((ink[c] as number) - b) * t);
      }
    }
  }
  return sharp(out, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

const illustration = Buffer.from(illustrationUri.split(",")[1] ?? "", "base64");

const page = (...children: Child[]) =>
  h(
    "div",
    {
      position: "relative",
      width: OG_WIDTH,
      height: OG_HEIGHT,
      background: color.bg,
      color: color.ink,
      fontFamily: "Literata",
    },
    ...children,
  );

const wordmark = () =>
  h("div", { fontSize: 24, lineHeight: "32px", color: color.faint }, SITE_NAME);

// Series mark: a bordered square with the position, beside the name.
function seriesMark(s: { title: string; position?: number | undefined }) {
  return h(
    "div",
    { alignItems: "center", gap: 14, color: color.muted },
    ...(s.position === undefined
      ? []
      : [
          h(
            "div",
            {
              alignItems: "center",
              justifyContent: "center",
              minWidth: 42,
              height: 42,
              padding: "0 8px",
              border: `2px solid ${color.muted}`,
              borderRadius: 4,
              fontWeight: 400,
              fontSize: 24,
              lineHeight: 1,
            },
            String(s.position),
          ),
        ]),
    s.title,
  );
}

async function workCard(card: Extract<OgCard, { kind: "work" }>) {
  const fit = await fitTitle(card.title);
  const art = await faded(card.art, OG_HEIGHT, OG_HEIGHT, { left: [0, 0.6] });
  return page(
    img(jpegUri(art), {
      position: "absolute",
      right: 0,
      top: 0,
      width: OG_HEIGHT,
      height: OG_HEIGHT,
    }),
    h(
      "div",
      {
        position: "absolute",
        left: MARGIN,
        top: MARGIN,
        bottom: MARGIN,
        width: TITLE_W,
        flexDirection: "column",
      },
      wordmark(),
      h(
        "div",
        { marginTop: "auto", flexDirection: "column" },
        h(
          "div",
          {
            ...titleStyle(fit.size),
            width: TITLE_W,
            // Balanced like the prototype; a cut title keeps greedy lines.
            textWrap: fit.cut ? "wrap" : "balance",
          },
          fit.text,
        ),
        h(
          "div",
          {
            fontSize: 30,
            lineHeight: "40px",
            color: color.muted,
            marginTop: 24,
            gap: 24,
            alignItems: "center",
          },
          card.author,
          ...(card.series ? [seriesMark(card.series)] : []),
        ),
      ),
    ),
  );
}

async function defaultCard() {
  const art = await faded(illustration, 663, OG_HEIGHT, {
    left: [0, 0.5],
    bottom: [0.82, 1],
  });
  return page(
    img(jpegUri(art), {
      position: "absolute",
      right: 0,
      top: 0,
      width: 663,
      height: OG_HEIGHT,
    }),
    h(
      "div",
      {
        position: "absolute",
        left: MARGIN,
        top: MARGIN,
        bottom: MARGIN,
        width: TITLE_W,
        flexDirection: "column",
        justifyContent: "center",
      },
      h("div", { fontSize: 84, fontWeight: 600, lineHeight: 1.05 }, SITE_NAME),
      h(
        "div",
        {
          fontSize: 32,
          lineHeight: 1.3,
          color: color.muted,
          marginTop: 24,
          maxWidth: 13 * 32,
        },
        es.home.subtitle,
      ),
    ),
  );
}

// The home's own image: the illustration alone, its cut edges faded.
async function homeCard() {
  const meta = await sharp(illustration).metadata();
  const height = 590;
  const width = Math.round(((meta.width ?? 0) * height) / (meta.height ?? 1));
  const art = await faded(illustration, width, height, {
    left: [0, 0.07],
    right: [0.93, 1],
    bottom: [0.82, 1],
  });
  return page(
    img(jpegUri(art), {
      position: "absolute",
      left: Math.floor((OG_WIDTH - width) / 2),
      top: 40,
      width,
      height,
    }),
  );
}

/**
 * The card as an image: a work card is a JPEG (photographic art makes a PNG
 * of it several times heavier); the default and home cards are PNGs.
 */
export async function renderOg(card: OgCard): Promise<Buffer> {
  const tree =
    card.kind === "work"
      ? await workCard(card)
      : card.kind === "home"
        ? await homeCard()
        : await defaultCard();
  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: await loadFonts(),
  });
  const image = sharp(Buffer.from(svg));
  return card.kind === "work"
    ? image.jpeg({ quality: 85 }).toBuffer()
    : image.png().toBuffer();
}

const artCache = new Map<string, Promise<Buffer | undefined>>();

/**
 * A work's artwork from its YouTube thumbnail, cropped by `artBox`, or
 * undefined when no thumbnail can be fetched (the page then shares the
 * default card). Fetched once per video per build; never rejects.
 */
export function workArt(videoId: string): Promise<Buffer | undefined> {
  let art = artCache.get(videoId);
  if (!art) {
    art = fetchArt(videoId);
    artCache.set(videoId, art);
  }
  return art;
}

async function fetchArt(videoId: string): Promise<Buffer | undefined> {
  for (const name of ["maxresdefault", "sddefault", "hqdefault"]) {
    try {
      const res = await fetch(`https://i.ytimg.com/vi/${videoId}/${name}.jpg`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const { width, height } = await sharp(buf).metadata();
      // A missing size may come back as a 120px grey placeholder.
      if (!width || !height || width <= 120) continue;
      const { left, top, size } = artBox(width, height);
      return await sharp(buf)
        .extract({ left, top, width: size, height: size })
        .toBuffer();
    } catch {
      // Network or decoding failure: try the next size.
    }
  }
  return undefined;
}
