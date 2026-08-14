#!/usr/bin/env node
// findings.mjs — validate polish findings against the shipped schema + law 9.
// A finding with only a model-guessed bbox (no ax_ref / testID) is invalid.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

export const TIERS = ["T1", "T2", "T3"];
export const SEVERITIES = ["BLOCKER", "MAJOR", "MINOR", "POLISH"];

const REQUIRED = [
  "screen",
  "state",
  "platform",
  "lens",
  "principle",
  "tier",
  "severity",
  "observed",
  "proposal",
  "element",
  "evidence",
  "fingerprint",
];

export const SCHEMA_REL = "skills/polish/findings-schema.json";

export function loadFindingsSchema(pluginRoot) {
  return JSON.parse(readFileSync(join(pluginRoot, SCHEMA_REL), "utf8"));
}

export function findingFingerprint(screen, principle, axRef) {
  return createHash("sha1").update(`${screen}|${principle}|${axRef}`).digest("hex");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function targetingRef(element) {
  if (!element || typeof element !== "object") return "";
  if (isNonEmptyString(element.ax_ref)) return element.ax_ref.trim();
  if (isNonEmptyString(element.testID)) return element.testID.trim();
  return "";
}

export function validateFinding(finding) {
  const errors = [];
  if (finding == null || typeof finding !== "object" || Array.isArray(finding)) {
    return { ok: false, errors: ["finding must be an object"] };
  }
  for (const key of REQUIRED) {
    if (!(key in finding)) errors.push(`missing field: ${key}`);
  }
  for (const key of ["screen", "state", "platform", "lens", "principle", "observed", "proposal", "fingerprint"]) {
    if (key in finding && !isNonEmptyString(finding[key])) errors.push(`${key} must be a non-empty string`);
  }
  if (finding.tier != null && !TIERS.includes(finding.tier)) {
    errors.push(`tier must be T1|T2|T3, got ${JSON.stringify(finding.tier)}`);
  }
  if (finding.severity != null && !SEVERITIES.includes(finding.severity)) {
    errors.push(`severity must be BLOCKER|MAJOR|MINOR|POLISH, got ${JSON.stringify(finding.severity)}`);
  }
  if (finding.element != null) {
    if (typeof finding.element !== "object" || Array.isArray(finding.element)) {
      errors.push("element must be an object");
    } else {
      if (!("ax_ref" in finding.element) && !("testID" in finding.element)) {
        errors.push("element must include ax_ref or testID");
      }
      const ref = targetingRef(finding.element);
      if (!ref) {
        errors.push("element must target an ax_ref or testID — model-guessed coordinates are not a target (law 9)");
      }
      if (finding.element.bbox != null) {
        const b = finding.element.bbox;
        if (typeof b !== "object" || ["x", "y", "width", "height"].some((k) => typeof b[k] !== "number")) {
          errors.push("element.bbox must be null or {x,y,width,height} numbers");
        }
      }
    }
  }
  if (finding.evidence != null) {
    if (typeof finding.evidence !== "object" || Array.isArray(finding.evidence) || !("shot" in finding.evidence)) {
      errors.push("evidence.shot is required (string path or null for RENDER)");
    } else if (finding.evidence.shot != null && !isNonEmptyString(finding.evidence.shot)) {
      errors.push("evidence.shot must be a path string or null");
    }
  }
  return { ok: errors.length === 0, errors };
}

export function exampleFinding(overrides = {}) {
  const base = {
    screen: "orders",
    state: "empty",
    platform: "web",
    lens: "composition@1.0",
    principle: "D3",
    tier: "T1",
    severity: "MAJOR",
    observed: "The heading text overflows the card on the right edge.",
    proposal: "Raise the card min-height or allow the heading to wrap at the token max-width.",
    element: { ax_ref: "orders-empty-heading", bbox: null },
    evidence: { shot: "design/polish/runs/<ts>/shots/orders.empty.png" },
    fingerprint: findingFingerprint("orders", "D3", "orders-empty-heading"),
  };
  return { ...base, ...overrides, element: { ...base.element, ...(overrides.element || {}) }, evidence: { ...base.evidence, ...(overrides.evidence || {}) } };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const raw = readFileSync(0, "utf8");
  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed) ? parsed : [parsed];
  let failed = 0;
  for (const item of items) {
    const result = validateFinding(item);
    if (!result.ok) {
      failed += 1;
      process.stderr.write(`${result.errors.join("; ")}\n`);
    }
  }
  process.exit(failed === 0 ? 0 : 1);
}
