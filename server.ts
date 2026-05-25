import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import next from "next";
import { registerHandlers } from "./src/server/socketHandlers";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);

  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 120000,
    pingInterval: 20000,
  });

  registerHandlers(io as any);

  server.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "ipl-auction", ts: Date.now() });
  });

  server.all("*", (req: any, res: any) => {
    return handle(req, res);
  });

  httpServer.listen(port, () => {
    console.log(`> IPL Auction Server ready on http://localhost:${port}`);
    console.log(`> Mode: ${dev ? "development" : "production"}`);

    const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL;
    if (baseUrl) {
      const healthUrl = `${baseUrl.replace(/\/$/, "")}/api/health`;
      const ping = () => fetch(healthUrl).catch(() => {});
      setTimeout(ping, 5000);
      setInterval(ping, 10 * 60 * 1000);
      console.log(`> Keep-alive ping scheduled: ${healthUrl}`);
    }
  });
});