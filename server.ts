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
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  registerHandlers(io as any);

  server.all("*", (req: any, res: any) => {
    return handle(req, res);
  });

  httpServer.listen(port, () => {
    console.log(`> IPL Auction Server ready on http://localhost:${port}`);
    console.log(`> Mode: ${dev ? "development" : "production"}`);
  });
});