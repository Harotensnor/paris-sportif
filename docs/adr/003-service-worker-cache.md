# ADR 003 — Service Worker avec cache versionné

## Context

Cache offline et invalidation par `CACHE_VERSION`.

## Decision

Service Worker avec cache versionné. Cette décision est valable tant que le site reste statique, Winamax-only
et orienté confiance dans les chiffres.

## Consequences

Bumper obligatoire à chaque changement frontend.

## Links

- [Architecture](../wiki/Architecture.md)
- [Runbook](../RUNBOOK.md)
