import { app, type App } from "electron";
import fs from "node:fs";
import path from "node:path";

declare const __DYAD_LOCAL_BUILD__: boolean;

export const IS_LOCAL_BUILD =
  typeof __DYAD_LOCAL_BUILD__ !== "undefined" && __DYAD_LOCAL_BUILD__;

export function initializeLocalBuildIdentity(
  isLocalBuild = IS_LOCAL_BUILD,
  electronApp: Pick<App, "getPath" | "setName" | "setPath"> = app,
): void {
  if (!isLocalBuild) return;

  electronApp.setName("Maximus Dyad");
  const userDataPath = path.join(
    electronApp.getPath("appData"),
    "Maximus Dyad",
  );
  fs.mkdirSync(userDataPath, { recursive: true });
  electronApp.setPath("userData", userDataPath);
}
