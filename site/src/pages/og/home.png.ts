// Share image of the home page: the illustration alone.
import type { APIRoute } from "astro";
import { renderOg } from "../../lib/og.ts";

export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await renderOg({ kind: "home" })), {
    headers: { "Content-Type": "image/png" },
  });
