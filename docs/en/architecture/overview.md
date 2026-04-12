# Architecture Overview

## Key Design Decisions

### A. Clipboard Capture at the `window` Level

The `paste` event listener is attached directly to `window` and filters out events from `<input>`, `<textarea>`, and `contenteditable` elements. This allows the app to work regardless of which DOM element has focus.

**Why**: A clipboard manager must capture clipboard events globally. Attaching to individual components would miss events when the app has no focus or when focus is elsewhere.

**Trade-off**: Complex focus filtering logic. Must be kept in sync with DOM changes.

### B. IndexedDB as Local Source of Truth

`AppContext` state is the runtime copy. `src/lib/db.ts` (IndexedDB via `idb`) is the persistent local store.

**Why**: IndexedDB is the only way to store large base64 blobs (images/videos up to many MBs) persistently in the browser. localStorage has a 5MB limit.

### C. Per-Feature AI Provider Routing

Each feature (analysis, chat, live voice, image generation) independently selects a provider via `VITE_<FEATURE>_PROVIDER` env vars or in-app Settings. `src/services/ai/providers/index.ts` is the router; `src/services/ai/providers/capabilities.ts` defines which content types each provider supports.

**Why**: Minimax is cheaper and sometimes faster for text-only tasks. Gemini is required for multimodal content. Allowing per-feature routing lets users optimize cost and capability.

**Trade-off**: Multiple provider configurations increase setup complexity.

### D. Soft-Delete with `isDeleted` Flag

Paste items are never hard-deleted. Instead, `isDeleted: true` and `deletedAt` are set.

**Why**: Ensures data consistency within a single user's local storage. Deletions are tracked as state changes.

### E. `syncRev` as Sole Conflict Resolution Mechanism

A simple monotonically increasing integer is used instead of vector clocks or operational transforms.

**Why**: Clipboard items are independent and have no causal ordering requirements. Last-write-wins with a single sequence number is sufficient.

**Trade-off**: Concurrent edits on the same item from two devices cannot be merged intelligently.

### F. `GoogleGenAI` Instances Created Per-Call

`@google/genai` SDK instances are not cached. Each `analyze()`, `generateImage()`, or `startLiveSession()` call creates a fresh instance.

**Why**: API keys can be changed at runtime via in-app Settings. A cached singleton would retain a stale key.

**Trade-off**: Slightly higher per-call overhead (negligible compared to network latency).

### G. Cross-Tab Sync via BroadcastChannel with localStorage Fallback

The `tabSync.ts` module uses `BroadcastChannel` as the primary channel. For Safari compatibility, a `storage` event listener serves as a fallback.

**Why**: BroadcastChannel is the idiomatic Web API for cross-tab communication. It does not fire on the sender tab (avoiding loops).

**Trade-off**: BroadcastChannel is not supported in very old browsers. The storage event fallback has higher latency.

### H. `window.aistudio` Integration for Paid AI Studio Keys

Image generation in "Pro" mode calls `window.aistudio.openSelectKey()` and `window.aistudio.getSelectedApiKey()` rather than using the standard env var API key.

**Why**: AI Studio manages paid API keys. The `window.aistudio` global is provided by the AI Studio host environment and exposes only the keys the user has selected in the UI.

**Trade-off**: Pro mode only works in the AI Studio / Cloud Run environment where `window.aistudio` is available.

### I. Minimax API Proxied Through Vite Dev Server

In development, Minimax API calls go through `/api/minimax` → Vite proxy → `https://api.minimaxi.com/anthropic`.

**Why**: System proxies (e.g. Clash) may not route requests to `api.minimaxi.com` correctly. The Vite proxy acts as a bypass.

**Trade-off**: The proxy only works in the Vite dev server. In production on Cloud Run, the container must have direct internet access to `api.minimaxi.com`.
