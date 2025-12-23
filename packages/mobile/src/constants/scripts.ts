export const MOBILE_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";

export const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Legacy export for backward compatibility
export const CUSTOM_USER_AGENT = MOBILE_USER_AGENT;

// Re-export scripts from separate files
export { INJECTED_JAVASCRIPT } from "./mobileScript";
export { INJECTED_JAVASCRIPT_DESKTOP } from "./desktopScript";
