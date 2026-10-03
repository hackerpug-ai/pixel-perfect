# Acme pricing page

The requirements the demo sandbox is initialized from (scripts/record-demo.mjs).

## Goal

A pricing page for Acme, a small team product. Visitors compare three plans and pick one.

## Look and feel

Calm and editorial: warm paper background, white cards, one blue accent, generous spacing.

## Screens

One route, `/`, the Pricing screen: an eyebrow, a headline, a lede, and three plan cards
(Starter, Team, Enterprise). The Team card is featured and carries a "Most popular" badge. Each
card has a plan name, a price per seat, a one-line note, three features with check marks, and one
button. There are no other states.

The design is `mockups/pricing.html`.

## Platform and toolchain

- Web desktop only.
- Vite + React, TypeScript.
- Tailwind CSS for styles.
- No component library. Build the components from scratch.
- Lucide icons.
- The default custom sandbox.
