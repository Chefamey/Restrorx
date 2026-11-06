const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const output = path.join(root, "dist");
fs.rmSync(output, { force: true, recursive: true });
fs.mkdirSync(output);
fs.copyFileSync(path.join(root, "index.html"), path.join(output, "index.html"));
fs.cpSync(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });
