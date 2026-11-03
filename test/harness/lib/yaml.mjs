// YAML subset reader — shared by the sprint-01 flows.
//
// GitHub Actions workflows use block mappings, block sequences, empty flow collections,
// flow sequences of scalars, quoted scalars and block scalars. That subset is read here so
// the flows can assert the real bytes of a workflow file with no third-party dependency and
// no network call. Anything outside the subset is left as the literal string it parsed as.

function stripComment(text) {
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "#" && (index === 0 || /\s/.test(text[index - 1]))) return text.slice(0, index);
  }
  return text;
}

function unquote(text) {
  const trimmed = text.trim();
  if (trimmed.length >= 2 && ((trimmed[0] === '"' && trimmed.at(-1) === '"') || (trimmed[0] === "'" && trimmed.at(-1) === "'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// Index of the `:` that separates a key from its value, skipping quoted regions.
function keySeparator(text) {
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ":" && (index === text.length - 1 || text[index + 1] === " ")) return index;
  }
  return -1;
}

function splitFlow(text) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = "";
  for (const char of text) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "[" || char === "{") depth += 1;
    if (char === "]" || char === "}") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function parseScalar(text) {
  const trimmed = text.trim();
  if (trimmed === "{}") return {};
  if (trimmed === "[]") return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return splitFlow(trimmed.slice(1, -1)).map(parseScalar);
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const out = {};
    for (const pair of splitFlow(trimmed.slice(1, -1))) {
      const separator = keySeparator(pair);
      if (separator === -1) continue;
      out[unquote(pair.slice(0, separator))] = parseScalar(pair.slice(separator + 1));
    }
    return out;
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null" || trimmed === "~") return null;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  return unquote(trimmed);
}

function tokenize(text) {
  return text.split("\n").map((raw) => ({
    raw,
    indent: raw.length - raw.trimStart().length,
    text: raw.trim(),
  }));
}

function nextSignificant(tokens, index) {
  for (let cursor = index; cursor < tokens.length; cursor += 1) {
    if (tokens[cursor].text && !tokens[cursor].text.startsWith("#")) return cursor;
  }
  return -1;
}

function readBlockScalar(tokens, index, parentIndent) {
  const body = [];
  let cursor = index;
  while (cursor < tokens.length && (tokens[cursor].raw.trim() === "" || tokens[cursor].indent > parentIndent)) {
    body.push(tokens[cursor].raw);
    cursor += 1;
  }
  return [body.join("\n").trim(), cursor];
}

function parseMapping(tokens, start, indent) {
  const out = {};
  let cursor = start;
  for (;;) {
    const index = nextSignificant(tokens, cursor);
    if (index === -1) return [out, tokens.length];
    const token = tokens[index];
    if (token.indent !== indent || token.text.startsWith("- ")) return [out, index];
    const separator = keySeparator(token.text);
    if (separator === -1) return [out, index];
    const key = unquote(token.text.slice(0, separator));
    const rest = token.text.slice(separator + 1).trim();
    if (/^[|>][+-]?$/.test(rest)) {
      const [body, next] = readBlockScalar(tokens, index + 1, indent);
      out[key] = body;
      cursor = next;
      continue;
    }
    if (rest !== "") {
      out[key] = parseScalar(rest);
      cursor = index + 1;
      continue;
    }
    const [value, next] = parseNode(tokens, index + 1, indent + 1);
    out[key] = value;
    cursor = next;
  }
}

function parseSequence(tokens, start, indent) {
  const out = [];
  let cursor = start;
  for (;;) {
    const index = nextSignificant(tokens, cursor);
    if (index === -1) return [out, tokens.length];
    const token = tokens[index];
    if (token.indent !== indent || !token.text.startsWith("-")) return [out, index];
    const rest = token.text.slice(1).trim();
    if (rest === "") {
      const [value, next] = parseNode(tokens, index + 1, indent + 1);
      out.push(value);
      cursor = next;
      continue;
    }
    const separator = keySeparator(rest);
    if (separator === -1) {
      out.push(parseScalar(rest));
      cursor = index + 1;
      continue;
    }
    // `- key: value` starts a mapping whose remaining keys sit at the key's own column.
    const keyColumn = indent + (token.text.length - token.text.slice(1).trimStart().length);
    const key = unquote(rest.slice(0, separator));
    const valueText = rest.slice(separator + 1).trim();
    const entry = {};
    let next;
    if (valueText === "") {
      const [value, after] = parseNode(tokens, index + 1, keyColumn + 1);
      entry[key] = value;
      next = after;
    } else {
      entry[key] = parseScalar(valueText);
      next = index + 1;
    }
    const sibling = nextSignificant(tokens, next);
    if (sibling !== -1 && tokens[sibling].indent === keyColumn && !tokens[sibling].text.startsWith("- ")) {
      const [more, after] = parseMapping(tokens, sibling, keyColumn);
      Object.assign(entry, more);
      next = after;
    }
    out.push(entry);
    cursor = next;
  }
}

function parseNode(tokens, start, indent) {
  const index = nextSignificant(tokens, start);
  if (index === -1) return [null, tokens.length];
  if (tokens[index].indent < indent) return [null, index];
  if (tokens[index].text.startsWith("- ")) return parseSequence(tokens, index, tokens[index].indent);
  return parseMapping(tokens, index, tokens[index].indent);
}

/**
 * Parses the YAML subset GitHub Actions workflows use.
 *
 * @param {string} text
 * @returns {Record<string, unknown>}
 */
export function parseYaml(text) {
  const [value] = parseNode(tokenize(text), 0, 0);
  return value ?? {};
}
