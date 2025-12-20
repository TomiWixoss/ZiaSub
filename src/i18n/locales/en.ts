export default {
  // Onboarding
  onboarding: {
    getStarted: "Get Started",
    skip: "Skip",
    back: "Back",
    continue: "Continue",
    welcome: {
      title: "Welcome to ZiaSub",
      subtitle: "Auto-translate YouTube video subtitles with AI",
      feature1: "Auto-translate subtitles with Gemini AI",
      feature2: "Support multiple languages and translation styles",
      feature3: "Watch videos with subtitles right in the app",
    },
    storage: {
      title: "Choose Storage Location",
      subtitle:
        "App data will be saved to this folder. You can backup or transfer to another device.",
      noPath: "No folder selected",
      checking: "Checking...",
      dataFound: "Existing data found",
      dataDetail:
        "{{chats}} chats, {{translations}} translations (created {{date}})",
      newStorage: "New folder, will create new data",
      useDefault: "Use default folder",
      pickFolder: "Choose another folder",
      existingDataTitle: "Data Found",
      existingDataMessage:
        "This folder has {{chats}} chats and {{translations}} translations. Restore or start fresh?",
      restore: "Restore",
      clearAndNew: "Clear and start fresh",
      errorSetup: "Cannot setup storage folder",
      pickError: "Cannot select folder",
      iosDefaultOnly: "On iOS, only the default folder can be used",
    },
    theme: {
      title: "Choose Theme",
      subtitle:
        "Pick a theme that suits you. You can change it later in Settings.",
    },
    language: {
      title: "Choose Language",
      subtitle: "Select your preferred display language for the app.",
    },
    apiKey: {
      title: "Add API Key",
      subtitle:
        "A Gemini API key is needed to translate subtitles. You can add it later in Settings.",
      placeholder: "Paste API key here...",
      added: "API key added!",
    },
  },

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
    stop: "Stop",
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

    // Groups
    groups: {
      appearance: "Appearance",
      appearanceDesc: "Theme and language",
      apiKeysDesc: "{{count}} key(s) added",
      subtitleDesc: "Font size, style, position",
      batchDesc: "Split video, parallel translation",
      ttsDesc: "{{status}}",
      enabled: "Enabled",
      disabled: "Disabled",
      floatingUIDesc: "Position, layout of floating buttons",
    },

    // Reset All Settings
    resetAll: {
      button: "Reset to defaults",
      title: "Reset settings",
      message:
        "Reset all settings (subtitle, translation, TTS, floating buttons) to defaults? API keys and data will be kept.",
      confirm: "Reset",
      hint: "Does not affect API keys, translations and chat history",
    },

    // Theme
    theme: {
      title: "Theme",
      system: "System",
      light: "Light",
      dark: "Dark",
    },

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

    // Floating UI
    floatingUI: {
      title: "Floating Buttons",
      bottomOffset: "Bottom offset: {{value}}px",
      bottomOffsetHint: "Distance from bottom when not watching video",
      bottomOffsetVideo: "Bottom offset (video): {{value}}px",
      bottomOffsetVideoHint: "Distance from bottom when watching video",
      sideOffset: "Side offset: {{value}}px",
      position: "Position",
      positionLeft: "Left",
      positionRight: "Right",
      layout: "Layout",
      layoutVertical: "Vertical",
      layoutHorizontal: "Horizontal",
    },

    // Data & Storage
    data: {
      title: "Data",
      description: "Manage app data",
      storagePath: "Storage folder",
      notConfigured: "Not configured",
      chatSessions: "Chat sessions",
      translations: "Translations",
      clearAll: "Clear all data",
      clearAllDesc: "Delete all chats, translations and settings",
      clearAllTitle: "Clear Data",
      clearAllMessage:
        "Are you sure you want to delete all data? This action cannot be undone.",
      clearConfirm: "Clear all",
      clearSuccess: "All data cleared",
      clearError: "Cannot clear data",
      resetStorage: "Change storage folder",
      resetStorageDesc: "Choose a different folder and reconfigure",
      resetTitle: "Change Folder",
      resetMessage:
        "You will need to select a new storage folder. Old data will remain in the current folder.",
      resetConfirm: "Change folder",
      resetSuccess: "Reset complete. Please restart the app.",
      resetError: "Cannot reset",
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
      mediaResolution: "Video resolution",
      thinkingLevel: "AI thinking level",
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
      stopTitle: "Stop translation",
      stopConfirm: 'Stop translating "{{title}}" and move to pending?',
      abortTitle: "Abort and remove",
      abortConfirm: 'Abort translating "{{title}}" and remove from list?',
      resumeTitle: "Resume translation",
      resumeConfirm:
        '"{{title}}" has {{completed}}/{{total}} parts done. Continue translating?',
      resume: "Resume",
    },

    status: {
      added: "Added {{date}}",
      translating: "Translating...",
      paused: "Paused ({{completed}}/{{total}})",
      completed: "Done {{date}}",
      error: "Error: {{error}}",
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
      anotherTranslating:
        "Another video is being translated. Please wait or stop it first.",

      savedTranslations: "Translated",
      deleteTitle: "Delete translation",
      deleteConfirm: "Do you want to delete this translation?",
      partial: "Incomplete",
      resumeTitle: "Resume translation",
      resumeConfirm:
        "Translated {{completed}}/{{total}} parts. Continue translating remaining parts?",
      resume: "Resume",

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
      longVideoWarning:
        "Video is longer than 1 hour. Enable batch translation to pause/resume and view subtitles sooner.",
      enableStreaming: "Enable batch mode",

      progress: {
        translatingPart: "Translating part {{current}}/{{total}}...",
        translatingVideo: "Translating video...",
        completed: "Done!",
      },

      success: "Translation complete! Subtitles are ready.",
      error: "Translation failed",
      errorMessage: "Cannot translate this video.",
      stopTranslation: "Stop translation",
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

  // Update
  update: {
    title: "App Update",
    checking: "Checking...",
    checkNow: "Check for updates",
    checkError: "Cannot check for updates",
    downloadError: "Download failed",
    installError:
      "Cannot open installer. Please go to Settings > Apps > ZiaSub > Allow installing unknown apps",
    downloading: "Downloading...",
    upToDate: "You're on the latest version!",
    available: "New version available!",
    currentVersion: "Current version",
    newVersion: "New version",
    changelog: "What's new",
    download: "Download",
    install: "Install",
    viewRelease: "View on GitHub",
    later: "Later",
    autoCheck: "Auto-check for updates",
  },
};
