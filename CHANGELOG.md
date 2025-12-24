# Changelog

## [0.0.7] - 2024-12-24

### ✨ Tính năng mới

- **FAQ Modal với thông tin tác giả**

  - Thêm FAQModal component với bottom sheet animation và expand/collapse
  - FAQ items bao gồm: video errors, translation process, API keys, queue management, subtitle positioning
  - Thêm author section với links đến GitHub, Facebook, Zalo
  - Tích hợp FAQ modal vào HomeScreen với floating button trigger
  - Hỗ trợ i18n đầy đủ cho tiếng Anh và tiếng Việt

- **Xuất file SRT**

  - Thay thế clipboard paste bằng tính năng export file SRT sử dụng expo-sharing
  - Tên file động từ videoTitle, configName, và presetName
  - Sanitize tên file để loại bỏ ký tự không hợp lệ
  - Validation ngăn export nội dung SRT trống

- **Hỗ trợ Time Range Translation**

  - Thêm time range translation detection và display trong QueueItemCard
  - Hiển thị time range badges với format HH:MM:SS
  - Cập nhật queue status messages phân biệt full, batch, và time range translations
  - Persist time range metadata vào storage
  - Hỗ trợ retranslation với time range offset calculations

- **Responsive CSS cho Desktop YouTube trên Mobile WebView**

  - Inject responsive CSS để force responsive layout trên desktop YouTube
  - Fix guide menu positioning, video player sizing, homepage layout
  - Đảm bảo tất cả components respect 100vw max-width

- **Auto-skip Ads**
  - Thêm isAdPlaying() function để detect ads qua player class names và overlay elements
  - Thêm trySkipAd() function để tự động click skip button
  - Expand skip button selectors cho nhiều YouTube ad UI variations
  - Implement dual click methods: standard .click() và MouseEvent dispatching

### 🐛 Sửa lỗi

- **Error Handling cải tiến**

  - Thêm catch handler cho startTranslation trong TranslateTab
  - Đổi partial translation status từ "translating" sang "paused" để ngăn auto-retry
  - Gửi paused notification với error details và completed batch count
  - Clear progress indicator khi translation bị paused

- **Batch Retranslation Detection**
  - Revert logic batch retranslation detection không chính xác
  - Cải thiện detection logic yêu cầu existingTranslationId

### 🔧 Cải tiến

- **Subtitle Positioning thống nhất**

  - Loại bỏ desktop-specific subtitle settings (desktopBottom, desktopShowBackground)
  - Thống nhất subtitle positioning sử dụng portrait/landscape logic
  - Đổi subtitle positioning từ absolute sang fixed trong portrait mode
  - Thêm performance optimizations (transform, backface-visibility, contain)

- **Presub Mode & Time Range Support**

  - Thêm presub mode detection trong batch retranslation initialization
  - Calculate rangeStart/rangeEnd considering presub mode offset
  - Hỗ trợ retranslation của partial video segments với proper batch boundaries

- **UI Components**
  - Thêm TranslationProgress và SavedTranslationsList UI components
  - Cập nhật i18n translations cho export và time range features

## [0.0.6] - 2024-12-23

### ✨ Tính năng mới

- **Batch Retranslation Tracking & UI**

  - Theo dõi translation ID cụ thể khi dịch lại batch để hiển thị đúng trạng thái
  - Hiển thị badge chế độ dịch lại batch (single/fromHere) trong queue item card
  - Thêm trạng thái "đang chờ" và "đang dịch" riêng biệt cho batch retranslation
  - Auto-expand translation item khi batch retranslation đang active hoặc paused
  - Thêm nút Cancel cho batch retranslation đang paused
  - Hiển thị trạng thái "Paused part X" và "Paused from part X" cho batch retranslation
  - Disable nút translate khi batch retranslation đang active hoặc paused

- **Queue State Management cải tiến**

  - Thêm trạng thái "paused" riêng biệt với "translating" trong queue
  - Tab paused mới với icon pause-circle và badge styling
  - Theo dõi user-paused items để ngăn auto-resume không mong muốn
  - Hiển thị vị trí trong queue và trạng thái waiting với animation pulsing
  - Nút Resume All để resume tất cả items đang paused
  - Nút Clear All để xóa tất cả items đang translating
  - Horizontal scrolling cho queue tabs trên màn hình nhỏ

