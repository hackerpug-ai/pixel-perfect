---
id: ai-chat-tailwind-web
name: AI Chat Components + Tailwind (Web)
appliesTo:
  platforms: [web-desktop, web-mobile]
  frameworks: [react, nextjs, vite]
  styleSystem: tailwind
  componentLibrary: shadcn
  pattern: ai-chat
source: builtin
canonicalDocs: https://github.com/vercel/ai-elements
lastUpdated: 2026-06-20
---

# AI Chat Components + Tailwind (Web) — Styling Contract

This contract **extends `shadcn-tailwind-web`**: all styling is Tailwind utility classes applied via `className`, the `cn()` helper merges conditionally, primitives are sourced from `@/components/ui/`, and the shadcn CSS-variable token layer is the only sanctioned color source. The AI chat layer adds four conventions on top: group-based parent-state styling (no prop drilling for role theming), the `cn()` className-last discipline enforced uniformly, a sanctioned Shiki dual-theme exception, and a status-icon-only palette exception.

The drift to avoid is identical to shadcn/Tailwind (parallel global-CSS, inline `style={{}}`, arbitrary hex), plus the AI-chat-specific drift of conditional className logic for `user` vs `assistant` theming (use group markers instead) and hardcoded colors on streaming markdown containers (use tokens so dark mode inverts correctly).

## Predecessors

- **Read first:** [`shadcn-tailwind-web.md`](shadcn-tailwind-web.md) — all rules there apply here
- **Pattern reference:** [`../ai-chat-patterns.md`](../ai-chat-patterns.md) — 16 patterns for AI chat components

## Emit method

**How:** `utility-classes-via-className` + `cn()` for conditional merge + group markers for parent-state theming

```tsx
// ✓ correct — group marker on parent, group-[.marker]: variants on children
import { cn } from "@/lib/utils";

export const Message = ({ from, className, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full max-w-[95%] flex-col gap-2",
      from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
      className,
    )}
    {...props}
  />
);

export const MessageContent = ({ className, ...props }) => (
  <div
    className={cn(
      "flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
      "group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary",
      "group-[.is-user]:px-4 group-[.is-user]:py-3",
      "group-[.is-assistant]:text-foreground",
      className,
    )}
    {...props}
  />
);
```

```tsx
// ✗ wrong — conditional className logic for parent state
export const MessageContent = ({ from }) => (
  <div className={from === "user" ? "ml-auto rounded-lg bg-secondary px-4 py-3" : "text-foreground"} />
);

// ✗ wrong — hardcoded color on streaming container (dark mode breaks)
<div className="bg-gray-100 text-black">{streamingMarkdown}</div>
```

## File placement

**Rule:** `colocated` (inherits from `shadcn-tailwind-web`)

AI chat components live in `src/components/ai-elements/` (if using the ai-elements registry model) or alongside other project components in `src/components/`. Streaming markdown configuration (`streamdownPlugins`) is a module-level constant in each component file that needs it, not a shared global.

- **Allowed:** `src/components/**`, `src/screens/**`, `src/app/**`
- **Forbidden:** any `.css`/`.scss` defining custom component classes

## Token binding

**Mechanism:** `shadcn-css-variables-as-tailwind-utilities` (inherits)

AI chat components use ONLY semantic Tailwind tokens that map to CSS variables:

| Category | Sanctioned tokens |
|---|---|
| Backgrounds | `bg-background`, `bg-secondary`, `bg-muted`, `bg-muted/50`, `bg-muted/80`, `bg-destructive/10`, `bg-accent`, `bg-popover` |
| Text | `text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive`, `text-popover-foreground` |
| Borders | `border`, `border-b` |
| Status icons (ONLY) | `text-green-600`, `text-red-600`, `text-yellow-600`, `text-orange-600`, `text-blue-600` |

**Status icon exception:** Tailwind palette colors (`text-green-600`, etc.) are permitted **for icons only** (e.g., the checkmark on a completed tool-call, the X on an error). Never for layout, backgrounds, or text content.

**Shiki dual-theme exception:** CodeBlock syntax highlighting maps Shiki's runtime CSS vars to dark mode via the `!` important modifier (Shiki also sets inline styles):

```tsx
<span className="dark:!bg-[var(--shiki-dark-bg)] dark:!text-[var(--shiki-dark)]">
  {token.content}
</span>
```

This is the **only** sanctioned use of arbitrary CSS-variable references in AI chat components.

## Group-based parent-state styling

The signature AI chat styling pattern: parent applies a marker class based on a prop (e.g., `from="user"`), children target it via Tailwind's `group-[.marker]:` variant.

```tsx
// Parent adds marker based on role
<div className={cn("group", from === "user" ? "is-user" : "is-assistant")} />

// Children use the marker — no prop access needed
<div className="group-[.is-user]:ml-auto group-[.is-assistant]:text-foreground" />
```

**Why this matters:** AI chat components have parent-state-dependent theming (user vs assistant messages, streaming vs idle, error vs success). Naive approaches:
- Conditional className logic in every child — repetitive, error-prone
- Prop drilling `from` to every child — breaks composition
- Context lookup for styling — overkill

