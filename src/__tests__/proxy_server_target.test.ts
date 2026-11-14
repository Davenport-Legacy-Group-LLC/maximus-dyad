import http from "node:http";
import net from "node:net";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";

const workerPath = path.resolve(__dirname, "../../worker/proxy_server.js");

describe("proxy target origin guard", () => {
  it.each(["//127.0.0.1:9/steal", "/..//127.0.0.1:9/steal", "/\\\\127.0.0.1:9/steal"]) (
    "rejects raw target path %s before forwarding",
    async (requestPath) => {
      let trustedRequests = 0;
      const upstream = http.createServer((_req, res) => {
        trustedRequests++;
        res.end("ok");
      });
      upstream.listen(0, "127.0.0.1");
      await once(upstream, "listening");
      const upstreamPort = (upstream.address() as net.AddressInfo).port;
      const worker = new Worker(workerPath, {
        workerData: {
          targetOrigin: `http://127.0.0.1:${upstreamPort}/base?keep=1`,
          hostname: "app-42.localhost",
          port: 0,
          fixedHeaders: { Authorization: "Bearer fake-only" },
        },
      });
      try {
        const proxyUrl = await new Promise<string>((resolve, reject) => {
          worker.on("error", reject);
          worker.on("message", (message) => {
            if (typeof message === "string" && message.startsWith("proxy-server-start url="))
              resolve(message.slice("proxy-server-start url=".length));
          });
        });
        const proxyPort = Number(new URL(proxyUrl).port);
        const response = await new Promise<number>((resolve, reject) => {
          const socket = net.connect(proxyPort, "127.0.0.1", () => {
            socket.write(`GET ${requestPath} HTTP/1.1\r\nHost: app-42.localhost:${proxyPort}\r\nConnection: close\r\n\r\n`);
          });
          let responseText = "";
          socket.setEncoding("utf8");
          socket.on("data", (chunk) => { responseText += chunk; });
          socket.on("end", () => resolve(Number(responseText.match(/HTTP\/1\.1 (\d+)/)?.[1])));
          socket.on("error", reject);
        });
        expect(response).toBe(400);
        expect(trustedRequests).toBe(0);
      } finally {
        await worker.terminate();
        await new Promise<void>((resolve) => upstream.close(() => resolve()));
      }
    },
  );
});
