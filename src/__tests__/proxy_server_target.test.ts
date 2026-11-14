import http from "node:http";
import net from "node:net";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { once } from "node:events";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const workerPath = path.resolve(__dirname, "../../worker/proxy_server.js");
const authorization = "Bearer fake-preview-token";

describe.each(["/", "/base/"])(
  "proxy target origin guard with upstream %s",
  (basePath) => {
    let upstream: http.Server;
    let attacker: http.Server;
    let worker: Worker;
    let proxyPort: number;
    let attackerHost: string;
    let attackerRequests: http.IncomingMessage[];
    let trustedRequests: http.IncomingMessage[];

    beforeEach(async () => {
      trustedRequests = [];
      attackerRequests = [];
      upstream = http.createServer((req, res) => {
        trustedRequests.push(req);
        res.end("ok");
      });
      upstream.on("upgrade", (req, socket) => {
        trustedRequests.push(req);
        socket.end(
          "HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n",
        );
      });
      attacker = http.createServer((req, res) => {
        attackerRequests.push(req);
        res.end("attacker");
      });
      attacker.on("upgrade", (req, socket) => {
        attackerRequests.push(req);
        socket.end();
      });
      upstream.listen(0, "127.0.0.1");
      attacker.listen(0, "127.0.0.1");
      await Promise.all([
        once(upstream, "listening"),
        once(attacker, "listening"),
      ]);
      attackerHost = `127.0.0.1:${(attacker.address() as net.AddressInfo).port}`;
      worker = new Worker(workerPath, {
        workerData: {
          targetOrigin: `http://127.0.0.1:${(upstream.address() as net.AddressInfo).port}${basePath}`,
          hostname: "app-42.localhost",
          port: 0,
          fixedHeaders: { authorization },
        },
      });
      const origin = await new Promise<string>((resolve, reject) => {
        worker.on("error", reject);
        worker.on("message", (message) => {
          if (
            typeof message === "string" &&
            message.startsWith("proxy-server-start url=")
          ) {
            resolve(message.slice("proxy-server-start url=".length));
          }
        });
      });
      proxyPort = Number(new URL(origin).port);
    });

    afterEach(async () => {
      await worker?.terminate();
      await Promise.all(
        [upstream, attacker].map(
          (server) =>
            new Promise<void>((resolve) => server.close(() => resolve())),
        ),
      );
    });

    // Write the request target verbatim: URL-based clients normalize away the exploit.
    function request(requestPath: string, upgrade: boolean) {
      return new Promise<number>((resolve, reject) => {
        const socket = net.connect(proxyPort, "127.0.0.1", () => {
          socket.write(
            `GET ${requestPath} HTTP/1.1\r\nHost: app-42.localhost:${proxyPort}\r\n` +
              (upgrade
                ? "Connection: Upgrade\r\nUpgrade: websocket\r\n"
                : "Connection: close\r\n") +
              "\r\n",
          );
        });
        let response = "";
        socket.setEncoding("utf8");
        socket.on("data", (chunk) => {
          response += chunk;
        });
        socket.on("end", () =>
          resolve(Number(response.match(/HTTP\/1\.1 (\d+)/)?.[1])),
        );
        socket.on("error", reject);
      });
    }

    it.each([false, true])(
      "never sends credentials to an attacker (upgrade=%s)",
      async (upgrade) => {
        const successStatus = upgrade ? 101 : 200;
        const cases = [
          { path: `//${attackerHost}/collect`, status: 421 },
          { path: `/\\${attackerHost}/collect`, status: 421 },
          {
            path: `/x/..//${attackerHost}/collect`,
            status: basePath === "/" ? 400 : successStatus,
          },
          {
            path: `/x/%2e%2e//${attackerHost}/collect`,
            status: basePath === "/" ? 400 : successStatus,
          },
          {
            path: `/x/..\\\\${attackerHost}/collect`,
            status: basePath === "/" ? 400 : successStatus,
          },
        ];
        for (const testCase of cases) {
          const count = trustedRequests.length;
          expect(await request(testCase.path, upgrade), testCase.path).toBe(
            testCase.status,
          );
          expect(attackerRequests, testCase.path).toHaveLength(0);
          if (testCase.status === successStatus) {
            // With a base path these remain ordinary paths on the trusted origin.
            expect(trustedRequests).toHaveLength(count + 1);
            expect(trustedRequests.at(-1)?.headers.authorization).toBe(
              authorization,
            );
            expect(trustedRequests.at(-1)?.url).toBe(
              `/base//${attackerHost}/collect`,
            );
          } else {
            expect(trustedRequests, testCase.path).toHaveLength(count);
          }
        }
      },
    );

    it.each([false, true])(
      "preserves base paths, queries and trusted authorization (upgrade=%s)",
      async (upgrade) => {
        const prefix = basePath === "/" ? "" : "/base";
        for (const requestPath of [
          "/api?q=1",
          "/x/../api?q=1",
          `${prefix}/api?q=1`,
        ]) {
          expect(await request(requestPath, upgrade)).toBe(upgrade ? 101 : 200);
          expect(trustedRequests.at(-1)?.url).toBe(`${prefix}/api?q=1`);
          expect(trustedRequests.at(-1)?.headers.authorization).toBe(
            authorization,
          );
        }
        expect(attackerRequests).toHaveLength(0);
      },
    );
  },
);