- **Paused Queue State UI**

  - PausedFab component hiển thị trạng thái paused với progress badge
  - WaitingFab component với pulsing animation và queue position badge
  - Hiển thị progress (completedBatches/totalBatches) cho items đang paused
  - Nút resume translation trong paused state

- **Queue Persistence & Backup**

  - Lưu translation queue vào backup/restore
  - Thêm queueCount vào backup metadata
  - Reset queue manager khi clear all data
  - Giữ lại backup configuration khi clear all data

- **Batch Settings Display**

  - Hiển thị batch settings info trong queue item card (duration, offset, concurrent, streaming)
  - Hiển thị batch settings trong saved translations list
  - Hiển thị concurrent batch count (x2, x3...) khi không dùng streaming mode

- **Notification Improvements**
  - Thêm lockscreen visibility configuration (PUBLIC)
  - Thêm bypassDnd flag để tôn trọng Do Not Disturb settings

### 🐛 Sửa lỗi

- **Batch Retranslation Resume**

  - Sửa lỗi existingTranslationId không được truyền khi resume batch retranslation
  - Sửa lỗi tìm sai translation khi resume (dùng translationId thay vì first translation)
  - Cập nhật progress ngay khi batch retranslation bắt đầu
  - Sửa thứ tự pause và abort để ngăn auto-resume không mong muốn

- **Queue State Fixes**

  - Sửa lỗi totalBatches bị override khi recover paused state
  - Đổi tất cả "translating" items thành "paused" khi app restart
  - Ngăn subscription xử lý abort errors khi item đang bị remove
  - Clear userPausedItems khi remove item từ queue
  - Abort active translation khi remove item từ queue

- **Network Error Handling**

  - Thêm isNetworkError() để detect network errors
  - Hiển thị thông báo lỗi mạng thân thiện thay vì rotate key
  - Đơn giản hóa error message khi tất cả API keys exhausted

- **Translation State**
  - Sửa lỗi stale closure trong queue subscription
  - Ngăn batch retranslation ảnh hưởng đến main translation UI state
  - Clear progress field khi resume paused batch retranslation
  - Validate video duration trước khi bắt đầu translation

### 🔧 Cải tiến

- **Queue Manager Refactor**

  - Thêm moveToPendingByUser method để move items mà không auto-resume
  - Thêm removeFromQueueByUrl helper method
  - Thêm isBeingRemoved() method để track items đang bị remove
  - Thêm clearBatchRetranslateMode method
  - Thêm resumeAllPaused và clearTranslating methods
  - Thêm forceRetranslate option để re-translate completed videos
  - Cải thiện config preservation logic

- **Translation Manager**

  - Lưu videoDuration và batchSettings vào saved translations
  - Persist totalBatches và batchStatuses cho offline access
  - Thêm skipConfirm parameter cho batch retranslation

- **Storage & Cache**

  - Optimize data restore với direct AsyncStorage writes
  - Thêm reinitialize method cho StorageService
  - Trigger app reload sau clearAllData thay vì manual refresh

- **UI/UX**
  - Pass videoTitle qua SubtitleInputModal đến TranslateTab
  - Auto-enable queue processing khi direct translation completes
  - Simplify saved translations header bằng cách remove inline resume button
  - Ensure batch counts luôn defined trong paused queue items

## [0.0.5] - 2024-12-22

### ✨ Tính năng mới

- **Background Service cho Android**

  - Thêm BackgroundServiceManager với foreground service support cho Android
  - Tích hợp react-native-background-actions và expo-task-manager
  - Thêm quyền FOREGROUND_SERVICE, FOREGROUND_SERVICE_DATA_SYNC, và WAKE_LOCK
  - Quản lý queue và translation task khi app chạy nền
  - Cho phép dịch liên tục ngay cả khi app ở background

- **Cấu hình Presub mặc định**

  - Thêm DEFAULT_PRESUB_CONFIG_ID constant cho config reference nhất quán
  - Tạo createDefaultPresubConfig() với settings tối ưu cho presub mode
  - Tự động khởi tạo default presub config nếu chưa có
  - Tách biệt cấu hình presub khỏi translation pipeline chính

- **Chọn Presub Config cho Batch Translation**

  - Thêm presub config picker UI trong BatchSection với dropdown menu
  - Lọc và hiển thị các Gemini configs khả dụng (loại trừ chat config)
  - Thêm presubConfigId field vào BatchSettings type
  - Translation manager sử dụng presub config khi xử lý batches
  - Visual indicators (icons, checkmarks) cho config đã chọn

