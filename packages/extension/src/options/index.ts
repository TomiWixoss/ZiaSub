// Options page - Settings for ZiaSub extension

// Settings types
interface SubtitleSettings {
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  bottomOffset: number;
}

interface OverlaySettings {
  bgOpacity: number;
  textShadow: boolean;
}

interface ExtensionSettings {
  subtitle: SubtitleSettings;
  overlay: OverlaySettings;
}

// Default settings (matching mobile app defaults)
const DEFAULT_SETTINGS: ExtensionSettings = {
  subtitle: {
    fontSize: 15,
    fontWeight: "bold",
    fontStyle: "normal",
    bottomOffset: 60,
  },
  overlay: {
    bgOpacity: 70,
    textShadow: true,
  },
};

// DOM Elements
const fontSizeSlider = document.getElementById("fontSize") as HTMLInputElement;
const fontSizeValue = document.getElementById(
  "fontSizeValue"
) as HTMLSpanElement;
const boldBtn = document.getElementById("boldBtn") as HTMLButtonElement;
const italicBtn = document.getElementById("italicBtn") as HTMLButtonElement;
const bottomOffsetSlider = document.getElementById(
  "bottomOffset"
) as HTMLInputElement;
const bottomOffsetValue = document.getElementById(
  "bottomOffsetValue"
) as HTMLSpanElement;
const bgOpacitySlider = document.getElementById(
  "bgOpacity"
) as HTMLInputElement;
const bgOpacityValue = document.getElementById(
  "bgOpacityValue"
) as HTMLSpanElement;
const textShadowToggle = document.getElementById(
  "textShadowToggle"
) as HTMLButtonElement;
const subtitlePreview = document.getElementById(
  "subtitlePreview"
) as HTMLSpanElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
const toast = document.getElementById("toast") as HTMLDivElement;
const toastMessage = document.getElementById("toastMessage") as HTMLSpanElement;

// Group headers
const groupHeaders = document.querySelectorAll<HTMLDivElement>(".group-header");

let settings: ExtensionSettings = { ...DEFAULT_SETTINGS };
let toastTimeout: number | null = null;

// Toast notification
function showToast(message: string, type: "success" | "info" = "info") {
  if (toastTimeout) clearTimeout(toastTimeout);

  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");

  toastTimeout = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 2500);
}

// Update preview
function updatePreview() {
  subtitlePreview.style.fontSize = `${settings.subtitle.fontSize}px`;
  subtitlePreview.style.fontWeight =
    settings.subtitle.fontWeight === "bold" ? "700" : "400";
  subtitlePreview.style.fontStyle = settings.subtitle.fontStyle;

  if (settings.overlay.textShadow) {
    subtitlePreview.style.textShadow = "1px 1px 3px rgba(0, 0, 0, 0.9)";
  } else {
    subtitlePreview.style.textShadow = "none";
  }
}

// Save settings to chrome storage
async function saveSettings() {
  await chrome.storage.sync.set({ settings });
  // Notify content script about settings change
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && tab.url?.includes("youtube.com")) {
    chrome.tabs
      .sendMessage(tab.id, { type: "SETTINGS_UPDATED", settings })
      .catch(() => {});
  }
}

// Load settings from chrome storage
async function loadSettings() {
  const result = await chrome.storage.sync.get("settings");
  if (result.settings) {
    settings = { ...DEFAULT_SETTINGS, ...result.settings };
  }
  applySettingsToUI();
}

// Apply settings to UI elements
function applySettingsToUI() {
  // Subtitle settings
  fontSizeSlider.value = String(settings.subtitle.fontSize);
  fontSizeValue.textContent = String(settings.subtitle.fontSize);

  boldBtn.dataset.active = String(settings.subtitle.fontWeight === "bold");
  italicBtn.dataset.active = String(settings.subtitle.fontStyle === "italic");

  bottomOffsetSlider.value = String(settings.subtitle.bottomOffset);
  bottomOffsetValue.textContent = String(settings.subtitle.bottomOffset);

  // Overlay settings
  bgOpacitySlider.value = String(settings.overlay.bgOpacity);
  bgOpacityValue.textContent = String(settings.overlay.bgOpacity);

  textShadowToggle.dataset.active = String(settings.overlay.textShadow);

  updatePreview();
}

// Group toggle
groupHeaders.forEach((header) => {
  header.addEventListener("click", () => {
    const group = header.dataset.group;
    const content = document.getElementById(`${group}-content`);
    const isExpanded = header.classList.contains("expanded");

    // Close all groups
    groupHeaders.forEach((h) => {
      h.classList.remove("expanded");
      const c = document.getElementById(`${h.dataset.group}-content`);
      c?.classList.add("hidden");
    });

    // Toggle current group
    if (!isExpanded && content) {
      header.classList.add("expanded");
      content.classList.remove("hidden");
    }
  });
});

// Font size slider
fontSizeSlider.addEventListener("input", () => {
  const value = parseInt(fontSizeSlider.value);
  settings.subtitle.fontSize = value;
  fontSizeValue.textContent = String(value);
  updatePreview();
  saveSettings();
});

// Bold button
boldBtn.addEventListener("click", () => {
  const isActive = boldBtn.dataset.active === "true";
  settings.subtitle.fontWeight = isActive ? "normal" : "bold";
  boldBtn.dataset.active = String(!isActive);
  updatePreview();
  saveSettings();
});

// Italic button
italicBtn.addEventListener("click", () => {
  const isActive = italicBtn.dataset.active === "true";
  settings.subtitle.fontStyle = isActive ? "normal" : "italic";
  italicBtn.dataset.active = String(!isActive);
  updatePreview();
  saveSettings();
});

// Bottom offset slider
bottomOffsetSlider.addEventListener("input", () => {
  const value = parseInt(bottomOffsetSlider.value);
  settings.subtitle.bottomOffset = value;
  bottomOffsetValue.textContent = String(value);
  saveSettings();
});

// Background opacity slider
bgOpacitySlider.addEventListener("input", () => {
  const value = parseInt(bgOpacitySlider.value);
  settings.overlay.bgOpacity = value;
  bgOpacityValue.textContent = String(value);
  saveSettings();
});

// Text shadow toggle
textShadowToggle.addEventListener("click", () => {
  const isActive = textShadowToggle.dataset.active === "true";
  settings.overlay.textShadow = !isActive;
  textShadowToggle.dataset.active = String(!isActive);
  updatePreview();
  saveSettings();
});

// Reset button
resetBtn.addEventListener("click", () => {
  settings = { ...DEFAULT_SETTINGS };
  applySettingsToUI();
  saveSettings();
  showToast("Đã khôi phục cài đặt mặc định", "success");
});

// Initialize - expand first group by default
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  const firstHeader = groupHeaders[0];
  if (firstHeader) {
    firstHeader.classList.add("expanded");
    const content = document.getElementById(
      `${firstHeader.dataset.group}-content`
    );
    content?.classList.remove("hidden");
  }
});
