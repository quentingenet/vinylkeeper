#!/usr/bin/env node
// The version of the mobile apps, the same on Android and iOS. The source is the versionName of
// android/app/build.gradle (also shown in the menu of the app); the Xcode project copies it (MARKETING_VERSION).
//
//   npm run version:check          the two apps have the same version (exit 1 otherwise)
//   npm run version:set -- 1.2.0   new version on both apps, versionCode + 1 (a new Google Play upload)
//
// The build number of iOS is not kept here: the iOS build of GitHub Actions takes the number of its run.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GRADLE = resolve(root, "android/app/build.gradle");
const XCODE = resolve(root, "ios/App/App.xcodeproj/project.pbxproj");
const SEMVER = /^\d+\.\d+\.\d+$/;

function read() {
  const gradle = readFileSync(GRADLE, "utf8");
  const xcode = readFileSync(XCODE, "utf8");
  const versionName = /versionName\s+"([^"]+)"/.exec(gradle)?.[1];
  const versionCode = Number(/versionCode\s+(\d+)/.exec(gradle)?.[1]);
  const marketing = [...xcode.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((match) => match[1]);
  return { gradle, xcode, versionName, versionCode, marketing };
}

function check() {
  const { versionName, versionCode, marketing } = read();
  const inSync = marketing.length > 0 && marketing.every((version) => version === versionName);
  console.log(`Android ${versionName} (versionCode ${versionCode}), iOS ${[...new Set(marketing)].join(", ")}`);
  if (!inSync) {
    console.error(`The iOS version must be the Android one: run npm run version:set -- ${versionName}`);
    process.exit(1);
  }
}

function set(next) {
  if (!SEMVER.test(next ?? "")) {
    console.error("Give the new version as major.minor.patch, for example: npm run version:set -- 1.2.0");
    process.exit(1);
  }
  const { gradle, xcode, versionName, versionCode } = read();
  if (next === versionName) {
    console.error(`The apps are already at ${next}`);
    process.exit(1);
  }
  writeFileSync(
    GRADLE,
    gradle
      .replace(/versionName\s+"[^"]+"/, `versionName "${next}"`)
      .replace(/versionCode\s+\d+/, `versionCode ${versionCode + 1}`),
  );
  writeFileSync(XCODE, xcode.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${next};`));
  console.log(`${versionName} -> ${next} on Android and iOS, versionCode ${versionCode} -> ${versionCode + 1}`);
  console.log(`Once committed on main: git tag v${next} && git push origin v${next}`);
}

const [command, value] = process.argv.slice(2);
if (command === "set") set(value);
else check();