- **Notification Preferences chi tiết**

  - Thêm notification source filtering (queue vs direct translation)
  - Thêm notification type preferences (completion, batch completion, errors)
  - Extract ToggleRow component cho reusable notification toggle UI
  - Cập nhật NotificationSettings type với các preference fields mới
  - Disabled state styling cho conditional toggle rows

- **Keyboard Controller Integration**
  - Thêm KeyboardProvider wrapper vào App.tsx root component
  - Cài đặt react-native-keyboard-controller dependency
  - Cải thiện keyboard handling trong ChatModal, GeminiEdit, SrtTab, SubtitleInputModal
  - Thêm statusBarTranslucent và navigationBarTranslucent props
  - Auto-scroll to latest messages khi content size thay đổi

### 🐛 Sửa lỗi

- **Queue Background Service Lifecycle**

  - Di chuyển background service stop call chỉ khi queue hoàn toàn trống
  - Dừng background service ngay lập tức cho single item translations
  - Thêm remaining items check trước khi stop service
  - Ngăn chặn việc dừng background service sớm trong batch processing

- **Notification Improvements**
  - Loại bỏ emoji characters (✅, ❌, 🎉) khỏi notification titles
  - Thêm "direct" source parameter cho tất cả notification calls
  - Cải thiện notification consistency và source tracking

### 🔧 Cải tiến

- **Translation Manager Options**

  - Thêm skipNotification flag để ngăn duplicate notifications
  - Thêm skipBackgroundControl option để ngăn duplicate background service calls
  - Queue manager quản lý toàn bộ notification delivery
  - Ngăn race conditions giữa queue và translation manager

- **Keyboard Handling Refactor**

  - Thay thế KeyboardAwareScrollView bằng ScrollView trong SrtTab
  - Implement react-native-keyboard-controller cho keyboard height tracking
  - Thêm Reanimated animated styles cho smooth keyboard avoidance
  - Wrap bottom sheet content với keyboard-aware container
  - Cải thiện performance với worklet-based event handlers

- **Dependencies**

  - Thêm react-native-reanimated ~4.1.1 với babel plugin integration
  - Upgrade @babel/code-frame từ 7.10.4 lên 7.27.1
  - Deduplicate và flatten dependency tree trong package-lock.json

- **Storage Migration**

  - Migrate từ file-based storage sang AsyncStorage
  - Tăng AsyncStorage limit lên 200MB trên Android
  - Tạo storageService.ts và backupService.ts mới
  - Thêm backup/restore functionality trong onboarding và settings
  - Auto-backup khi app goes to background
  - Hỗ trợ local storage và SAF (Storage Access Framework)
  - Tự động migration từ file storage cũ sang AsyncStorage mới

- **Config Updates**
  - Cập nhật Android package name từ com.tomis.youtubesrtplayer sang com.tomisakae.ziasub
  - Thêm local.properties với Android SDK directory configuration

## [0.0.4] - 2024-12-21

### ✨ Tính năng mới

- **Push Notification Support**

  - Thêm expo-notifications plugin với custom icon và branding color
  - Tạo NotificationSection component để quản lý notification preferences
  - Implement notificationService với push notification handling
  - Thêm quyền POST_NOTIFICATIONS cho Android
  - Tích hợp notification settings vào SettingsModal và GeneralTab
  - UI NotificationSection với icon bell thay đổi màu theo trạng thái enabled
  - Switch track color sử dụng success color khi enabled

- **Translation Progress Redesign**

  - Thay thế ActivityIndicator bằng custom icon-based progress visualization
  - Thêm i18n support cho multi-batch và single-batch translation status
  - Implement linear progress bar hiển thị overall translation completion percentage
  - Redesign batch indicator grid với visual states (completed, processing, error)
  - Header section với icon, title, key status, và progress percentage display
  - Animated progress tracking với color-coded batch indicators

- **Queue Status Tracking Enhancement**

  - Thêm "waiting in queue" status để phân biệt items đang chờ xử lý
  - Unified status styling system với color và icon mapping cho tất cả states
  - Hiển thị item progress count (completed/total) trong translating status text
  - Consolidate status badge logic với appropriate icon cho mỗi queue state
  - Tăng action button icon sizes từ 20 lên 22 để dễ nhìn hơn

