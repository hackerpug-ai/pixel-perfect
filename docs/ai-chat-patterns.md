# AI Chat Component Patterns

The canonical reference for building AI chat components in pixel-perfect projects. Consult this whenever a planned component is part of a chatbot, AI assistant UI, conversational form, or any surface that renders streamed LLM output. Distilled from assimilating [vercel/ai-elements](https://github.com/vercel/ai-elements) (5/5 sophistication, 47 components) — patterns are portable across React/Vite/Next/Svelte; only the streaming markdown + AI SDK type contracts are React/TS-specific.

Used by: `/pixel-perfect:build` Phase 4b (BUILD PLAN) when an AI chat surface is detected, and `/pixel-perfect:research` standalone. Cross-linked from `docs/design-systems/shadcn-ui.md`, `docs/ecosystem-patterns.md`, `docs/state-patterns.md`, and `docs/styling-contracts/ai-chat-tailwind-web.md`.

---

## When to apply

Apply these patterns when **any** planned component matches:

- Renders streamed text from an LLM (token-by-token, partial markdown)
- Displays model reasoning / chain-of-thought / plan steps
- Renders tool-call invocations and their outputs
- Composes a chat transcript (user + assistant + system messages)
- Accepts a prompt with attachments, suggestions, or voice input
- Surfaces artifacts (code, files, web previews, terminals) inside a chat turn

Do **not** apply for: static forms, dashboards, CRUD tables, conventional navigation. Those use the standard pixel-perfect patterns.

---

## Component categories (build the right atom/molecule/organism)

| Category | Typical pixel-perfect layer | Example components |
|---|---|---|
| Chat primitives | Molecules (Message) + Organisms (Conversation) | Conversation, Message, PromptInput, Suggestion |
| Reasoning UX | Molecules (collapsible) | Reasoning, ChainOfThought, Plan, Task |
| Tool-call rendering | Molecules | Tool, Sources, InlineCitation |
| Code/artifact surfaces | Organisms | CodeBlock, Artifact, WebPreview, Terminal, TestResults |
| Voice | Molecules | SpeechInput, Transcription, AudioPlayer, MicSelector |
| Selectors | Atoms (Picker) → Molecules (combined) | ModelSelector, VoiceSelector |
| File/code browsing | Organisms | FileTree, JsxPreview, Snippet |
| Loading states | Atoms | Shimmer, Spinner |

Use this table during BUILD PLAN to bucket planned components. The category drives which patterns below apply.

---

## The 16 patterns

### 1. Compound component convention

Every multi-part AI chat component is `<Parent>` + `<ParentChild>` **named exports** (never statics on the parent function). The parent provides context; sub-components consume it.

```tsx
// ✓ correct — separate named exports
export const Reasoning = ({ children, isStreaming, ...props }) => {
  const [isOpen, setIsOpen] = useState(props.defaultOpen ?? isStreaming);
  return (
    <ReasoningContext.Provider value={{ isOpen, setIsOpen, isStreaming }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} {...props}>
        {children}
      </Collapsible>
    </ReasoningContext.Provider>
  );
};
export const ReasoningTrigger = ({ children, ...props }) => {
  const { isOpen, isStreaming } = useReasoning();
  return <CollapsibleTrigger {...props}>{children ?? <DefaultTrigger isStreaming={isOpen} />}</CollapsibleTrigger>;
};
export const ReasoningContent = (props) => <CollapsibleContent {...props} />;

// ✗ wrong — statics on the parent
export const Reasoning = (() => { /* ... */ }) as ReasoningComponent & {
  Trigger: FC<...>; Content: FC<...>;  // do NOT do this
};
```

**Why:** Tree-shakable, type-inferable, IDE-autocompletes sub-components, and avoids the React-forward-ref-vs-static footgun.

---

### 2. Context + throw-on-missing hook

State shared between parent and arbitrary descendants flows through React Context with a hook that throws if used outside the parent.

```tsx
interface ReasoningContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isStreaming: boolean;
  duration: number | undefined;
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

export const useReasoning = () => {
  const ctx = useContext(ReasoningContext);
  if (!ctx) {
    throw new Error("Reasoning components must be used within <Reasoning>");
  }
  return ctx;
};
```

**Why:** Catches misuse at dev time with a clear message. The hook name (`useXxx`) is the public API contract for sub-component authors.

---

### 3. Dual-mode provider (standalone OR lifted state)

When a component should work out-of-the-box with internal state **and** be controllable from outside, ship two hooks:

```tsx
const PromptInputControllerContext = createContext<PromptInputController | null>(null);

// Strict — throws (used by sub-components that REQUIRE a parent provider)
export const usePromptInputController = () => {
  const ctx = useContext(PromptInputControllerContext);
  if (!ctx) throw new Error("Wrap your component inside <PromptInputProvider>");
  return ctx;
};

// Lenient — returns null (used internally to detect provider presence)
const useOptionalPromptInputController = () => useContext(PromptInputControllerContext);

export const PromptInput = ({ ...props }) => {
  const controller = useOptionalPromptInputController();
  const usingProvider = !!controller;
  const files = usingProvider ? controller.attachments.files : localFiles;
  // ...
};
```

**When:** Composer components (prompt input, attachment wells, form-ish flows) that need both "just works" and "parent owns the state" modes.

---

### 4. Controlled/uncontrolled triple via Radix

Open/closed, selected value, current page — anything toggle-able uses the prop triple:

```tsx
import { useControllableState } from "@radix-ui/react-use-controllable-state";

type ReasoningProps = {
  open?: boolean;           // controlled
  defaultOpen?: boolean;    // uncontrolled initial
  onOpenChange?: (open: boolean) => void;
};

const [isOpen, setIsOpen] = useControllableState({
  prop: open,
  defaultProp: defaultOpen,
  onChange: onOpenChange,
});
```

**When:** Any collapsible/toggle/selection in an AI chat component. Standardizes on Radix's implementation so consumers get predictable semantics.

---

### 5. Discriminated-union props for polymorphic components

When a prop shape depends on a type tag, use a TS discriminated union with `never` for inapplicable fields:

```tsx
export type ToolHeaderProps = {
  title?: string;
  className?: string;
} & (
  | { type: "function-call"; state: ToolState; toolName?: never }
  | { type: "dynamic-tool"; state: ToolState; toolName: string }
);

export const ToolHeader = ({ type, state, toolName, ...props }: ToolHeaderProps) => {
  // TypeScript narrows `toolName` based on `type`
  const name = type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");
  // ...
};
```

**When:** Any component that renders multiple AI SDK part types (tools, message roles, source kinds). Prevents entire classes of `undefined` runtime errors.

---

### 6. Streaming markdown renderer + memo with custom comparator

LLM output streams token-by-token. Default `memo()` re-renders on every parent update. Use a custom comparator that only re-renders when the streaming content or animation flag actually changes:

```tsx
import Streamdown, { type Props as StreamdownProps } from "streamdown";
import { memo } from "react";
import { cjk, code, math, mermaid } from "@streamdown/*";

const streamdownPlugins = { cjk, code, math, mermaid };

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    nextProps.isAnimating === prevProps.isAnimating,
);

MessageResponse.displayName = "MessageResponse";  // required — memo() anonymizes
```

**Why:** Without this, every token arrival cascades a re-render of the entire message tree. The plugins cover the four common markdown extensions: CJK text spacing, syntax-highlighted code, KaTeX math, and mermaid diagrams.

**Non-React fallback:** For Svelte, use `$derived` for the rendered output and a keyed `{#each}` block. For SwiftUI, `@Observable` + `.id(message.id)` re-renders only the changed message.

---

### 7. Autoscroll via `use-stick-to-bottom`

Don't hand-roll scroll-to-bottom logic. Use a library-grade solution:

```tsx
import { StickToBottom } from "use-stick-to-bottom";
import { useStickToBottomContext } from "use-stick-to-bottom/react";

export const ConversationContent = ({ className, ...props }) => (
  <StickToBottom.Content className={cn("flex flex-col gap-8 p-4", className)} {...props} />
);

export const ConversationScrollButton = ({ className, ...props }) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  return !isAtBottom && (
    <Button onClick={() => scrollToBottom()} className={cn("absolute bottom-6 ...", className)} {...props}>
      <ArrowDownIcon />
    </Button>
  );
};
```

**Why:** Handles the edge cases (programmatic scroll, viewport resize, content above the fold, mobile momentum scroll) that hand-rolled `scrollTop = scrollHeight` gets wrong.

**Non-web:** Terminal UIs use `autoScroll` flag + manual `scrollTop` assignment (see ai-elements `terminal.tsx`). SwiftUI uses `ScrollViewReader` + `scrollTo(id)`.

---

### 8. Reasoning disclosure lifecycle (state machine)

Reasoning panels (model thinking, chain-of-thought, plan steps) follow a streaming-aware lifecycle:

```
closed ──stream starts──▶ auto-open ──stream ends──▶ wait 1s ──▶ auto-close (once)
                                                             │
                                                             └─ user opens again ─▶ stays manual
```

```tsx
const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;

const [isOpen, setIsOpen] = useState(defaultOpen ?? false);
const [duration, setDuration] = useState<number>();
const [hasAutoClosed, setHasAutoClosed] = useState(false);
const hasEverStreamedRef = useRef(false);
const startTimeRef = useRef<number | null>(null);

// Auto-open when stream starts (unless explicitly closed by user)
useEffect(() => {
  if (isStreaming && !isOpen && defaultOpen !== false) setIsOpen(true);
}, [isStreaming, isOpen]);

// Auto-close 1s after stream ends — exactly once
useEffect(() => {
  if (hasEverStreamedRef.current && !isStreaming && isOpen && !hasAutoClosed) {
    const t = setTimeout(() => {
      setIsOpen(false);
      setHasAutoClosed(true);
    }, AUTO_CLOSE_DELAY);
    return () => clearTimeout(t);
  }
}, [isStreaming, isOpen]);

// Track duration
useEffect(() => {
  if (isStreaming) {
    hasEverStreamedRef.current = true;
    if (startTimeRef.current === null) startTimeRef.current = Date.now();
  } else if (startTimeRef.current !== null) {
    setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S));
    startTimeRef.current = null;
  }
}, [isStreaming]);

const defaultLabel = (isStreaming: boolean, duration?: number) => {
  if (isStreaming || duration === 0) return "Thinking…";
  if (duration === undefined) return "Thought for a few seconds";
  return `Thought for ${duration} seconds`;
};
```

**Why `hasEverStreamedRef` + `hasAutoClosed`:** prevents the panel from auto-closing again on subsequent renders after the user manually reopens it.

**Why `defaultOpen !== false` check:** explicit user override ("I want it closed") beats automatic behavior.

---

### 9. Tool-call rendering (typed dispatcher + polymorphic output)

Tool calls have a 7-state lifecycle. Render as a typed dispatcher with a state-machine badge and polymorphic output:

```tsx
const statusLabels: Record<ToolState, string> = {
  "input-streaming": "Pending",
  "input-available": "Running",
  "output-available": "Completed",
  "output-error": "Error",
  "output-denied": "Denied",
  "approval-requested": "Awaiting Approval",
  "approval-responded": "Approved",
};

export const ToolOutput = ({ output, errorText }: ToolOutputProps) => {
  if (!(output || errorText)) return null;

  // Polymorphic: ReactElement passes through; object → JSON CodeBlock; string → text
  let rendered: ReactNode = <>{output}</>;
  if (typeof output === "object" && !isValidElement(output)) {
    rendered = <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />;
  } else if (typeof output === "string") {
    rendered = <span className="text-sm">{output}</span>;
  }

  return <ToolContent>{errorText ? "Error" : "Result"}{rendered}</ToolContent>;
};
```

**Why polymorphic output:** callers can drop custom JSX for rich tool outputs (charts, maps, custom widgets) without a wrapper component.

---

### 10. Shimmer loading (motion text-clip gradient)

Loading states use a text-clip gradient animation, sized dynamically by content length:

```tsx
import { motion } from "motion/react";

const Shimmer = ({ children, as: Component = "p", className, duration = 2, spread = 2 }) => {
  const dynamicSpread = useMemo(() => (children?.length ?? 0) * spread, [children, spread]);
  const MotionComponent = motion[Component];
  return (
    <MotionComponent
      className={cn("text-base font-medium", className)}
      style={{
        backgroundImage: `linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%)`,
        backgroundSize: `100% ${dynamicSpread}px`,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
      }}
      animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </MotionComponent>
  );
};

// Usage — swap in when streaming:
export const PlanTitle = ({ children, ...props }) => {
  const { isStreaming } = usePlan();
  return <CardTitle {...props}>{isStreaming ? <Shimmer>{children}</Shimmer> : children}</CardTitle>;
};
```

