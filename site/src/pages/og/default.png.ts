// Share image of every page without its own, and of works without art.
import type { APIRoute } from "astro";
import { renderOg } from "../../lib/og.ts";

export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await renderOg({ kind: "default" })), {
    headers: { "Content-Type": "image/png" },
  });
