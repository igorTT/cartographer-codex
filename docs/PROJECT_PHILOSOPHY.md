# Project Philosophy: Living Repository Maps

Cartodex treats a repository map as living operational context, not as static documentation.

The source code remains the source of truth. Tests and CI tell us whether the system still works. ADRs explain why important decisions were made. `docs/CARTODEX_MAP.md` explains where things are now: the major parts of the codebase, how they relate, where important flows live, and what a human or coding agent should understand before making changes.

A map should be updated when stale context would mislead someone.

That usually means updating the map when a change adds, removes, renames, or reorganizes an important part of the system; changes a public API, CLI, build flow, deployment flow, data model, security boundary, or cross-module integration; or changes how contributors should navigate or modify the repository.

A map does not need to change for every bug fix or small internal implementation detail. Cartodex maps structure, ownership, flows, and boundaries. It should stay useful, compact, and decision-oriented.

For small projects, one `docs/CARTODEX_MAP.md` is usually enough. Update it during pull request review when a structural change lands, and refresh it before releases, handoffs, or onboarding.

For large projects, `docs/CARTODEX_MAP.md` should remain the primary orientation layer. It does not need to describe every file, package, or service exhaustively. It should identify the major domains, services, packages, or platforms; explain how they relate; and point contributors toward the right areas.

When a repository is too large to map in full, Cartodex can focus on the highest-value top-level modules or the areas affected by recent changes. Teams may maintain additional area-specific maps by convention, but today Cartodex treats the top-level `docs/CARTODEX_MAP.md` as the canonical entry point.

The goal is simple: after every meaningful change, the repository should still be understandable by a new contributor, a maintainer returning after time away, and an AI coding agent preparing to work safely.
