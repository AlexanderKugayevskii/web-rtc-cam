#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";

const SERVICE = process.env.CF_SERVICE || "cloudflared";
const RX = /https:\/\/[-A-Za-z0-9.]+\.trycloudflare\.com/g;
const START_TIMEOUT_MS = 60_000; // макс ожидание URL, 60с

function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", stdio: "pipe", ...opts });
}

function banner(url) {
  const viewer = `${url}/viewer`;
  const sender = `${url}/sender`;
  return `\n********************************************************
Open this on your devices:

PC:      ${viewer}
Phone:   ${sender}

Warning! Do not share this link unless you intend to.
********************************************************`;
}

function findUrlOnce() {
  const out = sh("docker", ["compose", "logs", "--no-color", SERVICE]);
  if (out.status !== 0) return null;
  const matches = out.stdout.match(RX);
  return matches ? matches.at(-1) : null;
}

function followForUrl(timeoutMs = START_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "docker",
      ["compose", "logs", "-f", "--no-color", SERVICE],
      {
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    let buf = "";
    let done = false;

    const finish = (u) => {
      if (done) return;
      done = true;
      try {
        proc.kill();
      } catch {}
      resolve(u);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    proc.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      const m = buf.match(RX);
      if (m && m[0]) {
        clearTimeout(timer);
        finish(m[0]);
      }
    });
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("close", () => finish(null));
  });
}

async function main() {
  // 1) up -d
  console.log("Starting containers…");
  const up = sh("docker", ["compose", "up", "-d", "--build"]);
  if (up.status !== 0) {
    console.error(up.stderr || up.stdout || "docker compose up failed");
    process.exit(up.status || 1);
  }

  // 2) пробуем вытащить URL из уже накопленных логов
  let url = findUrlOnce();

  // 3) если нет — ждём появление в -f логах
  if (!url) {
    console.log("Waiting for Cloudflare Tunnel URL…");
    url = await followForUrl();
  }

  if (!url) {
    console.error(
      "❌ Could not find trycloudflare URL. Is the tunnel running?"
    );
    process.exit(2);
  }

  // 4) красивый баннер
  console.log(banner(url));
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
