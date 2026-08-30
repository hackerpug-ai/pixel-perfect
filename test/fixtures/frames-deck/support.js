// support.js — loaded by deck.html to inject content at runtime.
// Proves two kinds of sibling resolution: <script src> (works on file://) and fetch()
// (blocked between file:// URLs — requires the renderer to serve the deck over HTTP,
// exactly how Claude Design <dc-import> partials load).
const frame3 = document.querySelector('[data-route="/library"]');
if (frame3) {
  const p = document.createElement('p');
  p.textContent = 'support.js injected';
  frame3.appendChild(p);
  fetch('./sibling.txt')
    .then((r) => r.text())
    .then((t) => {
      frame3.setAttribute('data-label', t.trim());
      const q = document.createElement('p');
      q.textContent = 'fetched: ' + t.trim();
      frame3.appendChild(q);
    })
    .catch((e) => {
      const q = document.createElement('p');
      q.textContent = 'fetch failed: ' + e.message;
      frame3.appendChild(q);
    });
}
