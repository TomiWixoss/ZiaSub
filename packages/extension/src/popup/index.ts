// Popup UI - Import SRT and send to content script
// Using shared package for SRT parsing
import { parseSRT, type SubtitleItem } from "@ziasub/shared";
import type { MessageType, MessageResponse } from "../types/messages";

// DOM Elements
const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
const tabContents = document.querySelectorAll<HTMLDivElement>(".tab-content");
const fileBtn = document.getElementById("fileBtn") as HTMLButtonElement;
const pasteBtn = document.getElementById("pasteBtn") as HTMLButtonElement;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const srtInput = document.getElementById("srtInput") as HTMLTextAreaElement;
const clearInputBtn = document.getElementById(
  "clearInputBtn"
) as HTMLButtonElement;
const subtitleInfo = document.getElementById("subtitleInfo") as HTMLDivElement;
const subtitleCount = document.getElementById(
  "subtitleCount"
) as HTMLSpanElement;
const applyBtn = document.getElementById("applyBtn") as HTMLButtonElement;
const clearBtn = document.getElementById("clearBtn") as HTMLButtonElement;
const toast = document.getElementById("toast") as HTMLDivElement;
const toastMessage = document.getElementById("toastMessage") as HTMLSpanElement;

let parsedSubtitles: SubtitleItem[] = [];
let toastTimeout: number | null = null;

// Tab switching
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabId = tab.dataset.tab;

    tabs.forEach((t) => t.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(`${tabId}-tab`)?.classList.add("active");
  });
});

// Toast notification
function showToast(
  message: string,
  type: "success" | "error" | "info" = "info"
) {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");

  toastTimeout = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

// Update UI based on SRT content
function updateUI() {
  const content = srtInput.value.trim();

  if (content) {
    clearInputBtn.classList.remove("hidden");
    parsedSubtitles = parseSRT(content);

    if (parsedSubtitles.length > 0) {
      subtitleInfo.classList.remove("hidden");
      subtitleCount.textContent = `${parsedSubtitles.length} phụ đề`;
      applyBtn.disabled = false;
    } else {
      subtitleInfo.classList.add("hidden");
      applyBtn.disabled = true;
    }
  } else {
    clearInputBtn.classList.add("hidden");
    subtitleInfo.classList.add("hidden");
    applyBtn.disabled = true;
    parsedSubtitles = [];
  }
}

// Send message to content script
async function sendToContentScript(
  message: MessageType
): Promise<MessageResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error("Không tìm thấy tab");
  }

  if (!tab.url?.includes("youtube.com")) {
    throw new Error("Vui lòng mở video YouTube trước");
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    // Content script not loaded, inject it
    console.log("[ZiaSub] Injecting content script...");

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["dist/content/index.js"],
    });

    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["content.css"],
    });

    // Wait for script to initialize
    await new Promise((r) => setTimeout(r, 100));

    return chrome.tabs.sendMessage(tab.id, message);
  }
}

// File picker
fileBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const content = await file.text();
    srtInput.value = content;
    updateUI();

    if (parsedSubtitles.length > 0) {
      showToast(`Đã tải ${file.name}`, "success");
    } else {
      showToast("File không chứa phụ đề hợp lệ", "error");
    }
  } catch (err) {
    showToast("Không thể đọc file", "error");
  }

  // Reset input
  fileInput.value = "";
});

// Paste from clipboard
pasteBtn.addEventListener("click", async () => {
  try {
    const content = await navigator.clipboard.readText();
    if (content) {
      srtInput.value = content;
      updateUI();

      if (parsedSubtitles.length > 0) {
        showToast("Đã dán phụ đề", "success");
      } else {
        showToast("Nội dung không phải định dạng SRT", "error");
      }
    } else {
      showToast("Clipboard trống", "info");
    }
  } catch {
    showToast("Không thể truy cập clipboard", "error");
  }
});

// Clear input
clearInputBtn.addEventListener("click", () => {
  srtInput.value = "";
  updateUI();
});

// Text input change
srtInput.addEventListener("input", updateUI);

// Apply subtitles
applyBtn.addEventListener("click", async () => {
  if (parsedSubtitles.length === 0) return;

  try {
    applyBtn.disabled = true;

    await sendToContentScript({
      type: "SET_SUBTITLES",
      subtitles: parsedSubtitles,
    });

    showToast(`Đã áp dụng ${parsedSubtitles.length} phụ đề`, "success");
  } catch (err) {
    showToast((err as Error).message, "error");
  } finally {
    applyBtn.disabled = false;
  }
});

// Clear subtitles
clearBtn.addEventListener("click", async () => {
  try {
    await sendToContentScript({ type: "CLEAR_SUBTITLES" });

    srtInput.value = "";
    updateUI();
    showToast("Đã xóa phụ đề", "info");
  } catch (err) {
    showToast((err as Error).message, "error");
  }
});

// Check clipboard on load for SRT content
async function checkClipboardForSRT() {
  try {
    const content = await navigator.clipboard.readText();
    if (content && isSRTFormat(content) && !srtInput.value) {
      srtInput.value = content;
      updateUI();
      showToast("Đã phát hiện SRT trong clipboard", "info");
    }
  } catch {
    // Clipboard access denied, ignore
  }
}

function isSRTFormat(text: string): boolean {
  if (!text || text.length < 10) return false;
  const srtPattern =
    /^\d+\s*\n\d{2}:\d{2}:\d{2}[,.:]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.:]\d{3}/m;
  return srtPattern.test(text.trim());
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  checkClipboardForSRT();
});
