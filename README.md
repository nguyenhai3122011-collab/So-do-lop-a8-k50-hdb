# Sơ đồ lớp — GitHub Pages

Ứng dụng web tĩnh để quản lý chỗ ngồi trong lớp: kéo thả, đổi tên học sinh, tìm kiếm, xáo trộn, hoàn tác, in và xuất dữ liệu. Dự án không cần backend hay bước build, nên có thể đưa thẳng lên **GitHub Pages**.

## Điểm nổi bật

- **Tự đọc `lastest.json`** khi mở trang; đây là dữ liệu mẫu/bố cục gốc của lớp. Nếu không tải được file, ứng dụng hiển thị popup **“Không tải được sơ đồ, vui lòng tạo sơ đồ mới.”**
- Kéo thả trên máy tính; trên điện thoại có thể **chạm chỗ thứ nhất rồi chạm chỗ đích** để đổi chỗ.
- Giao diện co giãn theo màn hình. Với sơ đồ nhiều cột trên điện thoại, khu vực sơ đồ cuộn ngang để tên vẫn dễ đọc.
- Tự lưu bản đang làm vào `localStorage`. Nếu cập nhật `lastest.json` và triển khai lại, ứng dụng nhận dữ liệu gốc mới.
- Mỗi thay đổi dữ liệu hiển thị popup **Chế độ xem trước**: bản sửa không tự ghi vào repository. Hãy **Xuất JSON**, đổi tên thành `lastest.json`, rồi commit/push file đó lên GitHub. Ảnh/PDF và bản in của một bản xem trước được đóng nhãn **“KHÔNG PHẢI SƠ ĐỒ CHÍNH THỨC”** ở góc.
- Chọn **giao diện sáng hoặc tối** tại nút góc phải trên cùng; lựa chọn được ghi nhớ trong trình duyệt.
- Thêm/sửa/xóa học sinh, tìm kiếm danh sách, thay đổi số hàng/cột/lối đi, điều chỉnh cỡ bàn ghế.
- Hoàn tác/làm lại (`Ctrl/Cmd + Z`, `Ctrl/Cmd + Y`), xuất JSON, CSV, PNG, PDF A4 ngang và in trực tiếp.

## Chạy trên máy

Do ứng dụng cần đọc file JSON, hãy chạy qua một web server thay vì mở trực tiếp `index.html`:

```bash
python3 -m http.server 8000
```

Sau đó truy cập: `http://localhost:8000`

## Đưa lên GitHub Pages

1. Tạo repository mới trên GitHub, ví dụ `so-do-lop`.
2. Đẩy toàn bộ các file trong thư mục này lên nhánh `main`.
3. Vào **Settings → Pages** của repository.
4. Trong **Build and deployment**, chọn **Deploy from a branch**.
5. Chọn nhánh `main`, thư mục `/(root)`, rồi bấm **Save**.
6. Sau ít phút, GitHub cung cấp đường dẫn dạng `https://<tai-khoan>.github.io/so-do-lop/`.

## Cập nhật dữ liệu lớp

Mở file [`lastest.json`](./lastest.json) và chỉnh các trường sau:

```json
{
  "title": "10A8",
  "rows": 6,
  "cols": 9,
  "aisleCols": [4],
  "seats": ["Tên học sinh", "", "…"]
}
```

- `aisleCols` đếm từ **0**: `[4]` nghĩa là cột thứ 5 là lối đi.
- `seats` được ghi theo thứ tự từ trái sang phải, từ trên xuống dưới; số phần tử nên bằng `rows × cols`.
- Ô thuộc lối đi luôn được để trống.
- Có thể dùng nút **Xuất JSON** sau khi chỉnh trên giao diện, sau đó đổi tên file tải về thành `lastest.json` để dùng làm bản mẫu mới.

> Lưu ý: Tên file được giữ là `lastest.json` theo yêu cầu. Không đổi thành `latest.json` nếu không sửa lại đường dẫn trong `app.js`.

## Cấu trúc dự án

```text
├── index.html       # Giao diện ứng dụng
├── styles.css       # Thiết kế responsive + chế độ in
├── app.js           # Logic quản lý sơ đồ
├── lastest.json     # Sơ đồ được nạp mặc định
├── .nojekyll        # Tối ưu triển khai GitHub Pages
└── .gitignore
```

## Ghi chú về xuất ảnh/PDF

Tính năng xuất PNG/PDF tải `html2canvas` và `jsPDF` từ CDN khi cần, vì vậy cần có Internet ở thời điểm xuất. Các tính năng quản lý sơ đồ, lưu cục bộ, JSON, CSV và in vẫn hoạt động mà không cần hai thư viện này.
