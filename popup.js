/**
 * popup.js — Popup UI logic
 * YouTube Shorts Cleaner Pro
 *
 * Responsibilities:
 * - Load settings from chrome.storage.sync
 * - Render current state to the UI
 * - Save settings instantly on toggle change
 * - Handle Reset-to-defaults
 * - Poll for the hidden count badge from the active tab
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
// Element references
// ---------------------------------------------------------------------------
const els = {
  masterToggle:      () => document.getElementById("masterToggle"),
  hideHomeShelves:   () => document.getElementById("hideHomeShelves"),
  hideSearchResults: () => document.getElementById("hideSearchResults"),
  hideSidebar:       () => document.getElementById("hideSidebar"),
  redirectShorts:    () => document.getElementById("redirectShorts"),
  showCounter:       () => document.getElementById("showCounter"),

  statusBadge:       () => document.getElementById("statusBadge"),
  statusLabel:       () => document.getElementById("statusLabel"),
  hiddenCount:       () => document.getElementById("hiddenCount"),
  statsBar:          () => document.getElementById("statsBar"),
  resetBtn:          () => document.getElementById("resetBtn"),
  versionLabel:      () => document.getElementById("versionLabel"),
};

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

/** Update the status badge in the header. */
function updateStatusBadge(enabled) {
  const badge = els.statusBadge();
  const label = els.statusLabel();
  if (!badge || !label) return;

  badge.classList.toggle("active", enabled);
  badge.classList.toggle("inactive", !enabled);
  label.textContent = enabled ? "Active" : "Paused";
}

/** Disable or enable sub-option toggles based on master state. */
function updateSubOptionStates(enabled) {
  const subIds = ["hideHomeShelves", "hideSearchResults", "hideSidebar", "redirectShorts", "showCounter"];
  subIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = !enabled;
    const row = el.closest(".setting-row");
    if (row) row.classList.toggle("disabled", !enabled);
    const toggleLabel = el.closest(".toggle");
    if (toggleLabel) toggleLabel.classList.toggle("disabled", !enabled);
  });
}

/** Apply the loaded settings object to all UI controls. */
function renderSettings(settings) {
  const checkboxMap = {
    masterToggle:      settings.enabled,
    hideHomeShelves:   settings.hideHomeShelves,
    hideSearchResults: settings.hideSearchResults,
    hideSidebar:       settings.hideSidebar,
    redirectShorts:    settings.redirectShorts,
    showCounter:       settings.showCounter,
  };

  Object.entries(checkboxMap).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!value;
  });

  updateStatusBadge(settings.enabled);
  updateSubOptionStates(settings.enabled);
}

// ---------------------------------------------------------------------------
// Badge count — query the active YouTube tab for its badge text
// ---------------------------------------------------------------------------

async function refreshHiddenCount() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const badgeText = await chrome.action.getBadgeText({ tabId: tab.id });
    const count = parseInt(badgeText, 10) || 0;
    const countEl = els.hiddenCount();
    if (countEl) countEl.textContent = count;
  } catch {
    /* tab may not be a YouTube tab — silently ignore */
  }
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function loadSettings(callback) {
  chrome.storage.sync.get("settings", ({ settings: stored }) => {
    const merged = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
    callback(merged);
  });
}

function saveSettings(settings) {
  chrome.storage.sync.set({ settings });
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

function wireEvents() {
  // Master toggle
  const masterEl = els.masterToggle();
  if (masterEl) {
    masterEl.addEventListener("change", () => {
      loadSettings((current) => {
        const updated = { ...current, enabled: masterEl.checked };
        saveSettings(updated);
        updateStatusBadge(updated.enabled);
        updateSubOptionStates(updated.enabled);
      });
    });
  }

  // Sub-option toggles
  const subToggleIds = [
    "hideHomeShelves",
    "hideSearchResults",
    "hideSidebar",
    "redirectShorts",
    "showCounter",
  ];

  subToggleIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      loadSettings((current) => {
        const updated = { ...current, [id]: el.checked };
        saveSettings(updated);
      });
    });
  });

  // Reset button
  const resetBtn = els.resetBtn();
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      saveSettings({ ...DEFAULT_SETTINGS });
      renderSettings({ ...DEFAULT_SETTINGS });
      const countEl = els.hiddenCount();
      if (countEl) countEl.textContent = "0";
    });
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Set version label
  const versionEl = els.versionLabel();
  if (versionEl) versionEl.textContent = `v${VERSION}`;

  // Load + render settings
  loadSettings((settings) => {
    renderSettings(settings);
  });

  // Wire all interactive controls
  wireEvents();

  // Fetch the current hidden count from the active tab badge
  refreshHiddenCount();
});
