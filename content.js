/**
 * content.js — Core content script
 * YouTube Shorts Cleaner Pro v1.0.0
 *
 * Responsibilities:
 * - Detect YouTube page type and SPA route changes
 * - Remove Shorts-related DOM elements via MutationObserver
 * - Redirect /shorts/<id> pages when enabled
 * - Track and report a per-session hidden-element count
 * - React to live settings changes from popup/storage
 */

// ---------------------------------------------------------------------------
// Config & Selectors
// ---------------------------------------------------------------------------
const CONFIG = {
  version: "1.0.0",
  debounceMs: 120,
  // CSS selectors targeting Shorts elements across YouTube layouts.
  // NOTE: YouTube's DOM is subject to change; these are accurate as of 2024-2025.
  selectors: {
    // Shelf / section containers on home/feed
    shelves: [
      "ytd-rich-shelf-renderer[is-shorts]",
      "ytd-reel-shelf-renderer",
      "ytd-shorts",
      "#shorts-container",
      "ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])",
      "ytd-rich-section-renderer:has(ytd-reel-shelf-renderer)",
    ],
    // Individual short video items in feeds / search
    items: [
      "ytd-video-renderer[is-shorts]",
      "ytd-grid-video-renderer[is-shorts]",
      "ytd-rich-item-renderer:has(a[href*='/shorts/'])",
      "ytd-compact-video-renderer:has(a[href*='/shorts/'])",
      "ytd-video-renderer:has(a[href*='/shorts/'])",
      "ytd-grid-video-renderer:has(a[href*='/shorts/'])",
      "ytd-search-pyv-renderer",
    ],
    // Left-sidebar navigation entry
    sidebar: [
      "ytd-guide-entry-renderer:has(a[title='Shorts'])",
      "ytd-guide-entry-renderer:has(a[href='/shorts'])",
      "ytd-mini-guide-entry-renderer:has(a[title='Shorts'])",
      "ytd-mini-guide-entry-renderer:has(a[href='/shorts'])",
    ],
    // Channel page / home Shorts section
    channelSections: [
      "ytd-item-section-renderer:has(ytd-reel-shelf-renderer)",
      "yt-related-chip-cloud-renderer:has([title='Shorts'])",
    ],
  },
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let settings = {
  enabled: true,
  hideHomeShelves: true,
  hideSearchResults: true,
  hideSidebar: true,
  redirectShorts: true,
  showCounter: true,
};

let hiddenCount = 0;
let observer = null;
let lastUrl = location.href;
// WeakSet prevents double-processing the same node.
const processedNodes = new WeakSet();
let debounceTimer = null;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function log(...args) {
  // Keep console clean in production; flip to true while debugging.
  if (false) console.log("[YT-Shorts-Cleaner]", ...args);
}

/** Debounce: delay fn execution until calls stop for `ms` milliseconds. */
function debounce(fn, ms) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), ms);
  };
}

/** Safely hide a single element and increment the counter. */
function hideElement(el) {
  if (!el || processedNodes.has(el)) return false;
  processedNodes.add(el);
  el.style.setProperty("display", "none", "important");
  hiddenCount++;
  return true;
}

/**
 * Query the document for all selector matches and hide them.
 * @param {string[]} selectorList
 * @param {Element|Document} root
 */
function hideAll(selectorList, root = document) {
  const combined = selectorList.join(",");
  try {
    root.querySelectorAll(combined).forEach(hideElement);
  } catch {
    // :has() not supported in older environments — fall back one by one
    selectorList.forEach((sel) => {
      try {
        root.querySelectorAll(sel).forEach(hideElement);
      } catch {
        /* selector unsupported, skip */
      }
    });
  }
}

