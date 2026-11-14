// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("electron", () => ({ app: {} }));
import {
  initializeLocalBuildIdentity,
  IS_LOCAL_BUILD,
} from "./local_build_identity";

describe("local build identity", () => {
  it("leaves the official build identity untouched by default", () => {
    const electronApp = {
      getPath: vi.fn(),
      setName: vi.fn(),
      setPath: vi.fn(),
    };

    expect(IS_LOCAL_BUILD).toBe(false);
    initializeLocalBuildIdentity(undefined, electronApp as never);

    expect(electronApp.setName).not.toHaveBeenCalled();
    expect(electronApp.getPath).not.toHaveBeenCalled();
    expect(electronApp.setPath).not.toHaveBeenCalled();
  });

  it("sets the local app identity and creates its private profile directory", () => {
    const appData = fs.mkdtempSync(
      path.join(os.tmpdir(), "dyad-local-appdata-"),
    );
    const userDataPath = path.join(appData, "Maximus Dyad");
    const calls: string[] = [];
    const electronApp = {
      setName: vi.fn((name: string) => calls.push(`name:${name}`)),
      getPath: vi.fn((name: string) => {
        calls.push(`getPath:${name}`);
        return appData;
      }),
      setPath: vi.fn((name: string, value: string) =>
        calls.push(`setPath:${name}:${value}`),
      ),
    };

    try {
      initializeLocalBuildIdentity(true, electronApp as never);

      expect(calls).toEqual([
        "name:Maximus Dyad",
        "getPath:appData",
        `setPath:userData:${userDataPath}`,
      ]);
      expect(fs.statSync(userDataPath).isDirectory()).toBe(true);
    } finally {
      fs.rmSync(appData, { recursive: true, force: true });
    }
  });
});