Group markers eliminate an entire class of conditional logic. Use them for: message role, streaming state, error state, branch selection.

## `cn()` className-last discipline

Every AI chat component follows the same prop-spread shape:

```tsx
export const SomeChatComponent = ({ children, className, ...props }: SomeChatComponentProps) => (
  <div
    className={cn(
      "default classes here",
      "more defaults",
      className,    // ← consumer override ALWAYS last
    )}
    {...props}      // ← spread AFTER className
  >
    {children}
  </div>
);
```

`cn` resolves to `twMerge(clsx(inputs))`:
- `clsx` handles conditional/array/object inputs
- `twMerge` resolves Tailwind conflicts (last wins)

Consumer's `className` always wins for conflicting utilities; non-conflicting defaults compose. This makes components overridable without forking.

## Forbidden patterns

(Inherits `shadcn-tailwind-web` and `tailwind-web`; restated for AI chat.)

- **Global CSS with custom classes** (`.ai-chat-*`, `.message-bubble-*`, etc.). *Rationale:* parallel system that bypasses Tailwind + the shadcn token layer.
- **Inline `style={{}}`** for static values. *Rationale:* bypasses utilities + tokens.
- **Hardcoded hex colors** anywhere outside Shiki's sanctioned exception. *Rationale:* breaks dark mode + theming.
- **Conditional className logic for parent state** (e.g., `from === "user" ? "ml-auto" : ""`). *Rationale:* group markers exist for exactly this case.
- **Palette color classes for layout/text** (e.g., `bg-blue-600` for a button). *Rationale:* violates the shadcn token layer. Palette colors are icons-only.

## Verify checklist (component level)

- Component uses Tailwind utilities via `className`; conditional classes merged with `cn()`.
- Colors reference shadcn token utilities (`bg-secondary`, `text-muted-foreground`) — palette literals only on status icons.
- `className` is destructured out of props and merged last in `cn()`; `{...props}` spread after.
- Parent-state-dependent theming uses `group-[.marker]:` variants, not conditional logic.
- Primitives (Collapsible, Button, Tooltip, etc.) sourced from `@/components/ui/`.
- Dark mode works via `.dark` token overrides + Shiki dual-theme CSS vars (if CodeBlock).
- Streaming containers have `aria-live="polite"` (see `ai-chat-patterns.md` Accessibility section).

## Checks

```json
{
  "forbiddenPatterns": [
    {
      "id": "global-custom-class-css-ai-chat",
      "mode": "content",
      "glob": ["src/**/*.css", "src/**/*.scss"],
      "regex": "\\.(ai-chat|message|reasoning|tool|prompt-input|conversation)-[a-z][\\w-]*",
      "rationale": "Custom AI chat classes bypass Tailwind + the shadcn token layer."
    },
    {
      "id": "inline-style-objects-ai-chat",
      "mode": "content",
      "glob": ["src/components/{ai-elements,chat}/**/*.{tsx,jsx}"],
      "regex": "\\bstyle=\\{\\{",
      "rationale": "Inline style={{}} bypasses utilities and the shadcn token layer."
    },
    {
      "id": "hardcoded-hex-ai-chat",
      "mode": "content",
      "glob": ["src/components/{ai-elements,chat}/**/*.{tsx,jsx}"],
      "regex": "#(?:[0-9a-fA-F]{3,8})\\b(?!.*shiki)",
      "rationale": "Hardcoded hex breaks dark mode + theming. Only exception is Shiki dual-theme CSS vars."
    },
    {
      "id": "conditional-classname-for-role",
      "mode": "content",
      "glob": ["src/components/{ai-elements,chat}/**/*.{tsx,jsx}"],
      "regex": "from\\s*===\\s*[\"']user[\"']\\s*\\?\\s*[\"'](?!(?:is-user|is-assistant|ml-auto|justify-end))",
      "rationale": "Parent-state theming should use group-[.marker]: variants, not inline conditional className logic."
    }
  ],
  "mustInclude": [
    {
      "id": "group-marker-on-message-parent",
      "glob": ["src/components/{ai-elements,chat}/message*.tsx"],
      "regex": "is-user|is-assistant",
      "description": "Message parent components apply group marker classes for parent-state theming."
    },
    {
      "id": "aria-live-on-streaming-containers",
      "glob": ["src/components/{ai-elements,chat}/**/*.{tsx,jsx}"],
      "exclude": ["**/*.test.*", "**/*.spec.*"],
      "regex": "aria-live|role=[\"']log[\"']",
      "description": "Streaming containers must have aria-live or role=log for screen reader announcements."
    }
  ]
}
```

## Cross-references

- [`shadcn-tailwind-web.md`](shadcn-tailwind-web.md) — base contract; all rules apply
- [`../ai-chat-patterns.md`](../ai-chat-patterns.md) — 16 patterns for AI chat components
- [`../state-patterns.md`](../state-patterns.md) — streaming-aware state section
- [`../library-vetting-rubric.md`](../library-vetting-rubric.md) — AI SDK dependency vetting

## Sources

Derived from vercel/ai-elements (assimilated 2026-06-20, sophistication 5/5, holocron doc `js7d0qvx9wskx4rg2tq3a5dv9n891tcw`).

*Authored 2026-06-20.*
