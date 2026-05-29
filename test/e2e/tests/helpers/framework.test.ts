import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { spawnMock, execSyncMock, existsSyncMock, readFileSyncMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  execSyncMock: vi.fn(),
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: execSyncMock,
  spawn: spawnMock,
}));

vi.mock("node:fs", () => ({
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
}));

import {
  headingFileContains,
  startSolidVite,
  startSvelteVite,
  stopFramework,
  type FrameworkServer,
} from "../../helpers/framework.js";

const ROOT = resolve(import.meta.dirname, "../../../..");

function makeProc() {
  return Object.assign(new EventEmitter(), {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    kill: vi.fn(),
  });
}

describe("framework helpers", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    spawnMock.mockReset();
    execSyncMock.mockReset();
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ status: 200 });
    execSyncMock.mockImplementation((command: string) => {
      if (command.startsWith("lsof -ti:")) {
        return Buffer.from("");
      }
      return Buffer.from("");
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    {
      name: "Svelte + Vite",
      start: startSvelteVite,
      port: 3014,
      fixtureName: "svelte-vite",
      headingFile: "src/App.svelte",
    },
    {
      name: "Solid + Vite",
      start: startSolidVite,
      port: 3015,
      fixtureName: "solid-vite",
      headingFile: "src/App.tsx",
    },
  ])("starts $name with the resolved Vite binary", async ({ start, port, fixtureName, headingFile }) => {
    const fixtureDir = resolve(ROOT, "test/e2e/fixtures", fixtureName);
    const viteBin = resolve(ROOT, "node_modules/.bin/vite");
    existsSyncMock.mockImplementation((path: string) => path === viteBin);
    const proc = makeProc();
    spawnMock.mockReturnValue(proc);

    const server = await start(port);

    expect(spawnMock).toHaveBeenCalledWith(
      process.execPath,
      [viteBin, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
      expect.objectContaining({
        cwd: fixtureDir,
        stdio: "pipe",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(`http://127.0.0.1:${port}`);
    expect(server).toMatchObject({
      fixtureDir,
      headingFile: resolve(fixtureDir, headingFile),
      port,
      proc,
    });
  });

  it("restores fixture changes when a framework server stops", async () => {
    const proc = makeProc();
    const server = {
      proc,
      port: 3014,
      fixtureDir: resolve(ROOT, "test/e2e/fixtures/svelte-vite"),
      headingFile: resolve(ROOT, "test/e2e/fixtures/svelte-vite/src/App.svelte"),
    } satisfies FrameworkServer;

    await stopFramework(server);

    expect(proc.kill).toHaveBeenCalledWith("SIGTERM");
    expect(execSyncMock).toHaveBeenCalledWith(
      `git checkout -- "${server.fixtureDir}"`,
      expect.objectContaining({ cwd: ROOT, stdio: "pipe" }),
    );
    expect(execSyncMock).toHaveBeenCalledWith(
      `git clean -fd -- "${server.fixtureDir}"`,
      expect.objectContaining({ cwd: ROOT, stdio: "pipe" }),
    );
  });

  it("checks whether the heading file contains the expected text", () => {
    const headingFile = resolve(ROOT, "test/e2e/fixtures/solid-vite/src/App.tsx");
    const server = {
      proc: makeProc(),
      port: 3015,
      fixtureDir: resolve(ROOT, "test/e2e/fixtures/solid-vite"),
      headingFile,
    } satisfies FrameworkServer;

    existsSyncMock.mockImplementation((path: string) => path === headingFile);
    readFileSyncMock.mockReturnValue("<h1>Hello Frontman</h1>");

    expect(headingFileContains(server, "Hello Frontman")).toBe(true);
    expect(headingFileContains(server, "Missing")).toBe(false);
  });
});
