# State Patterns by Framework

State policy reference for pixel-perfect projects. When a molecule, organism, or screen needs internal state, use the patterns below for the project's framework. Screens are additionally planned as a **route + a list of states** — see [Screens: Route + States](#screens-route--states).

## State Level Policy

| Level | State Policy | Examples |
|-------|-------------|----------|
| Atoms | **Stateless** — pure render from props. No internal state. | Button, Badge, Card, Input (controlled) |
| Molecules | **May be stateful** — manages interaction state internally when declared | SearchBar (input value + debounce), FormField (touched/dirty/validation), ToggleGroup (selection) |
| Organisms | **Stateful** — manages complex domain/UI state | DataTable (sort/pagination/selection), Accordion (open panels), CommandPalette (query + results) |
| Screens | **Stateful** — manages app/domain state | Full page state, data loading, routing |

**The rule:** If a molecule can be pure composition (props in, atoms out), it **must** be. State is opt-in and requires explicit declaration in the manifest with justification.

## State Manifest Format

When a molecule or organism is declared stateful in the BUILD PLAN, its manifest entry includes a `state` block:

```json
{
  "name": "SearchBar",
  "file": "src/molecules/SearchBar.tsx",
  "story": "src/molecules/SearchBar.stories.tsx",
  "status": "pending",
  "atoms": ["Input", "Button"],
  "state": {
    "declared": [
      { "name": "query", "type": "string", "initial": "''", "description": "Current input value" },
      { "name": "isFocused", "type": "boolean", "initial": "false", "description": "Whether input has focus" },
      { "name": "showSuggestions", "type": "boolean", "initial": "false", "description": "Whether suggestion dropdown is visible" }
    ],
    "scenarios": [
      { "name": "empty", "description": "No input, no focus, no suggestions" },
      { "name": "typing", "description": "User is typing, suggestions visible" },
      { "name": "no-results", "description": "Query submitted, no matches found" },
      { "name": "error", "description": "Search failed, error message displayed" }
    ]
  }
}
```

Stateless molecules carry `"state": null`. Every declared scenario must have a corresponding named story export.

## Screens: Route + States

A **screen** is the top-level stateful level. It is planned as a **route + a list of states** — not as one screen per visual state. Two views that differ only by state (default / empty / loading / error, or different tabs of one page) are **one screen** keyed by its route, carrying a `states` list.

```json
{
  "name": "Feed",
  "route": "/feed",
  "states": ["default", "empty", "loading", "error"],
  "file": "src/screens/Feed.tsx",
  "story": "src/screens/Feed.stories.tsx",
  "status": "pending",
  "atoms": ["StatusBadge", "DateChip", "SectionHeader"],
  "molecules": ["JobRow"],
  "organisms": []
}
```

- **`route`** is the page identity stripped of state — the dedup key. Platform-interpreted: web = URL path (`/feed`, `/jobs/:id`); mobile = navigator destination (`Feed`); TUI/desktop = named view (`feed`). Default when underived: web → `"/" + kebab-case(name)`; else `PascalCase(name)`.
- **`states`** is the screen-level analog of a molecule/organism's `state.scenarios` names. **Each state name maps to one sandbox story.** A single-state screen carries `["default"]` (or omits `states`).

**The override capability (not an API).** A screen **owns internal state** to switch between its listed states, and must be **drivable into any listed state** so each renders as its own story. *How* it's driven — internal state plus override/controlled props, the precedence rule, the per-framework idiom, the prop names — is **implementation logic owned by the implementer/adapter**. This document and the build plan describe the capability and the state list; they prescribe no prop shape or naming. Use the framework's state patterns below to own the internal state.

**State vs route — the collapse decision rule.** When grouping candidate views, a tab/sub-view is **a state of one route** when it shares the **same data + same URL + instant client-side toggle + shared layout chrome** (only a region swaps). It is **a separate route** (its own screen entry) when it **loads different data behind its own fetch boundary**, **needs a distinct URL / deep-link**, or **can be entered independently**. A parameterized route (`/jobs/:id`) is one screen — the `:id` is data, not a state. A modal/overlay over a page is a state of that page, not a route. When ambiguous, **ask the user** rather than collapsing silently.

## Framework Patterns

### React (useState / useReducer)

**Simple state (1-3 independent values):**

```tsx
const [query, setQuery] = useState('');
const [isFocused, setIsFocused] = useState(false);
const [showSuggestions, setShowSuggestions] = useState(false);
```

**Complex state (4+ related values, or interdependent transitions):**

