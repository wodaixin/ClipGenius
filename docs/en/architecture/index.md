# Architecture

This section covers the high-level system design of ClipGenius.

## Sections

- [Overview](./overview.md) — Key architectural decisions and trade-offs
- [Provider Model](./provider-model.md) — AI provider abstraction layer
- [Data Flow](./data-flow.md) — End-to-end data path from clipboard to UI
- [Sync Strategy](./sync-strategy.md) — IndexedDB-first, cloud wins, syncRev
- [Cross-Tab Sync](./cross-tab-sync.md) — BroadcastChannel + localStorage fallback
