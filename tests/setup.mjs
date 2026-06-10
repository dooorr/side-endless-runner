import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const physicsPath = path.join(root, "..", "js", "physics-utils.js");
const code = fs.readFileSync(physicsPath, "utf8");

const sandbox = { globalThis: {}, SideRunner: {} };
sandbox.globalThis = sandbox;
vm.runInNewContext(code, sandbox);
globalThis.SideRunner = sandbox.SideRunner;
