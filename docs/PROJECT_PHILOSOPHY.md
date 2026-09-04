# Project Philosophy: Living Repository Maps

Cartodex treats a repository map as living operational context, not as static documentation.

The source code remains the source of truth. Tests and CI tell us whether the system still works. ADRs explain why important decisions were made. `docs/CARTODEX_MAP.md` explains where things are now: the major parts of the codebase, how they relate, where important flows live, and what a human or coding agent should understand before making changes.

A map should be updated when stale context would mislead someone.

Between updates, a map is always somewhat stale. That is normal and acceptable; what is not acceptable is staleness that hides. A map should know exactly which version of the repository it describes, and it should be able to say which of its own sections to distrust after the code has moved on. An honestly stale map, one that carries its commit of origin and a current drift report, is still safe to use: a reader knows what to verify before relying on it. A silently stale map is the dangerous kind, because it is indistinguishable from a fresh one. Cartodex therefore treats freshness as something to measure and declare, not something to assume.

That usually means updating the map when a change adds, removes, renames, or reorganizes an important part of the system; changes a public API, CLI, build flow, deployment flow, data model, security boundary, or cross-module integration; or changes how contributors should navigate or modify the repository.

A map does not need to change for every bug fix or small internal implementation detail. Cartodex maps structure, ownership, flows, and boundaries. It should stay useful, compact, and decision-oriented.

For small projects, one `docs/CARTODEX_MAP.md` is usually enough. Update it during pull request review when a structural change lands, and refresh it before releases, handoffs, or onboarding.

For large projects, `docs/CARTODEX_MAP.md` should remain the primary orientation layer. It does not need to describe every file, package, or service exhaustively. It should identify the major domains, services, packages, or platforms; explain how they relate; and point contributors toward the right areas.

When a repository is too large to map in full, Cartodex can focus on the highest-value top-level modules or the areas affected by recent changes. Teams may maintain additional area-specific maps by convention, but today Cartodex treats the top-level `docs/CARTODEX_MAP.md` as the canonical entry point.

Cartodex divides work between two kinds of tools and keeps the boundary strict. Language models do the fuzzy work: reading code, judging what matters, writing prose a contributor can actually use. Deterministic checks do the trusting: verifying that every path the map claims still exists, that no part of the repository is silently uncovered, and that the map's own metadata is consistent. Generated, then verified. The model is never the last step. Any future artifact Cartodex produces should follow the same rule and ship with its own cheap, mechanical verifier.

Cartodex also does not prescribe a workflow. Some teams refresh a map before releases, some on every merge, some only when a check in CI tells them to. The tool provides mechanisms: measure drift, validate consistency, refresh what changed, and every one of them runs only when asked. Nothing happens in the background, and no model is invoked without an explicit request. Cadence is the user's decision; Cartodex's job is to make any cadence cheap and safe.

The goal is simple: after every meaningful change, the repository should still be understandable by a new contributor, a maintainer returning after time away, and an AI coding agent preparing to work safely.