**Why `dynamicSpread`:** content of different lengths needs different gradient sizes or the shimmer looks wrong on short text.

---

### 11. Async-with-sync-fallback render pattern

Slow async operations (syntax highlighting, image processing) shouldn't block first paint. Use module-level singleton caches + subscribers:

```tsx
const highlighterCache = new Map<string, Promise<Highlighter>>();
const tokensCache = new Map<string, TokenizedCode>();
const subscribers = new Map<string, Set<(result: TokenizedCode) => void>>();

export const highlightCode = (code, language, callback?) => {
  const cacheKey = `${language}:${code.length}:${code.slice(0, 100)}${code.slice(-100)}`;
  const cached = tokensCache.get(cacheKey);
  if (cached) return cached;                          // sync hit → render now

  if (callback) subscribers.get(cacheKey)?.add(callback) ?? subscribers.set(cacheKey, new Set([callback]));

  getHighlighter(language).then((highlighter) => {
    const tokens = highlighter.codeToTokens(code, { lang: language });
    const tokenized = { tokens, /* ... */ };
    tokensCache.set(cacheKey, tokenized);
    for (const sub of subscribers.get(cacheKey) ?? []) sub(tokenized);
    subscribers.delete(cacheKey);
  });

  return null;                                        // no sync result yet
};

// In component:
const rawTokens = useMemo(() => createRawTokens(code), [code]);
const syncTokens = useMemo(() => highlightCode(code, language) ?? rawTokens, [code, language, rawTokens]);
const [asyncTokens, setAsyncTokens] = useState<TokenizedCode | null>(null);

useEffect(() => {
  let cancelled = false;
  highlightCode(code, language, (result) => !cancelled && setAsyncTokens(result));
  return () => { cancelled = true; };
}, [code, language]);

const tokenized = asyncTokens ?? syncTokens;          // prefer async when ready
```

