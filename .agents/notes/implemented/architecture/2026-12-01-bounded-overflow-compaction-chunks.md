# Agent Note: Bounded overflow compaction chunks

Status: implemented

English | [中文](2026-12-01-bounded-overflow-compaction-chunks.zh.md)

## Problem

When a session overflows its routed model's context window, overflow recovery previously compacted the entire compactable surface in one summarization call. That call replays the system prompt, tool schemas, the compacted region, and the compaction instruction to the same already-overflowed model — so the replay exceeds the window and throws `CONTEXT_WINDOW_EXCEEDED` again. Compaction fails, the session completes no turn, and it appears dead.

## Decision

### Overflow recovery sizes a chunk budget from the routed capacity

Overflow recovery resolves the routed model's advertised capacity via `ctx.llm.resolveModelInfo`. When a route advertises a `contextWindow`, recovery computes a per-chunk budget: `contextWindow − replayHeaderTokens − instructionTokens − maxTokens − overflowChunkHeadroomTokens`. `replayHeaderTokens` prices the request header through the new `TokenMeter.estimateHeader(header?)` service method; `instructionTokens` prices the exported `COMPACTION_INSTRUCTION_MESSAGE` through the heuristic the summarization replay uses; `maxTokens` is the summary-output cap; `overflowChunkHeadroomTokens` is a validated config field defaulting to `512`. Each chunk's replay plus summary output stays below the window, where the full overflowing surface did not.

### The oldest content compacts in bounded, balanced chunks

`selectCompactableChunk` selects a head-anchored, tool-pair-balanced leading chunk of the compactable overflow region whose shadowed tokens fit the budget. Recovery compacts that chunk, re-measures through the singleton token meter, and repeats until the surface fits or no chunk fits, so no single summarization call can overflow.

### Token measurement prices the header and the instruction

`TokenMeter` exposes `estimateHeader(header?)` as the instance face of the pure `estimateHeader` from `estimate.ts`, and the summarizer exports `COMPACTION_INSTRUCTION_MESSAGE` so overflow sizing prices the instruction through the same heuristic as the replay.

### Capacity-less and tiny-window routes keep the historical fallback

When a route advertises no capacity — an unregistered provider or an absent `context.contextWindow` — or the budget is not positive (the window cannot host one bounded chunk), overflow recovery falls back to the historical whole-surface compaction. Capacity-less routes and tiny-window deployments are not blocked.

## Testing

Unit tests cover `selectCompactableChunk`: a whole-range fit, a balanced partial cut that stops strictly before the whole range's end, and decline when the oldest balanced node exceeds the budget. A multi-chunk overflow integration test confirms recovery runs several bounded summarization calls before the surface fits. Config tests reject a negative `overflowChunkHeadroomTokens` and cover its `512` default. Token-meter tests cover the `estimateHeader` service method and its zero price for an absent header. Both packages retain 100% statement, branch, function, and line coverage.

## Alternatives considered

- **Retry the whole-surface summarization with a larger output cap** — rejected because the replay, not the output, exceeds the window; a larger cap leaves the input over it and the call still throws `CONTEXT_WINDOW_EXCEEDED`.
- **Shrink the surface model-free, then summarize once whole** — rejected because no model-free pass can guarantee a whole-surface replay that already exceeds the window will fit, and depending on the optional pruner breaks independent composition.
- **Reuse the retention-budget range selector** — rejected because its retained-tail budget is a retention policy, not a per-call replay cap; it cannot guarantee one summarization call fits the window.

## Consequences

- Overflow recovery is now capacity-aware: the overflow statement in the [routed model context and compaction policy Agent Note](2026-07-20-routed-model-context-and-compaction-policy.md) — that overflow bypasses capacity metadata and attempts one maximal balanced reduction — is superseded by this note, which owns canonical overflow behavior.
- Each chunked summarization call fits the routed window, so a single chunked reduction cannot throw `CONTEXT_WINDOW_EXCEEDED` and deadlock the session.
- Deployments tune the per-chunk reserved slack through the validated `overflowChunkHeadroomTokens` config field.
- Capacity-less and tiny-window routes keep the whole-surface reduction, so recovery is degraded, not blocked.
