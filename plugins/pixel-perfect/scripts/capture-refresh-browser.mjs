#!/usr/bin/env node
// Real browser screenshot adapter. Native targets must use a native capture command.
import { writeFileSync, rmSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchChrome, startStaticServer } from './chrome.mjs';
export async function captureBrowser(source, output, width, height, theme = 'light', selector = 'body') {
  if (!(Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0)) throw new Error('Invalid viewport');
  let server; let session;
  try {
    let url = source;
    if (!/^https?:\/\//.test(url)) { server = await startStaticServer(dirname(resolve(source))); url = `http://127.0.0.1:${server.port}/${encodeURIComponent(basename(source))}`; }
    session = await launchChrome({ windowSize: [width, height] });
    const { cdp } = session;
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme === 'dark' ? 'dark' : 'light' }] });
    const loaded = cdp.waitFor('Page.loadEventFired'); await cdp.send('Page.navigate', { url }); await loaded;
    const ready = await cdp.send('Runtime.evaluate', { expression: `document.fonts.ready.then(async () => {
      document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});
      await Promise.all(Array.from(document.images).map(i => i.decode()));
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const element = document.querySelector(${JSON.stringify(selector)});
      const bounds = element?.getBoundingClientRect();
      return Boolean(bounds?.width && bounds?.height && (element.textContent.trim() || element.querySelector('img,svg,canvas')));
    })`, awaitPromise: true, returnByValue: true });
    if (ready.exceptionDetails || ready.result?.value !== true || cdp.console.some((e) => e.type === 'error')) throw new Error('Selected surface did not render cleanly');
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(output, Buffer.from(shot.data, 'base64'));
    writeFileSync(`${output}.json`, JSON.stringify({ medium: 'browser', viewport: `${width}x${height}`, theme, source, selector }));
  } finally {
    if (server) server.server.close();
    if (session) { session.ws.close(); session.proc.kill('SIGKILL'); rmSync(session.userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [source, output, width, height, theme, selector] = process.argv.slice(2);
  captureBrowser(source, output, Number(width), Number(height), theme, selector).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