**When:** Any CPU-heavy transform where you can render a degraded version immediately and upgrade later. Avoids `setState`-in-render warnings.

---

### 12. CSS counters for line numbers

Don't add `<span>` per line number — use CSS counters:

```tsx
const LINE_NUMBER_CLASSES = cn(
  "block",
  "before:content-[counter(line)]",
  "before:inline-block",
  "before:[counter-increment:line]",
  "before:w-8 before:mr-4",
  "before:text-right before:text-muted-foreground/50",
  "before:font-mono before:select-none",
);

<code className="counter-reset-[line]">
  {lines.map((line) => <span className={LINE_NUMBER_CLASSES}>{line}</span>)}
</code>
```

**Why:** No extra DOM, screen-reader-friendly, doesn't break token-level memoization.

---

### 13. Group-based parent-state styling

Avoid conditional className logic for "user vs assistant" theming. Use Tailwind's `group-[.marker]:` variant:

```tsx
// Parent applies marker class based on `from` prop
export const Message = ({ from, className, ...props }) => (
  <div
    className={cn(
      "group flex w-full max-w-[95%] flex-col gap-2",
      from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
      className,
    )}
    {...props}
  />
);

// Children target the marker — no prop drilling
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

**Why:** Eliminates an entire class of conditional className logic. Children don't need to know about parent state.

---

### 14. `cn()` className-last discipline

Every component spreads `{...props}` LAST, with `className` destructured out and composed as `cn("defaults", className)`:

```tsx
export const MessageContent = ({ children, className, ...props }: MessageContentProps) => (
  <div
    className={cn(
      "flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
      className,    // ← consumer override always wins
    )}
    {...props}      // ← spread AFTER className
  >
    {children}
  </div>
);
```

`cn` is `twMerge(clsx(inputs))` — `twMerge` resolves Tailwind class conflicts (last wins), `clsx` handles conditional/array inputs.

**Why:** makes the library overridable without forking. Consumer's `className` always wins for conflicting utilities; non-conflicting defaults compose.

---

### 15. Derived-state sync pattern (sparingly!)

When external prop changes should overwrite internal state, use the React-documented "call setState during render" pattern:

```tsx
const [prevUrl, setPrevUrl] = useState(url);
const [inputValue, setInputValue] = useState(url);

