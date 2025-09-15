import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import serveStatic from "serve-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distPath = path.join(__dirname, "..", "client", "dist");
app.use(serveStatic(distPath));
app.get(["/sender", "/viewer"], (_, res) =>
  res.sendFile(path.join(distPath, "index.html"))
);
app.get("/health", (_, res) => res.type("text/plain").send("ok"));

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === 1) client.send(msg);
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTP on http://0.0.0.0:${PORT}`);
  console.log(`WS   on ws://0.0.0.0:${PORT}/ws`);
});
