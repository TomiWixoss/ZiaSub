// Background service worker
// Handle extension lifecycle and storage

chrome.runtime.onInstalled.addListener(() => {
  console.log("[ZiaSub] Extension installed");
});

// Keep service worker alive
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages if needed in the future
  console.log("[ZiaSub] Background received:", message.type);
  return false;
});
