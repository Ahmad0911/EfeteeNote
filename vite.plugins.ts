import type { Plugin } from "vite";

/**
 * Makes the built pages work when index.html is simply double-clicked (file://)
 * as well as on any web host: classic deferred script, no CORS "crossorigin" attributes.
 */
export function openFromDisk(): Plugin {
  return {
    name: "open-from-disk",
    enforce: "post",
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin src="([^"]+\/assets\/[^"]+|\.\/assets\/[^"]+)"><\/script>/g, '<script defer src="$1"></script>')
        .replace(/(<link rel="stylesheet") crossorigin (href="[^"]*assets\/[^"]+")/g, "$1 $2");
    },
  };
}