- **Stop All Functionality**

  - Thêm handleStopAll method để dừng toàn bộ queue
  - Implement stopAll method trong QueueManager để abort current translation và pause queue
  - Thêm isAutoProcessing method để check auto-process state
  - Hiển thị "Stop all" button trong translating tab khi items đang được xử lý
  - Preserve partial translation data khi stopping items với completed batches

- **Preset Tracking & Batch Time Range**

  - Thêm presetId field vào SavedTranslation và TranslationJob types
  - Hiển thị preset name như badge bên cạnh config name trong SavedTranslationsList
  - Hiển thị batch time range (start - end) thay vì chỉ start time trong batch chips
  - Implement batch tolerance logic để treat videos trong batchDuration + batchOffset như single batch
  - Persist presetId throughout translation lifecycle (creation, resumption, partial saves)

- **Onboarding ApiKeyStep Scroll Support**
  - Wrap main content trong ScrollView để enable scrolling trên smaller screens
  - Configure ScrollView với keyboardShouldPersistTaps="handled" cho better keyboard interaction

### 🐛 Sửa lỗi

- **Queue Item Processing**

  - Thêm tracking cho current processing item ID để prevent duplicate processing
  - Thêm user paused items set để phân biệt user stops và auto-pauses
  - Thêm translation manager unsubscribe tracking để prevent subscription leaks
  - Improve processItem để skip nếu đang processing cùng item hoặc item bị user stop
  - Clear user paused items khi user manually resumes translation
  - Capture item ID trong subscription closure để ensure correct item updates

- **Cache & Translation Deletion**

  - Replace empty state với complete removal khi deleting translations
  - Thêm validation để prevent loading empty hoặc deleted translation data
  - Check translation index trước khi loading từ file để detect recent deletions
  - Validate translation data có non-empty translations array trước khi caching
  - Thêm force flush sau deletion để ensure immediate persistence

- **Translation Preloading & Cache Persistence**

  - Thêm translation index preloading cho fast video lookup
  - Implement translation index methods (hasTranslationIndex, addToTranslationIndex, removeFromTranslationIndex, getTranslationVideoIds)
  - Make app state handler async để properly await cache flush khi going to background
  - Update ApiKeysSection sử dụng forceFlush thay vì direct saveApiKeys calls
  - Thêm preloadTranslations step vào app initialization

- **Keyboard Handling**

  - Đổi Android keyboard layout mode từ "pan" sang "resize" trong app.json
  - Wrap GeminiEdit component với KeyboardAvoidingView
  - Thêm platform-specific keyboard behavior và vertical offset configuration
  - Update SubtitleInputModal keyboard behavior sử dụng "height" mode trên Android

- **Queue Auto-Process Logic**

  - Fix batch progress calculation để include skipped batches trong completed count
  - Sử dụng accumulated results thay vì only successful results cho merged SRT output
  - Refactor auto-process logic để only continue queue sau "Translate All", không sau direct translations
  - Thêm auto-detection của resume state dựa trên partial SRT và completed batch ranges
  - Implement safe unsubscribe mechanism để prevent duplicate subscription callbacks

- **Busy State Handling**
  - Update startTranslation(), resumeTranslation(), startAutoProcess() để return status object
  - Thêm busy state checks để prevent concurrent translations
  - Display user-friendly alert khi translation đang in progress
  - Improve processNextItem() để detect partial data và resume thay vì starting fresh

### 🔧 Cải tiến

- **QueueItemCard Styling Refactor**

  - Import createThemedStyles trực tiếp thay vì separate queueStyles file
  - Rename progress state variables cho clarity (showProgress → isActivelyTranslating, isWaitingToResume → isPaused)
  - Thêm progressPercent calculation để unify progress display logic
  - Introduce cardBorderColor state để visually distinguish active vs paused items
  - Refactor progress overlay thành bottom progress bar với dynamic width và color
  - Thêm status badges (loading/pause icons) vào thumbnail area
  - Fix duration calculation sử dụng Math.floor cho consistent formatting

- **UI/UX Improvements**
  - Update release view button text với line break cho better button layout
  - Preset badge styling với MaterialCommunityIcons tag-outline icon
  - Improve visual hierarchy với primary color background và icon

## [0.0.3] - 2024-12-21

### ✨ Tính năng mới

