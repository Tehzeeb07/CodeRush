/**
 * Web Development Challenge — preview + starter-code helpers.
 *
 * Everything here is pure and runs in the browser. The preview builds a
 * self-contained HTML document from the user's HTML + CSS + JavaScript and
 * renders it inside a sandboxed <iframe>. It deliberately handles the
 * untrusted nature of user code: we inline CSS/JS, we never touch the
 * parent document, and we strip reference to the local `style.css` /
 * `script.js` files (which cannot load inside a blob-less sandbox iframe).
 */

export const DEFAULT_STARTER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Web Challenge</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <h1>Hello CodeRush</h1>

  <script src="script.js"></script>
</body>
</html>
`;

export const DEFAULT_STARTER_CSS = `body {
  margin: 0;
  font-family: Arial, sans-serif;
}
`;

export const DEFAULT_STARTER_JAVASCRIPT = `console.log("CodeRush Web Challenge");
`;

export interface WebProjectCode {
  html: string;
  css: string;
  javascript: string;
}

/** A web project is considered empty for submission purposes when nothing
 *  meaningful was written beyond (optionally) the starter scaffolding. */
export function hasSubmittableCode(code: WebProjectCode): boolean {
  const meaningful = (s: string) => Boolean(s && s.replace(/\s/g, "").length > 0);
  return meaningful(code.html) || meaningful(code.css) || meaningful(code.javascript);
}

/** Escape the few token sequences that would prematurely close the injected
 *  <style>/<script> tags inside the assembled preview document. */
function escapeCss(s: string): string {
  return s.replace(/<\/style/gi, "<\\/style");
}

function escapeJs(s: string): string {
  return s.replace(/<\/script/gi, "<\\/script");
}

/** Extract only the content between <body …> and </body>. Falls back to the
 *  whole string when there is no <body> tag so plain fragments still work. */
export function extractBodyContent(html: string): string {
  const open = /<body[^>]*>/i.exec(html);
  const close = /<\/body\s*>/i.exec(html);
  if (open && close && close.index > open.index) {
    return html.slice(open.index + open[0].length, close.index);
  }
  return html;
}

/**
 * Build the final, self-contained HTML document shown in the preview.
 *
 * - Removes references to the local `style.css` / `script.js` (they can't
 *   resolve inside the iframe) — their content is injected below instead.
 * - Inlines CSS into <style> and JS into a <script> tag so everything runs
 *   without any server / network dependency.
 */
export function buildPreviewDocument(code: WebProjectCode): string {
  const raw = code.html ?? "";
  // Drop references to the two local files injected by the starter template.
  const html = raw
    .replace(/<link[^>]*href=["']style\.css["'][^>]*\/?>/gi, "")
    .replace(/<script[^>]*src=["']script\.js["'][^>]*>\s*<\/script>/gi, "");

  const body = extractBodyContent(html);
  const css = escapeCss(code.css ?? "");
  const js = escapeJs(code.javascript ?? "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${css}</style>
</head>
<body>
${body}
<script>${js}</script>
</body>
</html>
`;
}