```tsx
interface SearchState {
  query: string;
  isFocused: boolean;
  showSuggestions: boolean;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
}

type Action =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_FOCUS'; payload: boolean }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: SearchResult[] }
  | { type: 'FETCH_ERROR'; payload: string };

function searchReducer(state: SearchState, action: Action): SearchState {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.payload, showSuggestions: action.payload.length > 0 };
    case 'SET_FOCUS':
      return { ...state, isFocused: action.payload };
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, results: action.payload };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(searchReducer, initialState);
```

**Rule of thumb:** use `useState` for ≤3 independent values. Use `useReducer` when states are interdependent or there are 4+ values.

---

### Svelte 5 ($state / $derived runes)

```svelte
<script lang="ts">
  let query = $state('');
  let isFocused = $state(false);

  let showSuggestions = $derived(query.length > 0 && isFocused);
  let results = $state<SearchResult[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  async function onInput() {
    if (query.length < 2) return;
    isLoading = true;
    error = null;
    try {
      results = await fetchResults(query);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Search failed';
    }
    isLoading = false;
  }
</script>
```

---

### SwiftUI (@State / @Observable)

**Simple: @State properties:**

```swift
struct SearchBar: View {
    @State private var query = ""
    @State private var isFocused = false

    var body: some View {
        HStack {
            TextField("Search...", text: $query)
                .focused($isFocused)
        }
    }
}
```

**Complex: @Observable model:**

```swift
@Observable
class SearchBarModel {
    var query = ""
    var isFocused = false
    var showSuggestions: Bool { !query.isEmpty && isFocused }
    var results: [SearchResult] = []
    var isLoading = false
    var error: String? = nil
}

struct SearchBar: View {
    @State private var model = SearchBarModel()

    var body: some View {
        VStack {
            TextField("Search...", text: $model.query)
            if model.showSuggestions {
                SuggestionList(results: model.results)
            }
        }
    }
}
```

---

### GPUI (Entity + Model)

```rust
pub struct SearchBar {
    query: String,
    is_focused: bool,
    show_suggestions: bool,
    results: Vec<SearchResult>,
    isLoading: bool,
    error: Option<String>,
}

impl SearchBar {
    pub fn render(&self, cx: &mut ViewContext<Self>) -> impl IntoElement {
        div()
            .child(TextInput::new(cx, &self.query))
            .when(self.show_suggestions, |el| {
                el.child(SuggestionList::new(cx, &self.results))
            })
    }
}
```

**State mutation** happens through `cx.notify()` in event handlers that update the Entity. Each state change triggers a re-render of the element tree.

---

### Bubbletea (Model + Update)

```go
type SearchBarModel struct {
    query           string
    isFocused       bool
    showSuggestions bool
    results         []SearchResult
    isLoading       bool
    err             error
}

func (m SearchBarModel) Init() tea.Cmd {
    return nil
}

func (m SearchBarModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.Type {
        case tea.KeyBackspace:
            if len(m.query) > 0 {
                m.query = m.query[:len(m.query)-1]
            }
        default:
            m.query += msg.String()
        }
        m.showSuggestions = len(m.query) > 0 && m.isFocused
        return m, nil
    }
    return m, nil
}

func (m SearchBarModel) View() string {
    // Render using Lipgloss / Bubbletea primitives
}
```

**State in stories:** Create model instances initialized to specific values:

```go
// Story: Empty
SearchBarModel{query: "", isFocused: false, showSuggestions: false}

// Story: Typing
SearchBarModel{query: "hva", isFocused: true, showSuggestions: true}
```

---

### Textual (reactive / @on)

```python
from textual.reactive import reactive
from textual.widget import Widget

class SearchBar(Widget):
    query = reactive("")
    is_focused = reactive(False)
    results: reactive[list[dict]] = reactive([])
    isLoading = reactive(False)

    def compute_show_suggestions(self) -> bool:
        return bool(self.query) and self.is_focused

    def watch_query(self, old_value: str, new_value: str) -> None:
        if len(new_value) >= 2:
            self.run_worker(self._do_search(new_value))

    async def _do_search(self, q: str) -> None:
        self.isLoading = True
        try:
            self.results = await remote_search(q)
        except Exception as e:
            self.notify(str(e), severity="error")
        finally:
            self.isLoading = False
```

---

### Ink (React hooks for terminal UIs)

Ink uses React's hook system — `useState`, `useReducer`, `useEffect`, etc. All React state patterns apply. The rendering target is terminal output via ANSI instead of DOM.