/** Report the current hidden count to the background service worker. */
function reportCount() {
  if (!settings.showCounter) return;
  chrome.runtime.sendMessage({ type: "UPDATE_BADGE", count: hiddenCount }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Shorts detection & redirection
// ---------------------------------------------------------------------------

function isShortsPage(url = location.href) {
  return /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/.test(url);
}

function getShortsId(url = location.href) {
  const m = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * Redirect the current tab away from a Shorts URL.
 * Guards against redirect loops by checking the new URL before navigating.
 */
function redirectFromShorts() {
  if (!settings.redirectShorts || !isShortsPage()) return;

  const videoId = getShortsId();
  const target = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : "https://www.youtube.com/";

  // Avoid a loop if we somehow end up back here.
  if (location.href === target) return;

  log("Redirecting Shorts →", target);
  location.replace(target);
}

// ---------------------------------------------------------------------------
// DOM cleaning passes
// ---------------------------------------------------------------------------

/**
 * Full-page sweep: run all selector groups depending on active settings.
 * Called on initial load, route change, and after large DOM mutations.
 */
function cleanPage() {
  if (!settings.enabled) return;

  const prevCount = hiddenCount;

  if (settings.hideHomeShelves) {
    hideAll(CONFIG.selectors.shelves);
    hideAll(CONFIG.selectors.channelSections);
  }

  if (settings.hideSearchResults) {
    hideAll(CONFIG.selectors.items);
  }

  if (settings.hideSidebar) {
    hideAll(CONFIG.selectors.sidebar);
  }

  if (hiddenCount !== prevCount) {
    reportCount();
  }
}

/**
 * Lightweight pass over a newly inserted subtree.
 * Only checks the specific subtree to avoid expensive full-page queries.
 */
function cleanSubtree(root) {
  if (!settings.enabled || !root || !(root instanceof Element)) return;

  let changed = false;
  const prevCount = hiddenCount;

  const check = (selectorList) => {
    const combined = selectorList.join(",");
    try {
      // Check if the root itself matches
      if (root.matches?.(combined)) {
        changed = hideElement(root) || changed;
      }
      // Check descendants
      root.querySelectorAll(combined).forEach((el) => {
        changed = hideElement(el) || changed;
      });
    } catch {
      selectorList.forEach((sel) => {
        try {
          if (root.matches?.(sel)) changed = hideElement(root) || changed;
          root.querySelectorAll(sel).forEach((el) => {
            changed = hideElement(el) || changed;
          });
        } catch {
          /* skip unsupported selector */
        }
      });
    }
  };

  if (settings.hideHomeShelves) {
    check(CONFIG.selectors.shelves);
    check(CONFIG.selectors.channelSections);
  }
  if (settings.hideSearchResults) {
    check(CONFIG.selectors.items);
  }
  if (settings.hideSidebar) {
    check(CONFIG.selectors.sidebar);
  }

  if (hiddenCount !== prevCount) {
    reportCount();
  }
}

// ---------------------------------------------------------------------------
// MutationObserver
// ---------------------------------------------------------------------------

const debouncedCleanPage = debounce(cleanPage, CONFIG.debounceMs);

function startObserver() {
  if (observer) return; // already running

  observer = new MutationObserver((mutations) => {
    if (!settings.enabled) return;

    let needsFullSweep = false;

    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;

      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;

        // Large batch inserts (e.g. initial feed render) → defer full sweep
        if (node.tagName === "YTD-APP" || node.tagName === "YTD-PAGE-MANAGER") {
          needsFullSweep = true;
          break;
        }

        cleanSubtree(node);
      }

      if (needsFullSweep) break;
    }

    if (needsFullSweep) {
      debouncedCleanPage();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  log("MutationObserver started");
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
    log("MutationObserver stopped");
  }
}

// ---------------------------------------------------------------------------
// SPA route-change detection
// YouTube navigates without full reloads; we watch the URL.
// ---------------------------------------------------------------------------

function onRouteChange(newUrl) {
  log("Route →", newUrl);

  // Reset per-page hidden count for a fresh tab feel
  hiddenCount = 0;
  reportCount();

  if (settings.redirectShorts && isShortsPage(newUrl)) {
    redirectFromShorts();
    return;
  }

  // Run a full sweep after navigation settles
  debouncedCleanPage();
}

function watchRouteChanges() {
  // YouTube uses history.pushState / replaceState for SPA navigation.
  const wrap = (original) =>
    function (...args) {
      const result = original.apply(this, args);
      const newUrl = location.href;
      if (newUrl !== lastUrl) {
        lastUrl = newUrl;
        onRouteChange(newUrl);
      }
      return result;
    };

  history.pushState = wrap(history.pushState);
  history.replaceState = wrap(history.replaceState);

  window.addEventListener("popstate", () => {
    const newUrl = location.href;
    if (newUrl !== lastUrl) {
      lastUrl = newUrl;
      onRouteChange(newUrl);
    }
  });

  // YouTube also fires yt-navigate-finish on its internal bus
  window.addEventListener("yt-navigate-finish", () => {
    const newUrl = location.href;
    if (newUrl !== lastUrl) {
      lastUrl = newUrl;
      onRouteChange(newUrl);
    }
  });
}

// ---------------------------------------------------------------------------
// Settings management
// ---------------------------------------------------------------------------

function applySettings(newSettings) {
  const wasEnabled = settings.enabled;
  settings = { ...settings, ...newSettings };

  if (!settings.enabled) {
    // Extension disabled — restore hidden elements
    stopObserver();
    restoreHiddenElements();
    hiddenCount = 0;
    reportCount();
    return;
  }

  // (Re)start observer if we just became enabled
  startObserver();

  if (!wasEnabled && settings.enabled) {
    cleanPage();
  } else {
    // Settings changed while running — do a fresh sweep
    cleanPage();
  }
}

/**
 * Restore all elements that were hidden by this extension.
 * We iterate document-wide looking for inline display:none we set.
 * The processedNodes WeakSet tells us which nodes we touched.
 */
function restoreHiddenElements() {
  // We can't iterate a WeakSet, so query all hidden candidates and unhide
  // those that were hidden by us (style has our !important rule).
  const allSelectors = [
    ...CONFIG.selectors.shelves,
    ...CONFIG.selectors.items,
    ...CONFIG.selectors.sidebar,
    ...CONFIG.selectors.channelSections,
  ].join(",");

  try {
    document.querySelectorAll(allSelectors).forEach((el) => {
      if (el.style.display === "none") {
        el.style.removeProperty("display");
      }
    });
  } catch {
    /* ignore selector errors */
  }
}

function loadSettings() {
  chrome.storage.sync.get("settings", ({ settings: stored }) => {
    if (stored) applySettings(stored);
    else applySettings({}); // use defaults already in `settings`
  });
}

// Listen for live changes from popup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.settings) {
    applySettings(changes.settings.newValue);
  }
});

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

function init() {
  // Handle Shorts redirect immediately before page renders content
  if (isShortsPage() && settings.redirectShorts) {
    // Load settings first then decide
    chrome.storage.sync.get("settings", ({ settings: stored }) => {
      if (stored) {
        settings = { ...settings, ...stored };
      }
      if (settings.enabled && settings.redirectShorts) {
        redirectFromShorts();
        return;
      }
      startUp();
    });
  } else {
    loadSettings();
    startUp();
  }
}

function startUp() {
  loadSettings();
  watchRouteChanges();
  startObserver();

  // Initial sweep once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cleanPage);
  } else {
    cleanPage();
  }
}

init();
