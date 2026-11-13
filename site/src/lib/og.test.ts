import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OG_HEIGHT,
  OG_WIDTH,
  artBox,
  fitTitle,
  renderOg,
  workArt,
} from "./og.ts";

// The title fit rule: sizes from 76 down to 40px; at most three lines, four
// at the smallest size; a title that still doesn't fit is cut at a word
// boundary with «…». Font metrics decide where each title lands, so the
// tests check the rule, not the exact size a given title gets.
const SIZES = [76, 68, 60, 52, 46, 40];
const SMALLEST = 40;
const maxLines = (size: number) => (size === SMALLEST ? 4 : 3);

const SHORT = "Nueva era";
// Long enough to need more than one size step.
const LONG =
  "Anatomía de la infelicidad inherente al individuo reacio al autoengaño";
// Needs the smallest size and its extra line, but still fits whole.
const VERY_LONG =
  "Tápame con las sábanas de la oscuridad, bésame la frente, y haz de esta cama la mortaja de una innecesaria muerte";
// Far beyond four lines at the smallest size.
const TOO_LONG = Array.from({ length: 6 }, () => VERY_LONG).join(" ");

describe("artBox", () => {
  it("takes the centre square of a maxres frame, above the subtitles", () => {
    expect(artBox(1280, 720)).toEqual({ left: 358, top: 14, size: 563 });
  });

  it("drops the letterbox of a 4:3 thumbnail first", () => {
    // 640×480 holds a 640×360 frame starting at y = 60.
    expect(artBox(640, 480)).toEqual({ left: 179, top: 67, size: 282 });
    expect(artBox(480, 360)).toEqual({ left: 134, top: 50, size: 211 });
  });
});

// Expected sizes and line counts are those of the approved prototype
// (odd/og-gen/gen.py), which measures with the same Literata files.
describe("fitTitle", () => {
  it("keeps a short title whole at the largest size, on one line", async () => {
    expect(await fitTitle(SHORT)).toEqual({
      size: 76,
      lines: 1,
      text: SHORT,
      cut: false,
    });
  });

  it("always picks a size from the scale within its line budget", async () => {
    for (const title of [SHORT, LONG, VERY_LONG, TOO_LONG]) {
      const fit = await fitTitle(title);
      expect(SIZES).toContain(fit.size);
      expect(fit.lines).toBeGreaterThanOrEqual(1);
      expect(fit.lines).toBeLessThanOrEqual(maxLines(fit.size));
    }
  });

  it("steps down for longer titles", async () => {
    const short = await fitTitle(SHORT);
    const long = await fitTitle(LONG);
    const veryLong = await fitTitle(VERY_LONG);
    expect(long.size).toBeLessThan(short.size);
    expect(veryLong.size).toBeLessThanOrEqual(long.size);
  });

  it("keeps a title whole whenever it fits", async () => {
    for (const title of [SHORT, LONG, VERY_LONG]) {
      const fit = await fitTitle(title);
      expect(fit.cut).toBe(false);
      expect(fit.text).toBe(title);
    }
  });

  it("cuts a title too long even at the smallest size at a word boundary, with «…»", async () => {
    const fit = await fitTitle(TOO_LONG);
    expect(fit.size).toBe(SMALLEST);
    expect(fit.cut).toBe(true);
    expect(fit.text.endsWith("…")).toBe(true);
    const kept = fit.text.slice(0, -1);
    expect(kept.length).toBeGreaterThan(0);
    expect(TOO_LONG.startsWith(kept)).toBe(true);
    expect(TOO_LONG[kept.length]).toBe(" ");
  });
});

const image = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#777" } })
    .jpeg()
    .toBuffer();

describe("renderOg", () => {
  const size = async (buf: Buffer) => {
    const { width, height, format } = await sharp(buf).metadata();
    return { width, height, format };
  };
  const png = { width: OG_WIDTH, height: OG_HEIGHT, format: "png" };

  it("renders the default card as a 1200×630 PNG", async () => {
    expect(await size(await renderOg({ kind: "default" }))).toEqual(png);
  });

  it("renders the home card as a 1200×630 PNG", async () => {
    expect(await size(await renderOg({ kind: "home" }))).toEqual(png);
  });

  // Photographic art makes a PNG several times heavier than a JPEG.
  it("renders a work card with art and a series mark as a 1200×630 JPEG", async () => {
    const card = await renderOg({
      kind: "work",
      title: "Distinción entre arte y virtuosismo",
      author: "Solitario",
      series: { title: "En defensa del arte", position: 1 },
      art: await image(563, 563),
    });
    expect(await size(card)).toEqual({ ...png, format: "jpeg" });
  });
});

describe("workArt", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Serves the given images by thumbnail name; anything else is a 404.
  const stubFetch = (images: Record<string, Buffer>) => {
    const fetch = vi.fn(async (url: string | URL) => {
      const name = /\/([a-z]+)\.jpg$/.exec(String(url))?.[1] ?? "";
      const body = images[name];
      return body
        ? new Response(new Uint8Array(body))
        : new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetch);
    return fetch;
  };

  it("falls back to sddefault when maxresdefault is missing", async () => {
    const fetch = stubFetch({ sddefault: await image(640, 480) });
    const art = await workArt("aaaaaaaaaaa");
    expect(await sharp(art).metadata()).toMatchObject({
      width: 282,
      height: 282,
    });
    expect(fetch.mock.calls.map(([u]) => String(u))).toEqual([
      "https://i.ytimg.com/vi/aaaaaaaaaaa/maxresdefault.jpg",
      "https://i.ytimg.com/vi/aaaaaaaaaaa/sddefault.jpg",
    ]);
  });

  it("skips a 120px placeholder", async () => {
    stubFetch({
      maxresdefault: await image(120, 90),
      sddefault: await image(120, 90),
      hqdefault: await image(480, 360),
    });
    const art = await workArt("bbbbbbbbbbb");
    expect(await sharp(art).metadata()).toMatchObject({
      width: 211,
      height: 211,
    });
  });

  it("fetches each video once per build", async () => {
    const fetch = stubFetch({ maxresdefault: await image(1280, 720) });
    await workArt("ccccccccccc");
    await workArt("ccccccccccc");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("gives undefined, without throwing, when every size fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (String(url).includes("maxres")) throw new Error("offline");
        if (String(url).includes("sddefault"))
          return new Response(new Uint8Array([1, 2, 3]));
        return new Response(null, { status: 500 });
      }),
    );
    await expect(workArt("ddddddddddd")).resolves.toBeUndefined();
  });
});
