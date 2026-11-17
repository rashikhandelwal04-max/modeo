import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const shim = {
  name: "next-shims",
  setup(b) {
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: path.join(root, "static/link.tsx") }));
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: path.join(root, "static/navigation.ts") }));
  },
};
const r = await esbuild.build({
  entryPoints: [path.join(root, "static/main.tsx")],
  bundle: true, minify: true, write: false, format: "iife", target: "es2020",
  jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
  tsconfig: path.join(root, "tsconfig.json"), plugins: [shim], logLevel: "warning",
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
const html = `<title>MODEO Styling Studio</title>
<meta name="description" content="MODEO — an AI personal stylist that styles what you own.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500&display=swap">
<style>${css}
html, body { background: var(--paper); color: var(--ink); }
</style>
<div id="root"></div>
<script>${js}</script>
`;
const out = process.argv[2] || path.join(root, "dist/modeo.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log("wrote", out, (html.length / 1024).toFixed(0) + " KB");
