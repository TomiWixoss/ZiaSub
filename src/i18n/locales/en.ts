export default {
  // Common
  common: {
    ok: "OK",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    confirm: "Confirm",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    warning: "Warning",
    notice: "Notice",
    retry: "Retry",
    yes: "Yes",
    no: "No",
    add: "Add",
    remove: "Remove",
    search: "Search",
    clear: "Clear",
    copy: "Copy",
    copied: "Copied",
    paste: "Paste",
    select: "Select",
    all: "All",
    none: "None",
    back: "Back",
    next: "Next",
    done: "Done",
    apply: "Apply",
    reset: "Reset",
    regenerate: "Regenerate",
    processing: "Processing...",
    stoppedByUser: "Stopped by user",
    file: "File",
    start: "Start",
  },

  // Home Screen
  home: {
    title: "ZiaSub",
    reload: "Reload",
  },

  // Chat
  chat: {
    title: "Chat",
    greeting: "Hello!",
    greetingSubtitle: "How can I help you?",
    noApiKey: "No API key. Add one in Settings",
    inputPlaceholder: "Ask Zia",
    inputPlaceholderDisabled: "Add API key in Settings to start",
    send: "Send",
    thinking: "Thinking...",
    stopGeneration: "Stop",
    newChat: "New chat",
    history: "History",
    noHistory: "No chat history yet",
    searchPlaceholder: "Search conversations",
    noSearchResults: "No results found",
    deleteChat: "Delete chat",
    deleteConfirm: "Are you sure you want to delete?",
    deleteTask: "Delete task",
    deleteTaskConfirm: "Are you sure you want to delete this task?",
    selectModel: "Select model",
    selectConfig: "Select AI config",
    configHint: "Go to Settings → Gemini to add or edit configs",
    video: "Video",
    quickActions: {
      summarize: "Summarize video",
      analyze: "Analyze content",
      keyPoints: "Key points",
      translate: "Translate video",
    },
    quickActionPrompts: {
      summarize: "Summarize this video",
      analyze: "Analyze this video in detail",
      keyPoints: "List the key points in this video",
      translate: "Translate this video to Vietnamese",
    },
  },

  // Settings
  settings: {
    title: "Settings",
    general: "General settings",
    gemini: "Translation styles",
    language: "Language",
    selectLanguage: "Select language",
    editConfig: "Edit translation style",

    // API Keys
    apiKeys: {
      title: "API Keys",
      description: "Add multiple keys for faster translation.",
      getKey: "Get key here",
      add: "Add API Key",
      addFromClipboard: "Add key from clipboard",
      adding: "Adding...",
      clipboardHint: "Copy API key first, then tap button to add automatically",
      empty: "No API keys yet",
      deleteConfirm: "Do you want to delete this key?",
      deleteTitle: "Delete key",
      invalid: "Invalid key",
      invalidMessage:
        "Clipboard does not contain a valid API key. Gemini keys usually start with 'AIza...'",
      duplicate: "Duplicate key",
      duplicateMessage: "This key is already in the list.",
      clipboardEmpty: "Clipboard empty",
      clipboardEmptyMessage:
        "Copy an API key to clipboard before tapping this button.",
      clipboardError: "Cannot read clipboard. Please try again.",
      added: "API key added from clipboard!",
      active: "Active",
    },

    // Subtitle
    subtitle: {
      title: "Subtitles",
      fontSize: "Font size",
      fontSizeValue: "Font size: {{size}}px",
      preview: "Preview subtitle",
      bold: "Bold",
      italic: "Italic",
      positionPortrait: "Position (portrait): {{value}}px from bottom",
      positionLandscape:
        "Position (landscape/fullscreen): {{value}}px from bottom",
    },

    // Batch Translation
    batch: {
      title: "Video translation",
      batchDuration: "Part duration: {{minutes}} minutes",
      batchDurationHint: "Longer videos will be split for translation",
      concurrent: "Translate simultaneously: {{count}} parts",
      concurrentHint:
        "Translate multiple parts at once (faster but uses more keys)",
      offset: "Tolerance: {{minutes}} min {{seconds}}s",
      offsetHint:
        "Slightly longer videos still translate in one go (e.g., 10m + 1m tolerance = 11m video not split)",
      presubDuration: "Preview part: {{minutes}} min {{seconds}}s",
      presubDurationHint:
        "Duration of first part when Quick Preview is enabled for faster subtitles",
    },

    // TTS
    tts: {
      title: "Text-to-Speech",
      enabled: "Enable TTS",
      enabledHint: "Read subtitles aloud, hide text",
      autoRate: "Auto speed",
      autoRateHint: "Adjust speed based on subtitle duration",
      baseRate: "Base speed: {{rate}}x",
      baseRateHintAuto: "Minimum speed, will increase if needed",
      baseRateHintFixed: "Fixed speed",
      pitch: "Voice pitch: {{pitch}}",
      duckVideo: "Duck video",
      duckVideoHint: "Lower video volume when speaking",
      duckLevel: "Video volume when speaking: {{level}}%",
    },

    // Gemini Config
    geminiConfig: {
      name: "Style name",
      namePlaceholder: "Enter name...",
      model: "AI Model",
      temperature: "Creativity: {{value}}",
      systemPrompt: "Translation instructions",
      systemPromptPlaceholder: "Enter instructions for AI...",
      addNew: "Add translation style",
      deleteTitle: "Delete style",
      deleteConfirm: "Do you want to delete this translation style?",
      cannotDelete: "Cannot delete",
      cannotDeleteMessage: "Must keep at least one translation style.",
      selectType: "Select translation style",
    },
  },

  // Queue
  queue: {
    title: "Translation queue",
    empty: "No videos yet",
    emptyTranslating: "No videos translating",
    emptyCompleted: "No videos translated yet",

    tabs: {
      pending: "Pending",
      translating: "Translating",
      completed: "Completed",
    },

    status: {
      added: "Added: {{date}}",
      translating: "Translating...",
      completed: "Completed: {{date}}",
      error: "Error: {{error}}",
    },

    actions: {
      translateAll: "Translate all",
      clearAll: "Clear all",
    },

    dialogs: {
      translateOne: "Translate this video",
      translateOneConfirm: 'Start translating "{{title}}"?',
      translateAllTitle: "Translate all",
      translateAllConfirm: "Auto-translate all videos in the list?",
      removeTitle: "Remove video",
      removeConfirm: 'Remove "{{title}}" from the list?',
      clearPendingTitle: "Clear all",
      clearPendingConfirm: "Remove all pending videos from the list?",
      clearCompletedTitle: "Clear all",
      clearCompletedConfirm: "Remove all completed videos from the list?",
      translate: "Translate",
    },

    addedToQueue: "Added",
    addedMessage: "Video added to queue. {{pendingText}}",
    pendingCount: "{{count}} video(s) pending.",
    willTranslateNow: "Video will be translated now.",
    viewQueue: "View queue",
    alreadyTranslated: "This video already has a translation.",
    alreadyInQueue:
      "This video is already in queue. {{count}} video(s) pending.",
    currentlyTranslating: "This video is being translated.",
  },

  // Subtitle Modal
  subtitleModal: {
    title: "Subtitles",
    tabs: {
      translate: "Auto translate",
      srt: "Paste subtitles",
    },

    srt: {
      placeholder: "Paste subtitle content here...",
      load: "Apply",
      pasteNothing: "Nothing to paste.",
      pasteError: "Cannot paste.",
      fileError: "Cannot open this file.",
      detected: "Subtitles detected",
      detectedConfirm: "You just copied subtitle content. Want to paste it?",
      fixedErrors: "Fixed subtitle errors",
      fixedErrorsMessage: "Auto-fixed {{count}} error(s) in subtitles.",
    },

    translate: {
      title: "Translate subtitles",
      newTranslation: "New translation",
      translating: "Translating...",
      selectConfig: "Select translation style",
      noApiKey: "No key. Add one in Settings",
      noVideo: "No video",
      noVideoMessage: "Open a video to translate first.",
      notSelected: "Not selected",
      notSelectedMessage: "Select a translation style first.",
      alreadyTranslating: "This video is already being translated.",

      savedTranslations: "Translated",
      deleteTitle: "Delete translation",
      deleteConfirm: "Do you want to delete this translation?",

      advancedOptions: "Advanced options",
      streamingMode: "Batch translation",
      streamingModeHint: "View subtitles as each part finishes",
      presubMode: "Quick preview",
      presubModeHint: "First part is shorter for faster viewing (~2 min)",
      customRange: "Custom time range",
      customRangeHint: "Leave empty = from start/to end",
      rangeFrom: "From",
      rangeTo: "To",
      rangeEnd: "end",
      videoDuration: "Video duration: {{duration}}",

      invalidStartTime: "Invalid start time. Use mm:ss or leave empty",
      invalidEndTime: "Invalid end time. Use mm:ss or leave empty",
      invalidRange: "Start time must be less than end time",

      progress: {
        translatingPart: "Translating part {{current}}/{{total}}...",
        translatingVideo: "Translating video...",
        completed: "Done!",
      },

      success: "Translation complete! Subtitles are ready.",
      error: "Translation failed",
      errorMessage: "Cannot translate this video.",
    },
  },

  // Errors
  errors: {
    networkError: "Network error",
    apiError: "API error",
    unknownError: "An unknown error occurred",
    noInternet: "No internet connection",
    timeout: "Request timed out",
    invalidInput: "Invalid input",
    permissionDenied: "Permission denied",
    fileNotFound: "File not found",
    quotaExceeded: "Quota exceeded",
    generic: "An error occurred.",
  },

  // Languages
  languages: {
    vi: "Tiếng Việt",
    en: "English",
    auto: "Auto",
  },
};
