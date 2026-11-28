import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
const redact = (s) =>
  String(s)
    .replace(/https?:\/\/\S+|postgres(?:ql)?:\/\/\S+/g, "[URL redacted]")
    .replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[JWT redacted]",
    )
    .replace(/\b[a-f0-9]{64,}\b/gi, "[hash/key redacted]")
    .replace(
      /((?:secret|password|token|authorization|api_?key)["':=\s]+)[^\s,}]+/gi,
      "$1[redacted]",
    );
for (const name of [
  "woramet-store-test-db",
  "woramet-store-test-auth",
  "woramet-store-test-rest",
  "woramet-store-test-storage",
]) {
  const r = spawnSync("docker", ["logs", "--tail", "20", name], {
    encoding: "utf8",
  });
  process.stdout.write(
    `${name}\n${redact((r.stdout + r.stderr).slice(-8000))}\n`,
  );
}
for (const path of ["/tmp/store-test-gateway.log", "/tmp/store-test-next.log"])
  if (existsSync(path))
    process.stdout.write(
      `${path}\n${redact(readFileSync(path, "utf8").slice(-5000))}\n`,
    );