if (url !== prevUrl) {
  setPrevUrl(url);          // track "last seen"
  setInputValue(url);       // overwrite internal state
}
```

**Caveat:** This is the controversial React pattern. Use sparingly — only for "external source of truth should overwrite editable internal state" cases (URL inputs, controlled navigators). For most state, use `useEffect` or compute inline.

---

### 16. Skill-generation pipeline (if you ship a sandbox)

If the project includes an AI coding skill (many pixel-perfect projects do), auto-generate it from docs rather than maintaining by hand. Pipeline:

1. Read MDX source from docs
2. Strip JSX-only constructs (`<Preview>`, `<Callout>`, `<TypeTable>`)
3. Convert `<TypeTable type={{...}} />` to markdown tables (use a real MDX AST parser, **not regex** — see anti-patterns)
4. Rewrite internal import paths (`@repo/*` → `@/*`)
5. Output to `skills/{name}/SKILL.md`

Trigger on docs change via CI (path-filtered workflow), auto-commit regenerated skill.

---

## Required sandbox states for AI chat components

Every AI chat molecule/organism must render the following states as separate sandbox stories. See `docs/sandbox-spec.md` for the state-scenario spec.

| State | When to use |
|---|---|
| `default` | Populated, scrolled to bottom |
| `empty` | No messages / welcome state |
| `streaming` | Assistant message actively streaming |
| `error` | Error banner visible |
| `tool-running` | Tool-call in `input-available` state |
| `tool-complete` | Tool-call in `output-available` state |
| `reasoning-open` | Reasoning panel expanded during stream |
| `reasoning-closed` | Reasoning panel collapsed after stream |
| `loading` | Pre-stream / initial (Shimmer) |

Provide mock fixtures: a `__mocks__/chat-fixtures.ts` exporting typed `UIMessage[]` arrays per state.

---

## Accessibility — what ai-elements gets wrong, and the correct version

ai-elements has notable a11y gaps. The pixel-perfect version of these patterns **must** specify the correct behavior:

| Pattern | ai-elements (gap) | pixel-perfect (correct) |
|---|---|---|
| Conversation scroll container | No role | `role="log"` + `aria-live="polite"` so screen readers announce new messages |
| Streaming markdown | No live region | Wrap in `<div aria-live="polite" aria-atomic="false">` |
| Reasoning panel | Default Collapsible semantics | Add `aria-busy={isStreaming}` to the trigger |
| Tool-call status | Icon-only badge | Add `aria-label={statusLabels[state]}` to the badge |
| Scroll-to-bottom button | Conditional render | Keep mounted; toggle `aria-hidden` + `tabIndex={-1}` when hidden so AT behavior is predictable |

---

## Anti-patterns to avoid

1. **`useEffect` to sync children → context state.** If context state derives from `children` prop, compute inline — don't `useEffect`-push it. The ai-elements `MessageBranchContent` does this and it's fragile (causes extra renders + race conditions).

2. **Regex-based MDX parsing in skill generation.** Use a real MDX/JSX AST parser. Regex breaks on nested braces, escaped quotes, multiline JSX.

3. **Growing `vitest-fail-on-console` silence allowlist.** Each new upstream warning adds another `silenceMessage` return. Isolate tests from noisy deps instead. If you must use this discipline, audit the allowlist quarterly.

4. **Magic-number `containIntrinsicSize`.** `containIntrinsicSize: "auto 200px"` is a performance hack with arbitrary default. Causes scroll jumps if content differs. Use `ResizeObserver`.

5. **Single-browser test matrix (chromium only).** Acceptable cost trade for a Vercel-backed lib; questionable for general-purpose. At minimum, run WebKit in CI for any component using `IntersectionObserver`, `ResizeObserver`, or media APIs.

6. **No `role="log"` / `aria-live` on streaming containers.** See accessibility table above.

7. **Heavy default install.** If you ship a registry, do NOT bundle `@rive-app/react-webgl2`, `@xyflow/react`, `media-chrome` into every component's dep list. Allow lightweight install paths.

8. **No `peerDependencies` declaration.** If a component requires React 19 or the AI SDK v6, declare it as peer — don't surprise consumers with major-version conflicts at runtime.

---

## AI SDK type contract (React/TypeScript projects)

Components are typed against the `ai` package directly, not a local abstraction:

```tsx
import type { UIMessage, ToolUIPart, DynamicToolUIPart, FileUIPart, SourceDocumentUIPart, ChatStatus } from "ai";

type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];  // "user" | "assistant" | "system" | ...
};

const getMessageText = (message: UIMessage): string =>
  message.parts.filter((p) => p.type === "text").map((p) => p.text).join("");
```

Consumer wires up `useChat` from `@ai-sdk/react` and passes values through:

```tsx
import { useChat } from "@ai-sdk/react";

const { messages, status } = useChat();
return messages.map(({ role, parts }, i) => (
  <Message key={i} from={role}>
    <MessageContent>
      {parts.map((part, j) => part.type === "text" && (
        <MessageResponse key={`${i}-${j}`}>{part.text}</MessageResponse>
      ))}
    </MessageContent>
  </Message>
));
```

**The `parts[]` array on `UIMessage` is the unit of streaming.** Each part type (`text`, `tool-*`, `file`, etc.) maps to a component.

---

## Distribution model reference

If pixel-perfect ever ships an AI chat component **registry** (vs. atoms in user projects), the ai-elements model is worth replicating:

- **Not npm** — components are copy-in source via a CLI
- **CLI is a thin URL constructor** delegating to `shadcn@latest add <registry-url>`
- **Registry generated server-side** at request time from `packages/elements/src/*.tsx` using `ts-morph` to parse imports and resolve dependency graph
- **Cross-component deps** resolved as absolute URLs back to the registry so the CLI recursively fetches without the consumer knowing the graph
- **Adding a `.tsx` file** to `src/` immediately makes it installable — zero config

For most pixel-perfect projects this is overkill — components live in the user's repo, not a registry. The pattern is documented here for completeness.

---

## Cross-references

- `docs/state-patterns.md` — "Streaming-aware state" section supplements patterns 4, 8, 15
- `docs/styling-contracts/ai-chat-tailwind-web.md` — full styling contract for AI chat on Tailwind
- `docs/ecosystem-patterns.md` — "AI chat surface" row in the category table
- `docs/library-vetting-rubric.md` — "AI SDK dependency vetting" section
- `docs/sandbox-spec.md` — AI chat state scenarios
- `docs/design-systems/shadcn-ui.md` — shadcn primitives underlying most patterns

---

## Sources

This document distills vercel/ai-elements (assimilated 2026-06-20, sophistication 5/5, holocron doc `js7d0qvx9wskx4rg2tq3a5dv9n891tcw`). Specific code references:

- `packages/elements/src/reasoning.tsx` — patterns 1, 2, 4, 8
- `packages/elements/src/message.tsx` — patterns 1, 6, 13
- `packages/elements/src/prompt-input.tsx` — pattern 3
- `packages/elements/src/tool.tsx` — patterns 5, 9
- `packages/elements/src/code-block.tsx` — patterns 11, 12
- `packages/elements/src/shimmer.tsx`, `plan.tsx` — pattern 10
- `packages/elements/src/conversation.tsx` — pattern 7
- `packages/elements/src/web-preview.tsx` — pattern 15
- `apps/docs/app/api/registry/[component]/route.ts` — distribution model reference
- `packages/scripts/src/generate-skills.ts` — pattern 16

*Authored 2026-06-20.*
