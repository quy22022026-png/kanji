# SupaDesk 2.0 — sửa luồng quyền và bổ sung backend

## Vì sao bản cũ không chạy SQL / tạo bảng?

Bốn file gốc là giao diện. `app.js` gọi `/api/session`, `/api/connect`, `/api/project`, `/api/disconnect`, nhưng mã xử lý những API đó không có trong bộ file được cung cấp.

Nếu địa chỉ hiện tại là `https://<tài-khoản>.github.io/<repo>/`, bạn đang dùng **GitHub Pages**. Pages không chạy Node.js, API hoặc mã server. Chỉ tải bốn file lên Pages không thể tạo ra backend; thêm token vào GitHub Secrets cũng không giải quyết được việc này. GitHub có thể lưu mã nguồn, còn app đầy đủ cần được triển khai lên nền tảng chạy backend.

Ngoài vấn đề hosting, Supabase kiểm tra quyền riêng:

- App dùng **Personal Access Token Supabase** bắt đầu bằng `sbp_`, không dùng token GitHub, khoá `anon`, `service_role`, publishable/secret API key.
- Cần xem được dự án (`projects:read` trong tài liệu OAuth; chọn quyền xem dự án tương ứng trên giao diện token).
- SQL chỉ đọc gọi `/database/query/read-only`, yêu cầu quyền Database Read. API này chạy bằng `supabase_read_only_user`, nên quyền USAGE/SELECT trên schema tuỳ chỉnh có thể khác quyền quản trị.
- Tạo bảng, sửa cấu trúc, thêm/sửa/xoá dữ liệu và SQL ghi gọi `/database/query`, cần quyền ghi phù hợp của token và tài khoản. PostgreSQL tiếp tục kiểm tra quyền trên schema, bảng và quyền chủ sở hữu.
- SQL Editor mặc định bật **Chỉ đọc**. Muốn chạy `CREATE`, `INSERT`, `UPDATE`… phải chủ động tắt và xác nhận. App không tự chuyển sang quyền cao hơn khi gặp lỗi.

Do chưa có URL/log backend và token thực tế, chưa thể kết luận tài khoản của bạn thiếu quyền cụ thể nào. Nút **Kiểm tra quyền** trong bản mới giúp phân biệt các trường hợp trên; việc kiểm tra chỉ chạy `SELECT`, không tạo bảng thử.

## Cách dùng với repo GitHub: triển khai lên Vercel

1. Giải nén gói này. Đưa **toàn bộ nội dung thư mục `supadesk`** vào gốc repo GitHub của bạn. Cần có `package.json`, `vercel.json`, `api/`, `lib/`, `public/` — không chỉ bốn file giao diện. Nếu repo chứa dự án khác, để SupaDesk trong thư mục riêng và chọn thư mục đó làm Root Directory tại bước import.
2. Trong Vercel, chọn **Add New → Project → Import Git Repository**, chọn repo. Dùng cấu hình `vercel.json` đã kèm; không chọn framework frontend khác và không đặt Output Directory thành thư mục gốc repo. Không cần build giao diện.
3. Trong Environment Variables của Vercel, đặt `SESSION_SECRET` là chuỗi ngẫu nhiên ít nhất 32 ký tự. Tạo trên máy bạn bằng:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Giữ giá trị này riêng trong cấu hình server; không commit vào GitHub. Dùng cùng giá trị giữa các lần triển khai nếu muốn giữ phiên kết nối. Không đặt Supabase Access Token vào file JS hoặc repo.

4. Deploy, rồi **mở địa chỉ Vercel**, không mở lại địa chỉ GitHub Pages. API và giao diện cùng tên miền. Với tên miền Vercel mặc định, backend tự lấy origin từ môi trường Vercel. Với tên miền riêng, đặt `APP_ORIGIN=https://ten-mien-cua-ban` và redeploy. `APP_ORIGIN` không có đường dẫn `/repo`.
5. Mở `/api/health` trên cùng tên miền: phải thấy JSON có `"app":"SupaDesk"`, `"version":"2.0.0"`. Sau đó kết nối trong app bằng token Supabase của bạn, chọn dự án và bấm **Kiểm tra quyền**.

Đây là cấu hình nguồn để triển khai. Gói tải về chưa thay đổi repo, hosting hay quyền Supabase của bạn. Phần adapter đã được kiểm thử qua HTTP cục bộ; chưa chạy một lượt triển khai Vercel thực tế trong phiên sửa này.

## Chạy trên máy hoặc VPS

Cần Node.js 22 trở lên. Server chạy không cần thư viện ngoài:

```sh
cp .env.example .env
# Điền SESSION_SECRET vào .env, rồi:
npm start
```

Mở `http://localhost:3000`. Không mở `public/index.html` bằng `file://`. Trong chế độ phát triển, nếu bỏ trống `SESSION_SECRET`, server tạo khoá tạm: khởi động lại sẽ yêu cầu kết nối lại.

VPS production cần HTTPS qua reverse proxy và các biến môi trường:

```text
NODE_ENV=production
SESSION_SECRET=<chuỗi-ngẫu-nhiên-ít-nhất-32-ký-tự>
APP_ORIGIN=https://supadesk.ten-mien-cua-ban
HOST=127.0.0.1
PORT=3000
```

Chuyển tiếp cả `/` và `/api/` về server Node. Với container, có thể đặt `HOST=0.0.0.0`. Đặt `APP_ORIGIN` đúng địa chỉ người dùng truy cập để kiểm tra nguồn yêu cầu hoạt động. Không phục vụ `lib/`, `.env`, `test/` như tài nguyên công khai; server kèm theo chỉ phục vụ bốn file trong `public/`.