- **Tiếp tục dịch dở dang (Resume Translation)**

  - Thêm khả năng tiếp tục dịch từ batch cuối cùng đã hoàn thành
  - Lưu trữ và khôi phục partial translation data (partialSrt, completedBatches, totalBatches)
  - Hiển thị trạng thái "paused" với màu cam cho các item đang chờ tiếp tục
  - Tự động bật streaming mode khi resume để đảm bảo hoạt động đúng
  - Hỗ trợ resume với existing translation ID để cập nhật thay vì tạo mới
  - Thêm dialog xác nhận resume với thông tin tiến độ dịch

- **Hệ thống Badge trạng thái video**

  - Badge ㋐ (màu tím) cho video đã dịch hoàn chỉnh
  - Badge ◐ (màu cam) cho video chỉ có bản dịch một phần
  - Phân biệt rõ ràng giữa full và partial translations

- **Dịch lại theo Batch (Batch Retranslation)**

  - Expandable batch details hiển thị thông tin chi tiết từng batch (thời gian, số subtitle)
  - Chế độ "single": dịch lại chỉ batch được chọn, giữ nguyên các batch khác
  - Chế độ "fromHere": dịch lại từ batch được chọn trở đi
  - Giữ nguyên batch settings gốc để đảm bảo tính nhất quán khi dịch lại
  - Hiển thị trạng thái batch (completed/error/pending) với màu sắc phân biệt
  - Animation mượt mà khi expand/collapse batch details

- **Preset Prompt Picker**

  - Bottom sheet modal với smooth slide-up/fade animations
  - 5 preset prompts chuyên biệt cho các loại video:
    - Music Video: dịch lời bài hát với độ chính xác cảm xúc
    - Visual Novel: phân biệt giọng nhân vật và narrative
    - Anime: xử lý honorific và cultural references
    - Gaming: thuật ngữ game và streamer commentary
    - Vlog/Tutorial: nội dung conversational và technical
  - Tùy chọn Custom prompt để sử dụng prompt tự định nghĩa
  - Lưu presetId vào Gemini config, resolve prompt tại runtime
  - Tích hợp vào cả QueueActions và TranslateTab

- **Video Time Range Selection trong Chat**

  - Component VideoTimeRangePicker với native slider
  - Hiển thị badge thời gian đã chọn trong ChatInput
  - Persist videoTimeRange và videoUrl trong chat messages
  - Hiển thị time range tag trong TaskCard
  - Truyền time range vào API calls cho video processing

- **Cấu hình AI nâng cao**

  - Media Resolution: High, Medium, Low, Unspecified
  - AI Thinking Level: High, Medium, Low, Minimal
  - Model-specific thinking configuration:
    - Gemini 2.5 Pro: full thinking levels
    - Gemini 2.5 Flash: limited thinking (LOW/HIGH only)
    - Gemini 3 Pro: budget-based thinking với range tùy chỉnh
  - Ẩn media resolution cho Gemini Flash Lite
  - Thinking budget input cho các model hỗ trợ

- **Reset to Defaults**

  - Nút "Reset to defaults" trong GeneralTab settings
  - Dialog xác nhận destructive trước khi reset
  - Reset subtitle, batch, TTS, floating UI settings
  - Giữ nguyên API keys và user data (translations, chat history)
  - Hint giải thích dữ liệu nào được giữ lại

- **Cải tiến Time Range Input**

  - TimeInput component với nút +/- 10 giây để điều chỉnh chính xác
  - Hỗ trợ nhiều format nhập: phút, m:ss, h:mm:ss
  - Auto-formatting khi gõ với intelligent colon insertion
  - Validation và sanitization input
  - Layout vertical stacking cho mobile responsiveness
  - maxLength 8 ký tự, maxSeconds validation theo video duration

- **Cải tiến Queue Modal**
  - Dynamic top padding theo platform-specific status bar height
  - Border radius 24 với overflow hidden
  - Close button 44x44 với proper touch target
  - Loại bỏ modal backdrop overlay

### 🐛 Sửa lỗi

- **Subtitle Modal**: Sửa lỗi stale closure bằng cách gọi onApplySubtitles trực tiếp với current srt content
- **Translation Deletion**: Set empty state thay vì remove từ cache để tránh stale data khi file flush chưa hoàn thành
- **Video Translation Validation**:
  - Kiểm tra null/empty cho video URL ở nhiều entry points
  - Validate normalized URL đảm bảo đúng format YouTube
  - Validate API response trước khi xử lý
