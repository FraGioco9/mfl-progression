import { invariant } from "./validation/assertions.mjs";
import { readValidationText } from "./validation-text.mjs";

const [bootstrapCore, appEntry] = await Promise.all([
  readValidationText("./bootstrap-core.js", import.meta.url),
  readValidationText("./modules/app-entry.js", import.meta.url),
]);

for (const token of [
  "function createClientPerformanceTimeline() {",
  "window.__mflClientPerformance = clientPerformance;",
  'clientPerformance.record("bootstrap-start"',
  'performance.mark(`mfl:${normalizedPhase}`, { detail: entry });',
  'window.dispatchEvent(new CustomEvent("mfl:client-timing", { detail: entry }));',
  "const CLIENT_TIMING_ENTRY_LIMIT = 200;",
  'clientPerformance.record("route-transition-start"',
  'clientPerformance.record("content-commit"',
  'clientPerformance.record("route-transition-complete"',
  'clientPerformance.record("route-visually-settled"',
]) {
  invariant(bootstrapCore.includes(token), `Canonical bootstrap client timing ownership is missing: ${token}`);
}

for (const token of [
  'recordClientTiming("data-request"',
  'recordClientTiming("data-response"',
  'source: "memory-cache"',
  'source: "in-flight"',
  'source: "network"',
  'recordClientTiming("core-ready"',
  'recordClientTiming("route-runtime-ready"',
  'recordClientTiming("content-commit"',
  'recordClientTiming("route-visually-settled"',
  'window.dispatchEvent(new CustomEvent("mfl:data-client-timing"',
]) {
  invariant(appEntry.includes(token), `Client startup/data timing is missing: ${token}`);
}

const contentCommit = appEntry.indexOf('recordClientTiming("content-commit"');
const routePaint = appEntry.indexOf("await runtimeWindow.__mflInteractionBusy?.waitForRoutePaint?.();", contentCommit);
const visuallySettled = appEntry.indexOf('recordClientTiming("route-visually-settled"', routePaint);
invariant(
  contentCommit >= 0 && routePaint > contentCommit && visuallySettled > routePaint,
  "Initial content commit must be recorded before the existing paint boundary, with visually-settled timing only after that boundary.",
);

const transitionEndStart = bootstrapCore.indexOf("function trackTransitionEnd(token) {");
const transitionEndStop = bootstrapCore.indexOf("\n    function begin(", transitionEndStart);
const transitionEnd = bootstrapCore.slice(transitionEndStart, transitionEndStop);
const spaContentCommit = transitionEnd.indexOf('clientPerformance.record("content-commit"');
const spaComplete = transitionEnd.indexOf('clientPerformance.record("route-transition-complete"', spaContentCommit);
const spaSettled = transitionEnd.indexOf('clientPerformance.record("route-visually-settled"', spaComplete);
invariant(
  transitionEndStart >= 0 && spaContentCommit >= 0 && spaComplete > spaContentCommit && spaSettled > spaComplete,
  "SPA route transitions must publish canonical content commit before transition completion and visual settlement.",
);
invariant(
  transitionEnd.includes('source: "navigation-release"'),
  "SPA content commit must identify canonical navigation release as its source.",
);

const networkResponse = appEntry.indexOf('source: "network"');
const legacyDataTiming = appEntry.indexOf('window.dispatchEvent(new CustomEvent("mfl:data-client-timing"', networkResponse);
invariant(
  networkResponse >= 0 && legacyDataTiming > networkResponse,
  "The new client performance stream must preserve the existing network data-client timing event for current consumers.",
);

invariant(
  !bootstrapCore.includes("MutationObserver")
    || bootstrapCore.indexOf('clientPerformance.record("route-visually-settled"')
      < bootstrapCore.indexOf("startupStateObserver = new MutationObserver"),
  "Route performance timing must be emitted from canonical navigation ownership rather than inferred from DOM mutation state.",
);

console.log("Canonical client performance timing covers bootstrap, core/runtime readiness, data transport sources, initial and SPA content commit, and route visual settlement without changing loading ownership.");