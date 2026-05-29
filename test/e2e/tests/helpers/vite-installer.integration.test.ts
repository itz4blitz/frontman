import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  installSolidVite,
  installSvelteVite,
  installVite,
  installVueVite,
} from "../../helpers/installer.js";

const ROOT = resolve(import.meta.dirname, "../../../..");
const VITE_CLI = resolve(ROOT, "libs/frontman-vite/dist/cli.js");

const viteFixtures = [
  {
    name: "React + Vite",
    key: "vite",
    install: installVite,
  },
  {
    name: "Vue + Vite",
    key: "vue-vite",
    install: installVueVite,
  },
  {
    name: "Svelte + Vite",
    key: "svelte-vite",
    install: installSvelteVite,
  },
  {
    name: "Solid + Vite",
    key: "solid-vite",
    install: installSolidVite,
  },
] as const;

function resolveBin(startDir: string, name: string): string {
  let dir = startDir;
  while (true) {
    const binPath = resolve(dir, "node_modules", ".bin", name);
    if (existsSync(binPath)) return binPath;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Cannot find binary '${name}' starting from ${startDir}`);
}

function fixtureDir(key: string): string {
  return resolve(ROOT, "test/e2e/fixtures", key);
}

function viteConfigPath(key: string): string {
  return resolve(fixtureDir(key), "vite.config.ts");
}

function restoreFixture(key: string): void {
  execFileSync("git", ["checkout", "--", `test/e2e/fixtures/${key}`], {
    cwd: ROOT,
    stdio: "pipe",
  });
  execFileSync("git", ["clean", "-fd", "--", `test/e2e/fixtures/${key}`], {
    cwd: ROOT,
    stdio: "pipe",
  });
}

describe("Vite installer integration", () => {
  beforeAll(() => {
    if (!existsSync(VITE_CLI)) {
      throw new Error(`[e2e] Vite CLI not built. Run 'make build' first.\n  Missing: ${VITE_CLI}`);
    }
  });

  afterEach(() => {
    for (const fixture of viteFixtures) {
      restoreFixture(fixture.key);
    }
  });

  it.each([
    { name: "Svelte + Vite", key: "svelte-vite", install: installSvelteVite },
    { name: "Solid + Vite", key: "solid-vite", install: installSolidVite },
  ])("builds the $name fixture after install", ({ key, install }) => {
    const dir = fixtureDir(key);
    const viteBin = resolveBin(dir, "vite");

    install();

    expect(readFileSync(viteConfigPath(key), "utf-8")).toContain("frontmanPlugin");

    execFileSync(process.execPath, [viteBin, "build"], {
      cwd: dir,
      stdio: "pipe",
    });

    expect(existsSync(resolve(dir, "dist"))).toBe(true);
  });

  it.each(viteFixtures)(
    "preserves the single Frontman plugin invariant for $name",
    ({ key, install }) => {
      install();
      install();

      const config = readFileSync(viteConfigPath(key), "utf-8");
      expect(config.match(/frontmanPlugin/g)).toHaveLength(2);
      expect(config.match(/@frontman-ai\/vite/g)).toHaveLength(1);
      expect(config.match(/localhost:4002/g)).toHaveLength(1);
    },
  );
});
