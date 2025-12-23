export default {
  // Onboarding
  onboarding: {
    getStarted: "Bắt đầu",
    skip: "Bỏ qua",
    back: "Quay lại",
    continue: "Tiếp tục",
    welcome: {
      title: "Chào mừng đến ZiaSub",
      subtitle: "Dịch phụ đề video YouTube tự động với AI",
      feature1: "Dịch phụ đề tự động bằng Gemini AI",
      feature2: "Hỗ trợ nhiều ngôn ngữ và kiểu dịch",
      feature3: "Xem video với phụ đề ngay trong app",
    },
    storage: {
      title: "Chọn thư mục backup",
      subtitle:
        "Chọn thư mục để lưu backup dữ liệu. Bạn có thể khôi phục dữ liệu từ đây khi cài lại app.",
      subtitleBackup:
        "Chọn thư mục để lưu backup. Nếu có backup cũ, bạn có thể khôi phục ngay.",
      noPath: "Chưa chọn thư mục",
      checking: "Đang kiểm tra...",
      backupFound: "Phát hiện backup",
      backupDetail:
        "{{chats}} cuộc chat, {{translations}} bản dịch (tạo {{date}})",
      noBackup: "Không có backup trong thư mục này",
      useDefault: "Dùng thư mục mặc định",
      pickFolder: "Chọn thư mục khác",
      existingDataTitle: "Phát hiện backup",
      existingDataMessage:
        "Thư mục này có backup với {{chats}} cuộc chat và {{translations}} bản dịch. Bạn muốn khôi phục không?",
      restore: "Khôi phục",
      skipRestore: "Bỏ qua",
      clearAndNew: "Xóa và tạo mới",
      errorSetup: "Không thể thiết lập thư mục backup",
      pickError: "Không thể chọn thư mục",
      iosDefaultOnly: "Trên iOS chỉ có thể dùng thư mục mặc định",
      // Legacy keys for compatibility
      dataFound: "Phát hiện dữ liệu cũ",
      dataDetail:
        "{{chats}} cuộc chat, {{translations}} bản dịch (tạo {{date}})",
      newStorage: "Thư mục mới, sẽ tạo dữ liệu mới",
    },
    theme: {
      title: "Chọn giao diện",
      subtitle:
        "Chọn giao diện phù hợp với bạn. Có thể thay đổi sau trong Cài đặt.",
    },
    language: {
      title: "Chọn ngôn ngữ",
      subtitle: "Chọn ngôn ngữ hiển thị cho ứng dụng.",
    },
    apiKey: {
      title: "Thêm API Key",
      subtitle:
        "Cần API key của Gemini để dịch phụ đề. Bạn có thể thêm sau trong Cài đặt.",
      placeholder: "Dán API key vào đây...",
      added: "Đã thêm API key!",
    },
  },

  // Common
  common: {
    ok: "OK",
    cancel: "Hủy",
    save: "Lưu",
    delete: "Xóa",
    edit: "Sửa",
    close: "Đóng",
    confirm: "Xác nhận",
    loading: "Đang tải...",
    error: "Lỗi",
    success: "Thành công",
    warning: "Cảnh báo",
    notice: "Thông báo",
    retry: "Thử lại",
    yes: "Có",
    no: "Không",
    add: "Thêm",
    remove: "Xóa",
    search: "Tìm kiếm",
    clear: "Xóa",
    copy: "Copy",
    copied: "Đã copy",
    paste: "Dán",
    select: "Chọn",
    all: "Tất cả",
    none: "Không có",
    back: "Quay lại",
    next: "Tiếp",
    done: "Xong",
    apply: "Áp dụng",
    reset: "Đặt lại",
    regenerate: "Tạo lại",
    processing: "Đang xử lý...",
    stoppedByUser: "Đã dừng bởi người dùng",
    file: "File",
    start: "Bắt đầu",
    stop: "Dừng",
  },

  // Home Screen
  home: {
    title: "ZiaSub",
    reload: "Tải lại",
  },

  // Chat
  chat: {
    title: "Trò chuyện",
    greeting: "Xin chào!",
    greetingSubtitle: "Tôi có thể giúp gì cho bạn?",
    noApiKey: "Chưa có API key. Thêm trong Cài đặt nhé",
    inputPlaceholder: "Hỏi Zia",
    inputPlaceholderDisabled: "Thêm API key trong Cài đặt để bắt đầu",
    send: "Gửi",
    thinking: "Đang suy nghĩ...",
    stopGeneration: "Dừng",
    newChat: "Cuộc trò chuyện mới",
    history: "Lịch sử",
    noHistory: "Chưa có cuộc trò chuyện",
    searchPlaceholder: "Tìm kiếm cuộc trò chuyện",
    noSearchResults: "Không tìm thấy kết quả",
    deleteChat: "Xóa cuộc trò chuyện",
    deleteConfirm: "Bạn có chắc muốn xóa?",
    deleteTask: "Xóa task",
    deleteTaskConfirm: "Bạn có chắc muốn xóa task này?",
    selectModel: "Chọn model",
    selectConfig: "Chọn cấu hình AI",
    configHint: "Vào Cài đặt → Gemini để thêm hoặc chỉnh sửa cấu hình",
    video: "Video",
    // Video time range
    selectTimeRange: "Chọn khoảng thời gian",
    timeRangeHint: "Kéo thanh trượt để chọn đoạn video",
    startTime: "Bắt đầu",
    endTime: "Kết thúc",
    videoDuration: "Độ dài video",
    selectedDuration: "Đã chọn",
    invalidStartTime: "Thời gian bắt đầu không hợp lệ",
    invalidEndTime: "Thời gian kết thúc không hợp lệ",
    startMustBeLessThanEnd: "Thời gian bắt đầu phải nhỏ hơn kết thúc",
    endExceedsDuration: "Thời gian kết thúc vượt quá độ dài video",
    clearRange: "Xóa khoảng",
    quickActions: {
      summarize: "Tóm tắt video",
      analyze: "Phân tích nội dung",
      keyPoints: "Điểm chính",
      translate: "Dịch video",
    },
    quickActionPrompts: {
      summarize: "Tóm tắt nội dung video này",
      analyze: "Phân tích chi tiết video này",
      keyPoints: "Liệt kê các điểm chính trong video",
      translate: "Dịch nội dung video sang tiếng Việt",
    },
  },

  // Settings
  settings: {
    title: "Cài đặt",
    general: "Cài đặt chung",
    gemini: "Kiểu dịch",
    language: "Ngôn ngữ",
    selectLanguage: "Chọn ngôn ngữ",
    editConfig: "Chỉnh kiểu dịch",

    // Groups
    groups: {
      appearance: "Giao diện",
      appearanceDesc: "Chủ đề và ngôn ngữ",
      apiKeysDesc: "{{count}} key đã thêm",
      subtitleDesc: "Cỡ chữ, kiểu chữ, vị trí",
      batchDesc: "Chia video, dịch song song",
      ttsDesc: "{{status}}",
      enabled: "Đang bật",
      disabled: "Đang tắt",
      floatingUIDesc: "Vị trí, bố cục nút nổi",
      notificationDesc: "{{status}}",
    },

    // Notification
    notification: {
      title: "Thông báo",
      enabled: "Bật thông báo",
      enabledHint: "Nhận thông báo khi app chạy nền",
      noPermission: "Chưa cấp quyền thông báo",
      grantPermission: "Cấp quyền",
      permissionGranted: "✓ Đã cấp quyền thông báo",
      // Nguồn
      sourceTitle: "Nguồn thông báo",
      fromQueue: "Từ hàng đợi",
      fromQueueHint: "Thông báo khi dịch video trong hàng đợi",
      fromDirect: "Từ dịch trực tiếp",
      fromDirectHint: "Thông báo khi dịch từ tab Dịch tự động",
      // Loại
      typeTitle: "Loại thông báo",
      onComplete: "Khi dịch xong",
      onCompleteHint: "Thông báo khi dịch xong toàn bộ video",
      onBatchComplete: "Khi xong từng phần",
      onBatchCompleteHint: "Thông báo mỗi khi dịch xong 1 phần (có thể spam)",
      onError: "Khi có lỗi",
      onErrorHint: "Thông báo khi dịch bị lỗi",
    },

    // Reset All Settings
    resetAll: {
      button: "Khôi phục cài đặt gốc",
      title: "Khôi phục cài đặt",
      message:
        "Đặt lại tất cả cài đặt (phụ đề, dịch video, thuyết minh, nút nổi) về mặc định? API keys và dữ liệu sẽ được giữ nguyên.",
      confirm: "Khôi phục",
      hint: "Không ảnh hưởng đến API keys, bản dịch và lịch sử chat",
    },

    // Theme
    theme: {
      title: "Giao diện",
      system: "Theo hệ thống",
      light: "Sáng",
      dark: "Tối",
    },

    // API Keys
    apiKeys: {
      title: "API Keys",
      description: "Thêm nhiều key để dịch nhanh hơn.",
      getKey: "Lấy key tại đây",
      add: "Thêm API Key",
      addFromClipboard: "Thêm key từ clipboard",
      adding: "Đang thêm...",
      clipboardHint: "Copy API key trước, sau đó bấm nút để tự động thêm",
      empty: "Chưa có API key nào",
      deleteConfirm: "Bạn muốn xóa key này?",
      deleteTitle: "Xóa key",
      invalid: "Key không hợp lệ",
      invalidMessage:
        "Clipboard không chứa API key hợp lệ. Key Gemini thường bắt đầu bằng 'AIza...'",
      duplicate: "Trùng key",
      duplicateMessage: "Key này đã có trong danh sách rồi.",
      clipboardEmpty: "Clipboard trống",
      clipboardEmptyMessage:
        "Hãy copy API key vào clipboard trước khi bấm nút này.",
      clipboardError: "Không thể đọc clipboard. Hãy thử lại.",
      added: "Đã thêm API key từ clipboard!",
      active: "Đang dùng",
    },

    // Subtitle
    subtitle: {
      title: "Phụ đề",
      fontSize: "Cỡ chữ",
      fontSizeValue: "Cỡ chữ: {{size}}px",
      preview: "Xem trước phụ đề",
      bold: "Đậm",
      italic: "Nghiêng",
      positionPortrait: "Vị trí (dọc): {{value}}px từ dưới",
      positionLandscape: "Vị trí (ngang/fullscreen): {{value}}px từ dưới",
    },

    // Batch Translation
    batch: {
      title: "Dịch video",
      batchDuration: "Độ dài mỗi phần: {{minutes}} phút",
      batchDurationHint: "Video dài hơn sẽ được chia nhỏ để dịch",
      concurrent: "Dịch cùng lúc: {{count}} phần",
      concurrentHint: "Dịch nhiều phần cùng lúc (nhanh hơn nhưng tốn key)",
      offset: "Dung sai thêm: {{minutes}} phút {{seconds}}s",
      offsetHint:
        "Video dài hơn một chút vẫn dịch 1 lần (VD: 10p + 1p dung sai = video 11p không bị chia nhỏ)",
      presubDuration: "Phần đầu (xem nhanh): {{minutes}} phút {{seconds}}s",
      presubDurationHint:
        "Độ dài phần đầu khi bật chế độ Xem nhanh để có phụ đề sớm hơn",
      presubConfig: "Cấu hình xem nhanh",
      presubConfigHint:
        "Dùng cấu hình nhẹ hơn cho phần đầu để AI xử lý nhanh hơn",
      presubConfigSame: "Giống cấu hình chính",
    },

    // TTS
    tts: {
      title: "Thuyết minh",
      enabled: "Bật thuyết minh",
      enabledHint: "Đọc phụ đề thành tiếng, ẩn chữ",
      autoRate: "Tự động tốc độ",
      autoRateHint: "Điều chỉnh tốc độ theo thời gian phụ đề",
      baseRate: "Tốc độ cơ bản: {{rate}}x",
      baseRateHintAuto: "Tốc độ tối thiểu, sẽ tăng nếu cần",
      baseRateHintFixed: "Tốc độ cố định",
      pitch: "Cao độ giọng: {{pitch}}",
      duckVideo: "Giảm âm video",
      duckVideoHint: "Giảm âm lượng video khi đang đọc",
      duckLevel: "Âm lượng video khi đọc: {{level}}%",
    },

    // Floating UI
    floatingUI: {
      title: "Nút nổi",
      bottomOffset: "Khoảng cách đáy: {{value}}px",
      bottomOffsetHint: "Khoảng cách từ đáy màn hình khi không xem video",
      bottomOffsetVideo: "Khoảng cách đáy (video): {{value}}px",
      bottomOffsetVideoHint: "Khoảng cách từ đáy khi đang xem video",
      sideOffset: "Khoảng cách cạnh: {{value}}px",
      position: "Vị trí",
      positionLeft: "Trái",
      positionRight: "Phải",
      layout: "Bố cục",
      layoutVertical: "Dọc",
      layoutHorizontal: "Ngang",
    },

    // Data & Storage
    data: {
      title: "Dữ liệu",
      description: "Quản lý dữ liệu và backup",
      chatSessions: "Cuộc chat",
      translations: "Bản dịch",
      // Backup
      backupPath: "Thư mục backup",
      notConfigured: "Chưa cấu hình",
      lastBackup: "Backup gần nhất",
      never: "Chưa backup",
      backupNow: "Backup ngay",
      backupNowDesc: "Lưu dữ liệu ra file backup",
      backupSuccess: "Đã backup thành công",
      backupError: "Không thể backup",
      restore: "Khôi phục",
      restoreDesc: "Khôi phục dữ liệu từ file backup",
      restoreTitle: "Khôi phục dữ liệu",
      restoreMessage:
        "Dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc muốn khôi phục?",
      restoreConfirm: "Khôi phục",
      restoreSuccess: "Đã khôi phục thành công. App sẽ khởi động lại.",
      restoreError: "Không thể khôi phục",
      autoBackup: "Tự động backup",
      autoBackupOn: "Backup khi thoát app",
      autoBackupOff: "Đã tắt",
      pathChanged: "Đã đổi thư mục backup",
      pathChangeError: "Không thể đổi thư mục",
      // Danger zone
      dangerZone: "Vùng nguy hiểm",
      clearAll: "Xóa toàn bộ dữ liệu",
      clearAllDesc: "Xóa tất cả chat, bản dịch và cài đặt",
      clearAllTitle: "Xóa dữ liệu",
      clearAllMessage:
        "Bạn có chắc muốn xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác.",
      clearConfirm: "Xóa hết",
      clearSuccess: "Đã xóa toàn bộ dữ liệu",
      clearError: "Không thể xóa dữ liệu",
      resetApp: "Reset app",
      resetAppDesc: "Xóa dữ liệu và quay lại màn hình giới thiệu",
      resetTitle: "Reset app",
      resetMessage:
        "Tất cả dữ liệu sẽ bị xóa và bạn sẽ phải thiết lập lại từ đầu.",
      resetConfirm: "Reset",
      resetError: "Không thể reset",
    },

    // Gemini Config
    geminiConfig: {
      name: "Tên kiểu dịch",
      namePlaceholder: "Đặt tên...",
      model: "Mô hình AI",
      temperature: "Độ sáng tạo: {{value}}",
      systemPrompt: "Hướng dẫn dịch",
      systemPromptPlaceholder: "Nhập hướng dẫn cho AI...",
      addNew: "Thêm kiểu dịch",
      deleteTitle: "Xóa kiểu dịch",
      deleteConfirm: "Bạn muốn xóa kiểu dịch này?",
      cannotDelete: "Không xóa được",
      cannotDeleteMessage: "Cần giữ lại ít nhất một kiểu dịch.",
      selectType: "Chọn kiểu dịch",
      mediaResolution: "Độ phân giải video",
      thinkingLevel: "Mức độ suy nghĩ AI",
      presetPrompts: "Mẫu prompt có sẵn",
      selectPreset: "Chọn mẫu prompt",
      applyPreset: "Áp dụng mẫu",
      presetApplied: "Đã áp dụng mẫu prompt!",
    },

    // Preset Prompts
    presetPrompts: {
      default: {
        name: "Tổng quát",
        description: "Phù hợp với mọi loại video",
      },
      music: {
        name: "Video Âm nhạc",
        description: "MV, Lyrics Video - Tập trung vào tính thơ và cảm xúc",
      },
      visual_novel: {
        name: "Visual Novel",
        description: "Game cốt truyện - Phân biệt lời thoại và lời dẫn",
      },
      anime: {
        name: "Anime / Hoạt hình",
        description: "Phong cách Fansub - Xử lý ngữ khí và thuật ngữ Anime",
      },
      gaming: {
        name: "Chơi Game",
        description: "Let's Play, Streamer - Tiếng lóng game thủ",
      },
      vlog: {
        name: "Vlog / Hướng dẫn",
        description: "Video đời sống - Giọng văn tự nhiên như văn nói",
      },
      movie: {
        name: "Phim / TV Series",
        description: "Phim điện ảnh và truyền hình - Giữ tông kịch tính",
      },
      news: {
        name: "Tin tức / Phóng sự",
        description: "Nội dung báo chí - Chính xác và trang trọng",
      },
      educational: {
        name: "Giáo dục / Bài giảng",
        description: "Nội dung học thuật - Thuật ngữ chuyên ngành",
      },
      comedy: {
        name: "Hài / Comedy",
        description: "Video hài - Giữ nguyên tiếng cười và timing",
      },
      podcast: {
        name: "Podcast / Phỏng vấn",
        description: "Nội dung hội thoại dài - Tự nhiên và rõ ràng",
      },
      sports: {
        name: "Thể thao",
        description: "Bình luận thể thao - Nhanh và sôi động",
      },
      asmr: {
        name: "ASMR / Thư giãn",
        description: "Nội dung ASMR - Mô tả âm thanh chi tiết",
      },
      cooking: {
        name: "Nấu ăn",
        description: "Video ẩm thực - Thuật ngữ nấu nướng",
      },
      review: {
        name: "Đánh giá sản phẩm",
        description: "Review công nghệ/sản phẩm - Chính xác kỹ thuật",
      },
    },
  },

  // Queue
  queue: {
    title: "Danh sách chờ dịch",
    empty: "Chưa có video nào",
    emptyTranslating: "Không có video nào đang dịch",
    emptyPaused: "Không có video nào tạm dừng",
    emptyCompleted: "Chưa dịch video nào",

    tabs: {
      pending: "Chưa dịch",
      translating: "Đang dịch",
      paused: "Tạm dừng",
      completed: "Đã dịch",
    },

    actions: {
      translateAll: "Dịch tất cả",
      clearAll: "Xóa tất cả",
      stopAll: "Dừng tất cả",
      resumeAll: "Tiếp tục tất cả",
    },

    dialogs: {
      translateOne: "Dịch video này",
      translateOneConfirm: 'Bắt đầu dịch "{{title}}"?',
      translateAllTitle: "Dịch tất cả",
      translateAllConfirm: "Dịch tự động tất cả video trong danh sách?",
      removeTitle: "Xóa video",
      removeConfirm: 'Bỏ "{{title}}" khỏi danh sách?',
      clearPendingTitle: "Xóa tất cả",
      clearPendingConfirm: "Bỏ hết video chưa dịch khỏi danh sách?",
      clearCompletedTitle: "Xóa tất cả",
      clearCompletedConfirm: "Bỏ hết video đã dịch khỏi danh sách?",
      clearPausedTitle: "Xóa tất cả",
      clearPausedConfirm: "Bỏ hết video tạm dừng khỏi danh sách?",
      clearTranslatingTitle: "Xóa tất cả",
      clearTranslatingConfirm:
        "Hủy dịch video hiện tại và xóa hết video đang chờ khỏi danh sách?",
      resumeAllTitle: "Tiếp tục tất cả",
      resumeAllConfirm: "Tiếp tục dịch tất cả video đang tạm dừng?",
      translate: "Dịch",
      stopTitle: "Dừng dịch",
      stopConfirm: 'Dừng dịch "{{title}}" và chuyển về chưa dịch?',
      stopAllTitle: "Dừng tất cả",
      stopAllConfirm: "Dừng dịch video hiện tại và tạm dừng toàn bộ hàng đợi?",
      abortTitle: "Hủy và xóa",
      abortConfirm: 'Hủy dịch "{{title}}" và xóa khỏi danh sách?',
      resumeTitle: "Dịch tiếp",
      resumeConfirm:
        '"{{title}}" đã dịch {{completed}}/{{total}} phần. Tiếp tục dịch?',
      resume: "Dịch tiếp",
    },

    status: {
      added: "Thêm {{date}}",
      translating: "Đang dịch...",
      waiting: "Đang chờ...",
      paused: "Tạm dừng ({{completed}}/{{total}})",
      completed: "Xong {{date}}",
      error: "Lỗi: {{error}}",
      retranslatingSingle: "Đang dịch lại phần {{batch}}...",
      retranslatingFrom: "Đang dịch lại từ phần {{batch}}...",
    },

    addedToQueue: "Đã thêm",
    addedMessage: "Đã thêm video vào danh sách. {{pendingText}}",
    pendingCount: "Còn {{count}} video đang chờ dịch.",
    willTranslateNow: "Video sẽ được dịch ngay.",
    viewQueue: "Xem danh sách",
    alreadyTranslated: "Video này đã có bản dịch rồi.",
    alreadyInQueue:
      "Video này đã có trong danh sách chờ. Còn {{count}} video đang chờ.",
    currentlyTranslating: "Video này đang được dịch.",
    addedToWaitingQueue:
      "Đã thêm vào hàng đợi. Video sẽ được dịch khi video hiện tại hoàn thành.",
    waitingForVideoData:
      "Đang tải thông tin video, vui lòng thử lại sau giây lát.",
    waitingInQueue: "Đang chờ trong hàng đợi...",
    waitingPosition: "Đang chờ (vị trí #{{position}})",
    cancelWaiting: "Hủy chờ",
    paused: "Đã tạm dừng",
    pausedWithProgress: "Đã tạm dừng ({{completed}}/{{total}})",
    resumeTranslation: "Dịch tiếp",
    batchSingle: "Phần {{batch}}",
    batchFromHere: "Từ phần {{batch}}",
  },

  // Subtitle Modal
  subtitleModal: {
    title: "Phụ đề",
    tabs: {
      translate: "Dịch tự động",
      srt: "Dán phụ đề",
    },

    srt: {
      placeholder: "Dán nội dung phụ đề vào đây...",
      load: "Áp dụng",
      pasteNothing: "Chưa có gì để dán.",
      pasteError: "Không thể dán được.",
      fileError: "Không mở được file này.",
      detected: "Phát hiện phụ đề",
      detectedConfirm: "Bạn vừa sao chép nội dung phụ đề. Muốn dán vào không?",
      fixedErrors: "Đã sửa lỗi phụ đề",
      fixedErrorsMessage: "Đã tự động sửa {{count}} lỗi trong phụ đề.",
    },

    translate: {
      title: "Dịch phụ đề",
      newTranslation: "Dịch mới",
      translating: "Đang dịch...",
      selectConfig: "Chọn kiểu dịch",
      noApiKey: "Chưa có key. Thêm trong Cài đặt nhé",
      noVideo: "Chưa có video",
      noVideoMessage: "Mở video cần dịch trước.",
      notSelected: "Chưa chọn",
      notSelectedMessage: "Chọn kiểu dịch trước nhé.",
      alreadyTranslating: "Video này đang dịch rồi.",
      anotherTranslating: "Đang dịch video khác, vui lòng đợi hoặc dừng trước.",
      waitForDuration: "Đợi video load xong rồi bấm lại nhé.",

      savedTranslations: "Đã dịch",
      deleteTitle: "Xóa bản dịch",
      deleteConfirm: "Bạn muốn xóa bản dịch này?",
      partial: "Chưa xong",
      resumeTitle: "Dịch tiếp",
      resumeConfirm:
        "Đã dịch {{completed}}/{{total}} phần. Tiếp tục dịch các phần còn lại?",
      resume: "Dịch tiếp",

      advancedOptions: "Tùy chọn nâng cao",
      streamingMode: "Dịch từng đợt",
      streamingModeHint: "Xem phụ đề ngay khi mỗi phần dịch xong",
      presubMode: "Xem nhanh",
      presubModeHint: "Phần đầu dịch ngắn hơn để xem ngay (~2 phút)",
      customRange: "Dịch khoảng thời gian",
      customRangeHint: "Để trống = từ đầu/tới cuối",
      rangeFrom: "Từ",
      rangeTo: "Đến",
      rangeEnd: "cuối",
      videoDuration: "Độ dài video: {{duration}}",

      invalidStartTime:
        "Thời gian bắt đầu không hợp lệ. Dùng mm:ss hoặc để trống",
      invalidEndTime:
        "Thời gian kết thúc không hợp lệ. Dùng mm:ss hoặc để trống",
      invalidRange: "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc",
      longVideoWarning:
        "Video dài hơn 1 tiếng. Nên bật chế độ dịch từng đợt để có thể dừng/tiếp tục và xem phụ đề sớm hơn.",
      enableStreaming: "Bật dịch từng đợt",

      progress: {
        translatingPart: "Đang dịch phần {{current}}/{{total}}...",
        translatingVideo: "Đang dịch video...",
        completed: "Xong rồi!",
      },

      success: "Dịch xong rồi! Phụ đề đã sẵn sàng.",
      error: "Không dịch được",
      errorMessage: "Không thể dịch video này.",
      stopTranslation: "Dừng dịch",
      stopRetranslate: "Dừng dịch lại",

      // Batch viewer
      batchList: "Các phần đã dịch",
      retranslateHint: "Dịch lại: phần này | từ đây",
      retranslateTitle: "Dịch lại",
      retranslateConfirm:
        "Dịch lại từ phần {{from}}/{{total}}? Các phần trước sẽ được giữ nguyên.",
      retranslate: "Dịch lại",
      retranslateSingleTitle: "Dịch lại phần này",
      retranslateSingleConfirm:
        "Dịch lại CHỈ phần {{batch}}/{{total}}? Các phần khác sẽ được giữ nguyên.",
      retranslateFromTitle: "Dịch lại từ đây",
      retranslateFromConfirm:
        "Dịch lại TỪ phần {{from}}/{{total}} về sau? Các phần trước sẽ được giữ nguyên.",
      useThis: "Dùng bản này",
      batchViewer: {
        title: "Các phần đã dịch",
        description: "Chọn phần muốn dịch lại nếu bị lỗi",
        batch: "Phần",
        subtitles: "dòng phụ đề",
      },
      batchRetranslated: "Đã dịch lại phần {{batch}}!",
    },
  },

  // Errors
  errors: {
    networkError: "Lỗi kết nối mạng",
    apiError: "Lỗi API",
    unknownError: "Đã xảy ra lỗi không xác định",
    noInternet: "Không có kết nối internet",
    timeout: "Hết thời gian chờ",
    invalidInput: "Dữ liệu không hợp lệ",
    permissionDenied: "Không có quyền truy cập",
    fileNotFound: "Không tìm thấy file",
    quotaExceeded: "Đã vượt quá giới hạn",
    generic: "Có lỗi xảy ra.",
  },

  // Languages
  languages: {
    vi: "Tiếng Việt",
    en: "English",
    auto: "Tự động",
  },

  // Update
  update: {
    title: "Cập nhật ứng dụng",
    checking: "Đang kiểm tra...",
    checkNow: "Kiểm tra cập nhật",
    checkError: "Không thể kiểm tra cập nhật",
    downloadError: "Không thể tải xuống",
    installError:
      "Không thể mở trình cài đặt. Vui lòng vào Cài đặt > Ứng dụng > ZiaSub > Cho phép cài đặt ứng dụng không xác định",
    downloading: "Đang tải...",
    upToDate: "Bạn đang dùng phiên bản mới nhất!",
    available: "Có phiên bản mới!",
    currentVersion: "Phiên bản hiện tại",
    newVersion: "Phiên bản mới",
    changelog: "Có gì mới",
    download: "Tải xuống",
    install: "Cài đặt",
    viewRelease: "Xem\nGitHub",
    later: "Để sau",
    autoCheck: "Tự động kiểm tra cập nhật",
  },
};
