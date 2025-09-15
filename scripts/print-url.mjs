#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
const SERVICE = process.env.CF_SERVICE || "cloudflared";
const RX = /https:\/\/[-A-Za-z0-9.]+\.trycloudflare\.com/g;

function banner(u) {
  return `********************************************************
Open this on your devices:

PC:      ${u}/viewer
Phone:   ${u}/sender

Warning! Do not share this link unless you intend to.
********************************************************`;
}

function once() {
  const out = spawnSync("docker", ["compose", "logs", "--no-color", SERVICE], {
    encoding: "utf8",
  });
  if (out.status !== 0) return null;
  const m = out.stdout.match(RX);
  return m ? m.at(-1) : null;
}

function follow() {
  return new Promise((res) => {
    const p = spawn(
      "docker",
      ["compose", "logs", "-f", "--no-color", SERVICE],
      { stdio: ["ignore", "pipe", "inherit"] }
    );
    let buf = "";
    p.stdout.on("data", (c) => {
      buf += c.toString();
      const m = buf.match(RX);
      if (m && m[0]) {
        try {
          p.kill();
        } catch {}
        res(m[0]);
      }
    });
    setTimeout(() => {
      try {
        p.kill();
      } catch {}
      res(null);
    }, 60000);
  });
}

let url = once();
if (!url) {
  url = await follow();
}
if (!url) {
  console.error("No URL found");
  process.exit(2);
}
console.log(banner(url));
