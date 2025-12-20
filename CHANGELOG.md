# Changelog

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
