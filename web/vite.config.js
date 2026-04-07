import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

function getGitVersion() {
  try {
    return execSync("git describe --always --dirty", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(rootDir, "../src");

const uiBrowser = path.join(srcDir, "ui-browser.mjs");
const colorsBrowser = path.join(srcDir, "colors-browser.mjs");

const colorsNode = path.resolve(srcDir, "colors.mjs");
const uiNode = path.resolve(srcDir, "ui.mjs");

export default defineConfig({
  root: rootDir,
  publicDir: "public",
  server: { port: 5173 },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(rootDir, "index.html"),
        play: path.resolve(rootDir, "play.html"),
      },
    },
  },
  resolve: {
    alias: {
      [colorsNode]: colorsBrowser,
      [uiNode]: uiBrowser,
    },
  },
  plugins: [
    {
      name: "hktm-git-version-html",
      transformIndexHtml: {
        enforce: "pre",
        transform(html) {
          const v = getGitVersion();
          let out = html.replace(/%HKTM_GIT_VERSION%/g, v);
          if (process.env.HKTM_ENV === "staging") {
            out = out.replace(/href="\/favicon\.svg"/g, 'href="/favicon-staging.svg"');
          }
          return out;
        },
      },
    },
    {
      name: "hktm-engine-import-shims",
      enforce: "pre",
      resolveId(source, importer) {
        if (!importer) return null;
        const imp = importer.replace(/\\/g, "/");
        if (!/\/src\/engine\.mjs$/.test(imp)) return null;
        if (source === "./colors.mjs") return colorsBrowser;
        if (source === "./ui.mjs") return uiBrowser;
        return null;
      },
    },
  ],
});
