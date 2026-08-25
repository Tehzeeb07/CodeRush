// One-off helper: set JWT_PRIVATE_KEY and JWKS on the Convex dev deployment
// by invoking the CLI directly from Node (no shell quoting issues).
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const coderushRoot = path.resolve(__dirname, "..");
const cli = path.join(coderushRoot, "node_modules", "convex", "bin", "main.js");

const priv = fs.readFileSync(path.join(__dirname, "_jwt_private_key.txt"), "utf8").trim();
const jwks = fs.readFileSync(path.join(__dirname, "_jwks.json"), "utf8").trim();

// sanity checks
JSON.parse(jwks);
if (!priv.startsWith("-----BEGIN PRIVATE KEY-----")) throw new Error("bad PEM");

function envSet(name, value) {
  console.log(`Setting ${name} (${value.length} chars)...`);
  execFileSync(
    process.execPath,
    [cli, "env", "set", `${name}=${value}`],
    { cwd: coderushRoot, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }
  );
  console.log(`${name} set OK`);
}

envSet("JWT_PRIVATE_KEY", priv);
envSet("JWKS", jwks);
console.log("DONE");