```tsx
import { useState, useInput } from 'ink';

function SearchBar({ onSearch }: Props) {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    useInput((input, key) => {
        if (key.escape) {
            setIsFocused(false);
            return;
        }
        setQuery(prev => prev + input);
    });

    return (
        <Box>
            <Text>{isFocused ? '> ' : '  '}{query}</Text>
        </Box>
    );
}
```

---

## Streaming-aware state (AI chat components)

When a molecule or organism renders streamed LLM output, the standard `useState`/`useReducer` patterns are not enough. AI chat components have a distinct state shape: streaming flags, lifecycle-driven panel disclosure, and dual-mode (standalone vs provider-lifted) state sources. **See [`docs/ai-chat-patterns.md`](ai-chat-patterns.md) for the full pattern catalog** — the four patterns below are the state-specific subset.

### Pattern: Controlled/uncontrolled triple via Radix

Anything toggle-able (reasoning panel, branch selector, file tree expansion) uses the prop triple with `@radix-ui/react-use-controllable-state`:

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

Lets consumers pick: pass `open` to fully control, pass `defaultOpen` for uncontrolled, or pass neither for self-managed. Standardizes on Radix's implementation.

### Pattern: Reasoning lifecycle state machine

Reasoning panels follow a streaming-aware lifecycle — closed → stream starts → auto-open → stream ends → wait 1s → auto-close once. Requires a `hasAutoClosed` ref (one-shot gate) and a `hasEverStreamedRef` (so the close only fires after a real stream):

```tsx
const [hasAutoClosed, setHasAutoClosed] = useState(false);
const hasEverStreamedRef = useRef(false);
const startTimeRef = useRef<number | null>(null);

// Auto-close 1s after stream ends — exactly once, only after a real stream
useEffect(() => {
  if (hasEverStreamedRef.current && !isStreaming && isOpen && !hasAutoClosed) {
    const t = setTimeout(() => {
      setIsOpen(false);
      setHasAutoClosed(true);
    }, 1000);
    return () => clearTimeout(t);
  }
}, [isStreaming, isOpen, hasAutoClosed]);

useEffect(() => {
  if (isStreaming) hasEverStreamedRef.current = true;
}, [isStreaming]);
```

Full implementation in `docs/ai-chat-patterns.md` §8.

### Pattern: Dual-mode provider (standalone OR lifted state)

For components that should work both standalone and with parent-owned state, ship two hooks — one throws, one returns null:

```tsx
const ControllerContext = createContext<Controller | null>(null);

// Strict — sub-components that REQUIRE a parent provider use this
export const useController = () => {
  const ctx = useContext(ControllerContext);
  if (!ctx) throw new Error("Wrap your component inside <Provider>");
  return ctx;
};

// Lenient — the component itself uses this to detect provider presence
const useOptionalController = () => useContext(ControllerContext);

export const PromptInput = (props) => {
  const controller = useOptionalController();
  const usingProvider = !!controller;
  const files = usingProvider ? controller.attachments.files : localFiles;
  // ...
};
```

### Pattern: Memo with custom comparator for streaming content

LLM token streaming causes parent re-renders on every token. Children rendering streaming-derived content must use a custom memo comparator — default `memo()` shallow-compares all props including function references:

```tsx
export const MessageResponse = memo(
  (props: MessageResponseProps) => <Streamdown {...props} />,
  (prev, next) =>
    prev.children === next.children &&
    next.isAnimating === prev.isAnimating,
);
MessageResponse.displayName = "MessageResponse";  // required — memo anonymizes
```

### Anti-pattern: useEffect to sync children → context state

**Do NOT** push `children` into context state via `useEffect`. State derived from props should be computed inline:

```tsx
// ✗ wrong — fragile, causes extra renders
export const BranchContent = ({ children }) => {
  const { setBranches } = useBranch();
  useEffect(() => { setBranches(childrenToBranches(children)); }, [children]);
  return <>{children}</>;
};

// ✓ correct — compute inline
export const BranchContent = ({ children }) => {
  const branches = useMemo(() => childrenToBranches(children), [children]);
  return <BranchContext.Provider value={{ branches }}>{children}</BranchContext.Provider>;
};
```

### Anti-pattern: derived-state sync (use sparingly)

The "call setState during render" pattern (`if (external !== prevExternal) { setPrevExternal(external); setInternal(external); }`) is documented by React but controversial. Use **only** for "external source of truth should overwrite editable internal state" — URL inputs, controlled navigators. For most state, compute inline or use `useEffect`.