- **Chat Session**: Persist session ngay sau khi xóa task, tránh orphaned sessions
- **Queue Manager**: Clear partialSrt, completedBatches, totalBatches, completedBatchRanges khi retry item
- **GeminiEdit**: Cải thiện status bar handling và z-index layering trên Android
- **Cache Service**: Merge floatingUI settings để tránh undefined state khi khởi tạo

### 🔧 Cải tiến

- **Timestamp Handling**

  - Thêm skipTimestampAdjust option cho callers tự xử lý adjustment
  - Cải thiện detectTimestampMode với distance-based comparison thay vì fixed tolerance
  - Threshold calculation dựa trên expectedOffset (20% hoặc minimum 60s)
  - Xử lý edge case khi expectedOffset là 0 hoặc âm

- **SRT Parser**

  - Video duration validation trong batch replacement
  - Loại bỏ subtitles bắt đầu sau video duration
  - Clamp end times không vượt quá video duration

- **Translation Manager**

  - Batch status tracking (pending/completed/error) với visual indicators
  - Support updating existing translations với existingTranslationId
  - Thêm updatedAt timestamp cho SavedTranslation
  - Subscribe to translationManager để resume queue sau direct translations
  - Kiểm tra isTranslating() trước khi process queue items

- **Queue Manager**

  - markVideoStopped method cho user-initiated stops
  - Preserve partial results khi stopping mid-process
  - Track completed batch ranges cho resumed translations
  - savedTranslationId field để track translation updates

- **State Management**

  - Đơn giản hóa user-initiated stop handling
  - Delegate state updates to stopTranslation() method
  - Clear progress field khi pausing để hiển thị đúng UI state
  - Auto-process trigger sau successful stop nếu auto-process enabled

- **UI/UX**
  - Translations list reload callback khi hoàn thành hoặc fail
  - Modal visibility tracking để reload translations khi mở lại
  - Warning cho video dài (>1 giờ) với gợi ý bật streaming mode
  - Button3D với "warning" variant và dynamic sizing (normal/small)
  - Progress percentage trong saved translations list cho partial translations

## [0.0.2] - 2024-12-20

### ✨ Tính năng mới

- **Hỗ trợ YouTube Shorts**: Thêm khả năng dịch video Shorts với giao diện phụ đề tối ưu

  - Tự động nhận diện video Shorts từ URL `/shorts/`
  - Lấy tiêu đề video Shorts chính xác từ nhiều selector khác nhau
  - Hiển thị nút thêm vào hàng đợi trên thumbnail Shorts

- **Cache Service**: Thêm hệ thống cache in-memory với background persistence

  - Cải thiện hiệu suất đọc/ghi dữ liệu
  - Write-through pattern: cập nhật cache ngay lập tức, lưu file ở background
  - Hỗ trợ lazy loading cho translations và SRT files

- **Trích xuất thời lượng video**: Tự động lấy duration từ thumbnail overlay để tính toán batch

### 🐛 Sửa lỗi

- **Lỗi không hiện bản dịch AI**: Sửa lỗi không hiển thị các bản dịch đã lưu trong tab dịch tự động
- **Thứ tự danh sách dịch**: Video thêm vào sau giờ hiển thị đúng vị trí (ở cuối danh sách)
- **Hiển thị progress batch**: Sửa lỗi video dài hơn giới hạn thời gian vẫn hiển thị 0/1
  - Chỉ hiển thị progress overlay khi có dữ liệu progress thực sự
  - Loại bỏ tính toán batch dự đoán không chính xác
- **Lỗi bản dịch không hiển thị**: Sửa lỗi video dịch xong từ hàng đợi không thấy bản dịch khi bấm vào
  - Tối ưu logic xóa translation để tránh race condition với cache
  - Cập nhật UI ngay lập tức trước khi persist vào storage
- **Lỗi dừng/hủy dịch vẫn chạy nền**: Thêm abort signal support cho translation jobs
  - Thêm `AbortController` để hủy request đang chạy
  - Thêm flag `isAborted` để ngăn cập nhật UI sau khi dừng
  - Suppress error logging cho user-initiated stops

### 🔧 Cải tiến

- Đơn giản hóa logic định vị phụ đề
- Loại bỏ batch settings không cần thiết từ queue components
- Cải thiện detection tiêu đề video trên mobile YouTube
