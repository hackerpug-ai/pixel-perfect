// chrome.mjs — headless Chrome utilities for render-frames and capture-polish
// Zero dependencies; uses Node ≥ 20 native APIs (WebSocket, fetch, child_process).

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { extname, join } from "node:path";
import { tmpdir } from "node:os";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

export function findChrome() {
  if (process.env.CHROME && existsSync(process.env.CHROME)) return process.env.CHROME;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome-stable",
  ];
  return candidates.find((p) => existsSync(p)) || null;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.console = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
        return;
      }
      if (msg.method === "Runtime.consoleAPICalled") {
        const args = (msg.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ");
        this.console.push({ type: msg.params.type || "log", text: args });
      }
      if (msg.method === "Runtime.exceptionThrown") {
        const text = msg.params.exceptionDetails?.text || msg.params.exceptionDetails?.exception?.description || "exception";
        this.console.push({ type: "error", text });
      }
      if (this.onEvent) this.onEvent(msg);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 20_000);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  waitFor(method, timeoutMs = 15_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), timeoutMs);
      const prev = this.onEvent;
      this.onEvent = (msg) => {
        if (prev) prev(msg);
        if (msg.method === method) {
          clearTimeout(timer);
          this.onEvent = prev;
          resolve(msg.params);
        }
      };
    });
  }
}

async function waitForPortFile(userDataDir, timeoutMs = 20_000) {
  const file = join(userDataDir, "DevToolsActivePort");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(file)) {
      const port = Number(String(readFileSync(file, "utf8")).split("\n")[0]);
      if (Number.isInteger(port) && port > 0) return port;
    }
    await sleep(50);
  }
  throw new Error("Chrome DevTools port did not appear");
}

export async function launchChrome({ windowSize = [1280, 800] } = {}) {
  const chrome = findChrome();
  if (!chrome) {
    const err = new Error("CHROME_UNAVAILABLE");
    err.code = "CHROME_UNAVAILABLE";
    throw err;
  }
  const userData = mkdtempSync(join(tmpdir(), "pp-render-chrome-"));
  const proc = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      "--mute-audio",
      "--hide-scrollbars",
      `--user-data-dir=${userData}`,
      "--remote-debugging-port=0",
      `--window-size=${windowSize[0]},${windowSize[1]}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "ignore"] },
  );
  try {
    const port = await waitForPortFile(userData);
    let list = [];
    for (let i = 0; i < 20; i++) {
      try {
        const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
        list = await listRes.json();
        if (Array.isArray(list) && list.length) break;
      } catch {
        /* chrome still binding */
      }
      await sleep(100);
    }
    const page = list.find((t) => t.type === "page") || list[0];
    if (!page?.webSocketDebuggerUrl) throw new Error("Chrome offered no page target");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve);
      ws.addEventListener("error", () => reject(new Error("Chrome WebSocket failed")));
    });
    const cdp = new Cdp(ws);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");
    return { chrome, proc, userData, cdp, ws };
  } catch (error) {
    proc.kill("SIGKILL");
    rmSync(userData, { recursive: true, force: true });
    throw error;
  }
}

export function startStaticServer(root) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  };
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const pathname = url.pathname;
    let rel = decodeURIComponent(pathname);
    if (rel === "/") rel = "/index.html";
    const file = join(root, rel);
    if (existsSync(file) && statSync(file).isFile()) {
      res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
      res.end(readFileSync(file));
      return;
    }
    const index = join(root, "index.html");
    if (existsSync(index)) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(readFileSync(index));
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });
  return new Promise((resolveListen) => {
    server.listen(0, "127.0.0.1", () => {
      resolveListen({ server, port: server.address().port });
    });
  });
}
