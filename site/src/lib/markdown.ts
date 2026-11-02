// Markdown → HTML for the editor's prose fields (bios, descriptions), with the
// same processor Astro uses for .md files. Build time only.

import {
  createMarkdownProcessor,
  type MarkdownRenderer,
} from "@astrojs/markdown-remark";

let processor: Promise<MarkdownRenderer> | undefined;

export async function markdown(source: string | undefined): Promise<string> {
  if (!source?.trim()) return "";
  processor ??= createMarkdownProcessor({ syntaxHighlight: false });
  return (await processor).render(source).then((r) => r.code);
}
