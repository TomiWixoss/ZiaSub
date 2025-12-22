// Content script - Subtitle overlay on YouTube videos
import type { SubtitleItem } from "@ziasub/shared";
import type { MessageType, MessageResponse } from "../types/messages";

class SubtitleOverlay {
  private subtitles: SubtitleItem[] = [];
  private overlay: HTMLDivElement | null = null;
  private subtitleEl: HTMLDivElement | null = null;
  private video: HTMLVideoElement | null = null;
  private currentSubtitle: SubtitleItem | null = null;
  private animationFrame: number | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Watch for video element
    this.observeVideo();

    console.log("[ZiaSub] Content script initialized");
  }

  private handleMessage(
    message: MessageType,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean {
    switch (message.type) {
      case "SET_SUBTITLES":
        this.setSubtitles(message.subtitles);
        sendResponse({
          success: true,
          data: { count: message.subtitles.length },
        });
        break;

      case "CLEAR_SUBTITLES":
        this.clearSubtitles();
        sendResponse({ success: true });
        break;

      case "GET_SUBTITLES":
        sendResponse({ success: true, data: { subtitles: this.subtitles } });
        break;

      default:
        sendResponse({ success: false, error: "Unknown message type" });
    }

    return true; // Keep channel open for async response
  }

  private observeVideo() {
    // Initial check
    this.findAndAttachVideo();

    // Observe DOM changes for SPA navigation
    const observer = new MutationObserver(() => {
      if (!this.video || !document.contains(this.video)) {
        this.findAndAttachVideo();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private findAndAttachVideo() {
    const video = document.querySelector(
      "video.html5-main-video"
    ) as HTMLVideoElement;

    if (video && video !== this.video) {
      this.video = video;
      this.createOverlay();
      this.startSync();
      console.log("[ZiaSub] Video found and attached");
    }
  }

  private createOverlay() {
    // Remove existing overlay
    this.removeOverlay();

    // Find video container
    const container = document.querySelector("#movie_player") as HTMLElement;
    if (!container) return;

    // Create overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "ziasub-overlay";

    this.subtitleEl = document.createElement("div");
    this.subtitleEl.className = "ziasub-subtitle";

    this.overlay.appendChild(this.subtitleEl);
    container.appendChild(this.overlay);

    // Initially hidden
    this.overlay.classList.add("hidden");
  }

  private removeOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.subtitleEl = null;
    }
  }

  private setSubtitles(subtitles: SubtitleItem[]) {
    this.subtitles = subtitles.sort((a, b) => a.startTime - b.startTime);

    // Ensure overlay exists
    if (!this.overlay) {
      this.findAndAttachVideo();
    }

    console.log(`[ZiaSub] Loaded ${subtitles.length} subtitles`);
  }

  private clearSubtitles() {
    this.subtitles = [];
    this.currentSubtitle = null;

    if (this.overlay) {
      this.overlay.classList.add("hidden");
    }

    console.log("[ZiaSub] Subtitles cleared");
  }

  private startSync() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    const sync = () => {
      this.updateSubtitle();
      this.animationFrame = requestAnimationFrame(sync);
    };

    this.animationFrame = requestAnimationFrame(sync);
  }

  private updateSubtitle() {
    if (!this.video || !this.overlay || !this.subtitleEl) return;
    if (this.subtitles.length === 0) return;

    const currentTime = this.video.currentTime;

    // Binary search for current subtitle
    const subtitle = this.findSubtitle(currentTime);

    if (subtitle !== this.currentSubtitle) {
      this.currentSubtitle = subtitle;

      if (subtitle) {
        this.subtitleEl.textContent = subtitle.text;
        this.overlay.classList.remove("hidden");
      } else {
        this.overlay.classList.add("hidden");
      }
    }
  }

  private findSubtitle(time: number): SubtitleItem | null {
    // Binary search for efficiency
    let left = 0;
    let right = this.subtitles.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const sub = this.subtitles[mid];

      if (time >= sub.startTime && time <= sub.endTime) {
        return sub;
      }

      if (time < sub.startTime) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return null;
  }
}

// Initialize
new SubtitleOverlay();
