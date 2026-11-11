import { defineConfig, fontProviders } from "astro/config";
import { SITE_URL } from "./src/site.config.ts";

// Unicode ranges as shipped by @fontsource/literata. Spanish is fully covered
// by LATIN; LATIN_EXT is only downloaded when a page uses one of its glyphs.
const LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT =
  "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";

const literata = (weight: "400" | "500" | "600", style: "normal" | "italic") =>
  (
    [
      ["latin", LATIN],
      ["latin-ext", LATIN_EXT],
    ] as const
  ).map(([subset, range]) => ({
    weight,
    style,
    unicodeRange: [range] as [string],
    src: [
      `@fontsource/literata/files/literata-${subset}-${weight}-${style}.woff2`,
    ] as [string],
  }));

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "never",
  build: { format: "file" },
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Literata",
      cssVariable: "--font-literata",
      fallbacks: ["Georgia", "serif"],
      display: "swap",
      options: {
        variants: [
          ...literata("400", "normal"),
          ...literata("400", "italic"),
          ...literata("500", "normal"),
          ...literata("600", "normal"),
        ] as [ReturnType<typeof literata>[number]],
      },
    },
  ],
});
