// Add or update an editor in editors.json.
// Usage: npm run add-editor -- someone@asu.edu
import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import readline from "node:readline";

const file = process.env.WIKI_EDITORS_FILE || "editors.json";
const email = process.argv[2]?.trim().toLowerCase();

if (!email || !email.includes("@")) {
  console.error("Usage: npm run add-editor -- someone@example.com");
  process.exit(1);
}

// One readline interface for both prompts; typed characters are not echoed.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
rl._writeToOutput = () => {};
// The iterator buffers lines, so this also works when input is piped in.
const lines = rl[Symbol.asyncIterator]();

async function askHidden(question) {
  process.stdout.write(question);
  const { value = "" } = await lines.next();
  process.stdout.write("\n");
  return value;
}

const password = await askHidden(`Password for ${email}: `);
const confirm = await askHidden("Confirm password: ");
rl.close();

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}
if (confirm !== password) {
  console.error("Passwords do not match.");
  process.exit(1);
}

const salt = randomBytes(16);
const key = scryptSync(password, salt, 64);
const hash = `scrypt:${salt.toString("base64")}:${key.toString("base64")}`;

const editors = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, "utf8"))
  : [];
const existing = editors.find((e) => e.email.toLowerCase() === email);
if (existing) existing.hash = hash;
else editors.push({ email, hash });

fs.writeFileSync(file, JSON.stringify(editors, null, 2) + "\n", {
  mode: 0o600,
});
console.log(`${existing ? "Updated" : "Added"} ${email} in ${file}`);
