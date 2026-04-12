# Managing History

The History Pane on the right side of the app displays all captured clipboard items. Items are sorted by pin status first, then by timestamp (most recent first).

## Search

The search bar at the top of the History Pane triggers fuzzy search across all items using [Fuse.js](https://fusejs.io/).

Search targets:
- `suggestedName` (weight: 0.4)
- `summary` (weight: 0.3)
- `content` (weight: 0.3)

Threshold: 0.4 (fairly permissive fuzzy matching). Results update in real time as you type.

To clear search, empty the search field or press Escape.

## Preview

Click any card to open the `PastePreview` modal, which renders the full content:
- Images/videos: rendered via `<img>` / `<video>` tags
- Code: syntax-highlighted via `react-syntax-highlighter`
- Markdown: rendered via `react-markdown` with `rehype-highlight`
- URLs: shown as clickable links
- Plain text: shown as formatted text

## Pin / Unpin

Click the pin icon on any card to pin it. Pinned items:
- Always appear at the top of the list
- Survive **Clear Unpinned** operations

Pinning updates the item's `isPinned` field and triggers a sync write.

## Edit Name and Summary

Double-click the name or summary on any card, or click the save button after focusing an editing field, to save changes. The `editingItemId` state in `usePasteStore` tracks which item is being edited. The `editingIds` Set in `tabSync` prevents one tab from overwriting edits made in another tab.

## Delete

Click the delete icon on any card to soft-delete it. The item is marked `isDeleted: true` with a `deletedAt` timestamp, removed from the UI immediately.

## Clear Unpinned

The **Clear Unpinned** action (available in the History Pane header or context menu) soft-deletes all non-pinned items in bulk. Pinned items are preserved.

## Content Preview Truncation

Text content longer than 2000 characters is truncated in the card preview (stored in React state) to avoid rendering very large DOM nodes. The full content is preserved in IndexedDB.
