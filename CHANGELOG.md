# Changelog

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