## Những thay đổi đã làm

- Bổ sung đủ bốn API và `/api/health`; có adapter Node/Vercel, không cần gửi PAT trực tiếp từ trình duyệt đến Supabase.
- Tách endpoint đọc/ghi đúng Management API. Không dùng regex để giả lập chế độ chỉ đọc, không tự thử lại bằng quyền ghi khi đọc thất bại.
- Nút kiểm tra quyền hiển thị riêng khả năng đọc, gọi API ghi, vai trò database và quyền USAGE/CREATE trên schema. Nếu phát hiện bị từ chối quyền ghi, nút ghi tương ứng được khoá; quyền trên từng bảng vẫn do Supabase kiểm tra khi thực hiện thao tác.
- Nhận diện hosting tĩnh, API trả HTML, token sai loại, phiên hết hạn, thiếu scope, lỗi quyền PostgreSQL và timeout. Thông báo có hướng xử lý, không chỉ hiện “403”.
- Chuyển đường dẫn tài nguyên sang tương đối để giao diện không mất JS/CSS khi đặt trong thư mục repo trên Pages. Pages vẫn chỉ xem được giao diện và thông báo thiếu backend.
- Dùng truy vấn tham số cho giá trị; kiểm tra và quote tên bảng/cột; giới hạn kiểu dữ liệu và tổ hợp giá trị mặc định khi tạo cột.
- Sửa/xoá cần đầy đủ khoá chính, hỗ trợ khoá kép, kiểm tra dấu vân tay dòng gốc để tránh ghi đè dữ liệu vừa được người khác sửa. View không được sửa bằng biểu mẫu.
- Giữ `bigint` và `numeric` dưới dạng chuỗi trong trình xem bảng trước khi JavaScript có thể làm tròn. SQL Editor dùng JSON nguyên bản từ Management API, không bảo đảm độ chính xác cho số lớn đã được API trả về dưới dạng JSON number; khi cần, dùng `::text` trong SQL.
- Tạo bảng bật RLS trong cùng transaction. Không tự tắt RLS hoặc thêm policy cấp quyền rộng. Policy cho ứng dụng sử dụng Data API vẫn phải được thiết kế riêng.
- Nếu ghi thành công nhưng tải lại thất bại, app nói rõ đã lưu và không yêu cầu gửi lại thao tác. Xoá kết quả SQL cũ khi bắt đầu truy vấn mới.
- Cookie kết nối dùng AES-256-GCM, HttpOnly, SameSite=Strict; Secure trong production. Bật ghi nhớ: 30 ngày. Bỏ chọn: cookie phiên, tối đa 8 giờ. PAT không được đưa vào localStorage, phản hồi API hoặc log.
- Kiểm tra origin, JSON và header riêng cho POST; giới hạn kích thước body, timeout, tần suất gọi và xử lý trùng mã yêu cầu ghi trong cùng tiến trình.

## Giới hạn vận hành

Nút kiểm tra quyền ghi **không chứng minh** rằng mọi câu SQL/DDL trên mọi bảng sẽ thành công: kiểm tra chỉ SELECT và đọc quyền schema, không thử ghi. Quyền thực tế, trạng thái dự án và giới hạn tài nguyên vẫn do Supabase quyết định.

Đọc danh sách dự án khi kết nối không chứng minh token có quyền database. Nếu bị từ chối, sửa quyền/phạm vi token hoặc nhờ chủ tổ chức cấp quyền phù hợp, rồi kết nối lại. Tắt “Chỉ đọc” không làm tăng quyền token.

Chống trùng yêu cầu và rate limit ở đây dùng bộ nhớ của từng instance, không phải kho dùng chung. Trên Vercel nhiều instance, không có bảo đảm ghi đúng một lần toàn hệ thống. App không tự gửi lại thao tác ghi; nếu mất phản hồi, luôn kiểm tra kết quả trước khi chủ động gửi lại. Cookie bị xoá khi ngắt kết nối; muốn vô hiệu hoá PAT đã lộ, thu hồi trong Supabase.

Hai API SQL của Supabase đang được tài liệu đánh dấu Beta/experimental và có thể thay đổi. Gói này đối chiếu OpenAPI Supabase ngày 26/11/2026.

## Kiểm thử

```sh
npm ci
npm test
```

Bộ kiểm thử gồm API/HTTP với Supabase giả lập, truy vấn PostgreSQL qua PGlite (PostgreSQL chạy bằng WASM), và tương tác giao diện qua jsdom. Không gọi Supabase thật và không sửa dữ liệu dự án thật. Kiểm tra browser trực quan bị giới hạn do công cụ trình duyệt không khởi chạy được trong môi trường sửa này.

Các luồng được kiểm tra: cookie và hết phiên, CSRF, token sai loại, route đọc/ghi, lỗi 403, yêu cầu ghi trùng mã, cấu trúc bảng/RLS, SQL injection, khoá chính kép, xung đột phiên bản dòng, JSON/array/NULL, độ chính xác số lớn, Pages thiếu backend, giao diện token chỉ đọc và ghi thành công nhưng refresh thất bại.

Tài liệu đối chiếu:

- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://supabase.com/docs/reference/api/v1-run-a-query
- https://supabase.com/docs/reference/api/v1-read-only-query
- https://supabase.com/docs/guides/platform/access-control
- https://supabase.com/docs/guides/platform/personal-access-tokens
