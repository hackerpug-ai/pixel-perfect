import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { launchChrome } from "../../../plugins/pixel-perfect/scripts/chrome.mjs";
const url = process.argv[2];
const response = await fetch(url);
assert.equal(response.status, 200);
assert.match(await response.text(), /Increment count/);
const session = await launchChrome({ windowSize: [640, 480] });
try {
  const loaded = session.cdp.waitFor('Page.loadEventFired');
  await session.cdp.send('Page.navigate', { url }); await loaded;
  const result = await session.cdp.send('Runtime.evaluate', { expression: `document.querySelector('button').click(); document.querySelector('output').textContent`, returnByValue: true });
  assert.equal(result.result.value, '1');
  const accessible = await session.cdp.send('Accessibility.getFullAXTree');
  assert.ok(accessible.nodes.some((node) => node.role?.value === 'button' && node.name?.value === 'Increment count'));
} finally {
  session.ws.close(); session.proc.kill('SIGKILL');
  rmSync(session.userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
