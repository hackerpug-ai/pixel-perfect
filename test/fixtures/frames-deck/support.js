// support.js — loaded by deck.html to inject content at runtime
// This tests that HTML decks loaded via file:// can resolve sibling scripts

const frame3 = document.querySelector('[data-label="with-route"]');
if (frame3) {
  const p = document.createElement('p');
  p.textContent = 'support.js injected';
  frame3.appendChild(p);
}
