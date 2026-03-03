<p align="center">
  <img src="icons/icon128.png" alt="YouTube Shorts Cleaner Pro" width="96" />
</p>

<h1 align="center">YouTube Shorts Cleaner Pro</h1>

<p align="center">
  <strong>A Chrome extension that removes YouTube Shorts from your feed — giving you a clean, distraction-free experience.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue?style=flat-square" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/version-1.0.1-green?style=flat-square" alt="Version 1.0.1" />
  <img src="https://img.shields.io/badge/chrome-105%2B-yellow?style=flat-square" alt="Chrome 105+" />
  <img src="https://img.shields.io/badge/license-MIT-purple?style=flat-square" alt="MIT License" />
</p>

---

## ✨ Features

| Feature | Description |
|:--------|:------------|
| 🏠 **Homepage Shelves** | Hides Shorts rows and shelves from the YouTube home feed |
| 🔍 **Search Results** | Removes Shorts cards from search result pages |
| 📌 **Sidebar Link** | Removes the "Shorts" entry from the left navigation sidebar |
| 🔀 **Auto-Redirect** | Automatically redirects `/shorts/<id>` to `/watch?v=<id>` |
| 🔢 **Badge Counter** | Shows how many Shorts elements were hidden in the current tab |
| ⚡ **Smart Detection** | Uses `MutationObserver` to handle YouTube's SPA navigation — no polling |
| 🎛️ **Per-Feature Toggles** | Enable or disable each feature independently via the popup |
| 🌙 **Dark Theme Popup** | Clean, modern dark UI with accessible toggle controls |

---

## 📦 Installation

> **Chrome Web Store** listing coming soon. For now, install as an unpacked extension:

1. **Clone** this repository:
   ```bash
   git clone https://github.com/yourusername/ytshortremover.git
   ```
2. Open **Chrome** and go to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **"Load unpacked"** and select the project folder
5. **Pin** the extension icon in your toolbar for easy access

---

## 🖼️ Screenshots

<p align="center">
  <em>Popup UI — toggle individual filters on/off</em>
</p>

<!-- Replace with actual screenshots -->
<!-- <p align="center">
  <img src="screenshots/popup.png" alt="Popup UI" width="320" />
  <img src="screenshots/before-after.png" alt="Before & After" width="640" />
</p> -->

---

## 🏗️ Architecture

```
ytshortremover/
├── manifest.json        # MV3 manifest — permissions, content scripts, popup
├── background.js        # Service worker — defaults on install, badge updates
├── content.js           # Core engine — MutationObserver, DOM hiding, redirect
├── styles.css           # Fast CSS hiding (injected at document_start)
├── popup.html           # Popup markup
├── popup.css            # Dark-theme popup styles
├── popup.js             # Popup logic — settings UI, badge count display
└── icons/               # Extension icons (16, 32, 48, 128 px)
```

### How It Works

#### Two-Layer Hiding Strategy

1. **CSS Layer** (`styles.css`) — Injected at `document_start` before the page renders. Hides unambiguous Shorts containers (`ytd-reel-shelf-renderer`, `ytd-shorts`, etc.) instantly, preventing any flash of Shorts content.

2. **JavaScript Layer** (`content.js`) — Runs a `MutationObserver` on the full document tree. Handles dynamic content, per-item filtering, and respects user settings. Uses a debounced full-page sweep + fast per-subtree pass for optimal performance.

#### SPA Navigation Handling

YouTube is a Single Page Application — it doesn't do full page reloads when navigating. The extension patches `history.pushState` / `replaceState` and listens for YouTube's `yt-navigate-finish` event to detect route changes and re-clean the page.

#### Watch Page Intelligence

On video watch pages (`/watch?v=...`), the extension uses a reduced set of selectors to avoid accidentally hiding the recommended videos sidebar. Only direct Shorts containers (like "Shorts remixing this video" shelves) are removed; regular video recommendations are left untouched.

---

## ⚙️ Settings

All settings are stored in `chrome.storage.sync` and apply instantly — no page reload required.

| Setting | Default | Description |
|:--------|:-------:|:------------|
| Enable Protection | ✅ | Master toggle for the entire extension |
| Homepage Shelves | ✅ | Hide Shorts rows on home feed |
| Search Results | ✅ | Remove Shorts from search results |
| Sidebar Link | ✅ | Remove Shorts entry from navigation |
| Redirect Shorts | ✅ | Auto-redirect `/shorts/` URLs to `/watch` |
| Show Counter | ✅ | Display hidden-element count on the badge |

---

## 🔒 Permissions

This extension requests minimal permissions:

| Permission | Why |
|:-----------|:----|
| `storage` | Persist user settings via `chrome.storage.sync` |
| `tabs` | Query the active tab to read/set the badge count |
| `host_permissions: youtube.com/*` | Inject content script and CSS into YouTube pages |

> No data leaves your browser. No analytics. No tracking. Ever.

---

## ⚠️ Known Limitations

YouTube's DOM is **not a stable public API** and changes frequently. The selectors in this extension are verified as of **March 2026**, but may need updating after major YouTube redesigns.

**Most fragile selectors:**
- `ytd-rich-shelf-renderer[is-shorts]` — depends on the `is-shorts` attribute
- `:has(a[href*='/shorts/'])` — relies on CSS `:has()` support (Chrome 105+)
- `ytd-guide-entry-renderer:has(a[title='Shorts'])` — depends on the exact title string

**To update selectors:** Open YouTube → right-click a Shorts element → Inspect → find the component tag → update `CONFIG.selectors` in `content.js` and matching rules in `styles.css`.

---

## 🗺️ Roadmap

- [ ] **Selector auto-recovery** — Detect when selectors stop matching and warn the user
- [ ] **Per-channel whitelist** — Allow Shorts on specific channels
- [ ] **Keyboard shortcut** — Toggle the extension via `chrome.commands`
- [ ] **Session statistics** — Track cumulative blocked counts across sessions
- [ ] **Firefox support** — Cross-browser publishing with minor manifest changes
- [ ] **Auto-update selectors** — Fetch remote selector config (opt-in) to survive YouTube DOM changes

---

## 🤝 Contributing

Contributions are welcome! If YouTube changes its DOM and breaks the extension:

1. Open YouTube and right-click on a Shorts element → **Inspect**
2. Find the new component tag or attribute
3. Update `CONFIG.selectors` in `content.js` and the matching rules in `styles.css`
4. Submit a pull request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <sub>Built with ❤️ to make YouTube watchable again.</sub>
</p>
