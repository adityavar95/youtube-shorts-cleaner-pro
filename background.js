/**
 * background.js — Service Worker
 * YouTube Shorts Cleaner Pro
 *
 * Responsibilities:
 * - Set default settings on first install
 * - Relay messages between popup and content scripts when needed
 * - Update extension badge with hidden-item count
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const VERSION = "1.0.0";

const DEFAULT_SETTINGS = {
  enabled: true,
  hideHomeShelves: true,
  hideSearchResults: true,
  hideSidebar: true,
  redirectShorts: true,
  showCounter: true,
};

// ---------------------------------------------------------------------------
// Install handler — write defaults only on first install
// ---------------------------------------------------------------------------
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }
});

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_BADGE") {
    const tabId = sender?.tab?.id;
    if (tabId == null) return;

    const count = message.count ?? 0;
    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count), tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#ff0000", tabId });
    } else {
      chrome.action.setBadgeText({ text: "", tabId });
    }
  }

  if (message.type === "GET_VERSION") {
    sendResponse({ version: VERSION });
  }

  // Return true to keep the message channel open for async responses
  return true;
});
