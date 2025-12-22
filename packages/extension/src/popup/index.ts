// Popup UI - Import SRT and send to content script
import { parseSRT, SubtitleItem } from "../utils/srtParser";
import type { MessageType, MessageResponse } from "../types/messages";

const fileInput = document.getElementById("srtFile") as HTMLInputElement;
const fileLabel = document.getElementById("fileLabel") as HTMLLabelElement;
const fileName = document.getElementById("fileName") as HTMLDivElement;
const subtitleCount = document.getElementById(
  "subtitleCount"
) as HTMLDivElement;
const applyBtn = document.getElementById("applyBtn") as HTMLButtonElement;
const clearBtn = document.getElementById("clearBtn") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLDivElement;

let parsedSubtitles: SubtitleItem[] = [];

function showStatus(message: string, type: "success" | "error" | "info") {
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = "block";

  if (type === "success") {
    setTimeout(() => {
      status.style.display = "none";
    }, 3000);
  }
}

function hideStatus() {
  status.style.display = "none";
}

async function sendToContentScript(
  message: MessageType
): Promise<MessageResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error("Không tìm thấy tab YouTube");
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

fileInput.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];

  if (!file) return;

  hideStatus();

  try {
    const text = await file.text();
    parsedSubtitles = parseSRT(text);

    if (parsedSubtitles.length === 0) {
      showStatus("File SRT không hợp lệ hoặc rỗng", "error");
      fileLabel.classList.remove("has-file");
      applyBtn.disabled = true;
      return;
    }

    fileName.textContent = file.name;
    subtitleCount.textContent = `${parsedSubtitles.length} phụ đề`;
    fileLabel.classList.add("has-file");
    applyBtn.disabled = false;
  } catch (err) {
    showStatus("Lỗi đọc file: " + (err as Error).message, "error");
    parsedSubtitles = [];
    applyBtn.disabled = true;
  }
});

applyBtn.addEventListener("click", async () => {
  if (parsedSubtitles.length === 0) return;

  try {
    applyBtn.disabled = true;
    applyBtn.textContent = "Đang áp dụng...";

    await sendToContentScript({
      type: "SET_SUBTITLES",
      subtitles: parsedSubtitles,
    });

    showStatus(`Đã áp dụng ${parsedSubtitles.length} phụ đề`, "success");
  } catch (err) {
    showStatus((err as Error).message, "error");
  } finally {
    applyBtn.disabled = false;
    applyBtn.textContent = "Áp dụng phụ đề";
  }
});

clearBtn.addEventListener("click", async () => {
  try {
    await sendToContentScript({ type: "CLEAR_SUBTITLES" });

    // Reset UI
    parsedSubtitles = [];
    fileInput.value = "";
    fileName.textContent = "";
    subtitleCount.textContent = "";
    fileLabel.classList.remove("has-file");
    applyBtn.disabled = true;

    showStatus("Đã xóa phụ đề", "info");
  } catch (err) {
    showStatus((err as Error).message, "error");
  }
});
