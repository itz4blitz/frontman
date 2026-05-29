import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";

const { execFileSyncMock, existsSyncMock, writeFileSyncMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
  existsSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: execFileSyncMock,
}));

vi.mock("node:fs", () => ({
  existsSync: existsSyncMock,
  writeFileSync: writeFileSyncMock,
}));

import {
  installAstro,
  installNextjs,
  installSolidVite,
  installSvelteVite,
  installVite,
  installVueVite,
} from "../../helpers/installer.js";

const ROOT = resolve(import.meta.dirname, "../../../..");
const FRONTMAN_SERVER = "localhost:4002";

describe("installer helpers", () => {
  beforeEach(() => {
    execFileSyncMock.mockReset();
    existsSyncMock.mockReset();
    writeFileSyncMock.mockReset();
  });

  it.each([
    {
      name: "Next.js",
      install: installNextjs,
      cli: resolve(ROOT, "libs/frontman-nextjs/dist/cli.js"),
      fixtureDir: resolve(ROOT, "test/e2e/fixtures/nextjs"),
    },
    {
      name: "Vite",
      install: installVite,
      cli: resolve(ROOT, "libs/frontman-vite/dist/cli.js"),
      fixtureDir: resolve(ROOT, "test/e2e/fixtures/vite"),
    },
    {
      name: "Vue + Vite",
      install: installVueVite,
      cli: resolve(ROOT, "libs/frontman-vite/dist/cli.js"),
      fixtureDir: resolve(ROOT, "test/e2e/fixtures/vue-vite"),
    },
    {
      name: "Svelte + Vite",
      install: installSvelteVite,
      cli: resolve(ROOT, "libs/frontman-vite/dist/cli.js"),
      fixtureDir: resolve(ROOT, "test/e2e/fixtures/svelte-vite"),
    },
    {
      name: "Solid + Vite",
      install: installSolidVite,
      cli: resolve(ROOT, "libs/frontman-vite/dist/cli.js"),
      fixtureDir: resolve(ROOT, "test/e2e/fixtures/solid-vite"),
    },
  ])("runs the $name installer via execFileSync", ({ install, cli, fixtureDir }) => {
    existsSyncMock.mockImplementation((path: string) => path === cli);

    install();

    expect(execFileSyncMock).toHaveBeenCalledWith(
      process.execPath,
      [cli, "install", "--skip-deps", "--server", FRONTMAN_SERVER],
      { cwd: fixtureDir, stdio: "inherit" },
    );
  });

  it("throws a helpful error when the Vite CLI has not been built", () => {
    const cli = resolve(ROOT, "libs/frontman-vite/dist/cli.js");
    existsSyncMock.mockReturnValue(false);

    expect(() => installSvelteVite()).toThrow(
      `[e2e] Vite CLI not built. Run 'make build' in libs/frontman-vite first.\n  Missing: ${cli}`,
    );
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it("writes the Astro config with the expected Frontman host", () => {
    const fixtureDir = resolve(ROOT, "test/e2e/fixtures/astro");
    const configPath = resolve(fixtureDir, "astro.config.mjs");

    installAstro();

    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    expect(writeFileSyncMock).toHaveBeenCalledWith(
      configPath,
      expect.stringContaining("frontman({"),
    );
    expect(writeFileSyncMock).toHaveBeenCalledWith(
      configPath,
      expect.stringContaining(`host: '${FRONTMAN_SERVER}'`),
    );
  });
});
