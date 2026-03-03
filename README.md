# YouTube Shorts Cleaner Pro

A production-quality **Chrome Extension (Manifest V3)** that removes YouTube Shorts from the YouTube UI and optionally redirects `/shorts/` URLs to the standard watch player.

---

## Features

| Feature | Description |
|---|---|
| 🏠 Homepage Shelves | Hides Shorts rows/shelves from the YouTube home feed |
| 🔍 Search Results | Removes Shorts cards from search result pages |
| 📌 Sidebar Link | Removes the "Shorts" entry from the left navigation sidebar |
| 🔀 Redirect Shorts | Automatically redirects `/shorts/<id>` to `/watch?v=<id>` |
| 🔢 Badge Counter | Shows how many elements were hidden in the current tab |
| 🌙 Dark Theme UI | Clean, modern popup with accessible controls |
| ⚡ MutationObserver | Handles YouTube's SPA dynamic loading without `setInterval` |

---

## Installation (Unpacked Extension)

1. **Download or clone** this repository to a local folder.
2. Open **Google Chrome** and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **"Load unpacked"**.
5. Select the root folder of this project (the one containing `manifest.json`).
6. The extension icon will appear in your toolbar. Pin it for easy access.

> **Note:** Icons at `icons/icon16.png`, `icons/icon32.png`, `icons/icon48.png`, and `icons/icon128.png` are referenced by the manifest. Add your own PNG icons in those sizes, or remove the `icons` fields from `manifest.json` to use the default puzzle-piece icon.

---

## Architecture

```
ytshortremover/
├── manifest.json       MV3 manifest — permissions, content scripts, popup
├── background.js       Service worker — defaults on install, badge updates
├── content.js          Core logic — MutationObserver, DOM hiding, redirect
├── styles.css          CSS injected at document_start for fast initial hiding
├── popup.html          Popup markup
├── popup.css           Dark-theme popup styles
├── popup.js            Popup logic — load/save settings, render state
└── icons/              Extension icons (16, 32, 48, 128 px)
```

### How it works

#### `content.js`
- Runs at `document_start` on all `youtube.com` pages.
- Reads settings from `chrome.storage.sync` once on load, then listens for `storage.onChanged` for live updates from the popup.
- Patches `history.pushState` / `history.replaceState` and listens for `yt-navigate-finish` to detect YouTube's SPA route changes.
- Uses a single `MutationObserver` on `document.documentElement` with `childList + subtree`. On each batch of mutations, it either runs a fast per-subtree pass (for small additions) or a debounced full-page sweep (for large renders like initial feed load).
- Tracks processed nodes in a `WeakSet` to avoid duplicate work and memory leaks.
- Sends badge count updates to the background service worker after each pass.

#### `background.js`
- Writes `DEFAULT_SETTINGS` to `chrome.storage.sync` on first install.
- Receives `UPDATE_BADGE` messages from content scripts and calls `chrome.action.setBadgeText`.

#### `styles.css`
- Injected by the browser before the page renders, providing immediate CSS-based hiding for known selector patterns. This prevents a flash of Shorts content before JavaScript runs.

#### `popup.html / popup.css / popup.js`
- Reads settings from storage and renders them.
- Saves settings immediately on each toggle change (no "Save" button needed).
- The "Reset to Defaults" button restores factory settings and re-renders the UI.
- Reads the badge text of the active tab to display the hidden-element count.

---

## Permissions Used

| Permission | Reason |
|---|---|
| `storage` | Persist user settings via `chrome.storage.sync` |
| `tabs` | Query the active tab's ID to read/set the badge count |
| `host_permissions: youtube.com/*` | Inject content script and CSS into YouTube pages |

---

## Known Selector Limitations

YouTube's DOM is **not a stable public API** and changes frequently. The selectors used in this extension are accurate as of early 2025, but may need updating if YouTube rolls out major redesigns.

**Most fragile selectors:**
- `ytd-rich-shelf-renderer[is-shorts]` — depends on YouTube keeping the `is-shorts` attribute.
- `:has(a[href*='/shorts/'])` — relies on CSS `:has()` support (Chrome 105+) and YouTube keeping `/shorts/` in href attributes.
- `ytd-guide-entry-renderer:has(a[title='Shorts'])` — depends on the exact title string remaining "Shorts".

**Fallback:** `styles.css` also hides `ytd-reel-shelf-renderer` which is the internal component name used for Shorts shelves, and is generally more stable than attribute-based selectors.

**To update selectors:** Open YouTube, right-click a Shorts element → Inspect, find the component tag, and update `CONFIG.selectors` in `content.js` and the matching rules in `styles.css`.

---

## Future Improvements

1. **Selector auto-recovery** — Test selectors on load and log a warning when none match, making it easier to detect when YouTube changes its DOM.
2. **Block list export** — Allow users to export a log of blocked Shorts URLs.
3. **Per-domain statistics** — Track and display cumulative blocked counts across sessions using `chrome.storage.local`.
4. **Whitelist mode** — Allow users to temporarily allow Shorts on specific channels.
5. **Keyboard shortcut** — Add a `chrome.commands` shortcut to toggle the extension on/off without opening the popup.
6. **Auto-update selectors** — Fetch a remotely hosted selector config (with user opt-in) to survive YouTube DOM changes without requiring an extension update.
7. **Firefox support** — The extension is largely compatible with Firefox's MV3 implementation; minor changes to the manifest would enable cross-browser publishing.
