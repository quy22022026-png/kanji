# Sổ Ghi Sản Lượng Công Hái

## Bản cập nhật giao diện

Bản này không đổi schema, không cần chạy lại SQL. Khi thay file web trên hosting, **giữ `soghi-config.js` đang dùng** (URL/key của bạn); tải lại trang sau khi chép đủ file, gồm cả `soghi-ui.js`. Dữ liệu cũ trong IndexedDB và Supabase được giữ nguyên.

- Trong sổ, chạm **tên người ▾** để mở danh sách chuyển nhanh; có tìm tên và đánh dấu người đang mở. Chuyển người giữ ngày đang xem, trạng thái bàn phím và bản nháp riêng theo từng người/ngày trong lần mở ứng dụng.
- Chạm **⋯** cạnh cây bút để mở Ứng tiền, Kết sổ, Lịch sử, Màu hiển thị, Thống kê và Cài đặt. Các nút tiền công không còn nằm dưới trang giấy.
- Màu hiển thị được chọn riêng cho mỗi người hoặc theo màu chung. Màu áp dụng cho tiêu đề, tên và biểu tượng; nền giấy giữ màu kem. Màu nằm trong sao lưu JSON và được đồng bộ như dữ liệu người hái.
- Các ô ngày hiển thị `dd/mm/yyyy`; chạm ô để mở lịch của thiết bị. Khoảng ngày trên điện thoại xếp hai hàng để không tràn.
- **Thống kê** là màn hình riêng, mở từ menu chính ⋯ hoặc menu sổ. Chọn cả đội/một người và Hôm nay/Khoảng ngày/Toàn bộ. Chuyển Bảng số liệu/Biểu đồ, rồi chọn Theo người/Theo ngày. Đổi kiểu xem giữ nguyên bộ lọc.
- Thống kê chỉ tính số kg đã lưu, gồm cả phần đã kết sổ; không tính bản nháp. Theo ngày chỉ liệt kê những ngày có ghi chép. Chạm cột để xem số kg và số lần; vuốt ngang biểu đồ nếu có nhiều cột. Dữ liệu mới nhận qua đồng bộ sẽ cập nhật kết quả.


## Mở ứng dụng

Đặt toàn bộ file `soghi*` cùng thư mục trên hosting HTTPS, mở `soghi.html`.
Để chạy trên máy tính: mở terminal tại thư mục rồi chạy `python -m http.server 8000`, truy cập `http://localhost:8000/soghi.html`.
Không mở trực tiếp bằng `file://`. Trên iPhone, mở bằng Safari rồi chọn Thêm vào màn hình chính.

Ứng dụng dùng IndexedDB trên thiết bị và Supabase để đồng bộ. Khi URL/key còn trống trong config, ứng dụng tiếp tục dùng chế độ cục bộ; điền đủ URL/key và chạy SQL để dùng cùng tài khoản trên nhiều thiết bị.

Khi thay phiên bản cũ, giữ nguyên tên miền và đường dẫn đang sử dụng để trình duyệt tiếp tục truy cập dữ liệu hiện có. Nên sao lưu trước khi cập nhật. Database `soghi_local_demo_v1` được nâng từ phiên bản 1/2 lên 3, giữ lại tài khoản, PIN, người hái và sản lượng cũ. Bản 3 thêm trạng thái/hàng đợi đồng bộ trong IndexedDB. Nếu có yêu cầu đóng tab cũ, đóng các tab Sổ Ghi khác rồi tải lại.

## Kết nối Supabase — làm một lần

1. Trong Supabase, mở **Database → Extensions**, kiểm tra `pgcrypto` đã bật. Script sử dụng đúng namespace pgcrypto đang có, không di chuyển extension.
2. Mở **SQL Editor**, tạo New query, dán toàn bộ **`soghi-supabase.sql`**, bấm Run. Chạy cả file, không tách từng đoạn. Script có transaction và kiểm tra trước khi cài. Nếu đã có cấu trúc `soghi_` khác, script dừng; không xóa bảng để ép chạy tiếp.
3. Lấy **Project URL** và **Publishable key** (hoặc legacy `anon` key) trong Project Settings / API Keys.
4. Điền hai giá trị trong **`soghi-config.js`**, giữ `mode: "auto"`:

   ```js
   supabaseUrl: "https://MA_DU_AN.supabase.co",
   supabaseAnonKey: "PUBLISHABLE_HOAC_ANON_KEY",
   ```

   Không dùng `service_role`, `sb_secret_...` hoặc database password. URL/key ở trên là cấu hình phía trình duyệt; việc truy cập dữ liệu còn cần phiên username/PIN.
5. Tải các file web `soghi*` cùng thư mục lên hosting HTTPS, mở **`soghi.html`**, tải lại trang. File SQL và thư mục `soghi-tests` phục vụ cài đặt/kiểm thử, không cần tải lên hosting.
6. Tài khoản mới: tạo tài khoản ngay trên web khi có mạng. Thiết bị khác đăng nhập cùng username/PIN để nhận dữ liệu.
7. **Đang có dữ liệu cũ trên trình duyệt:** sao lưu JSON, mở Cài đặt → Đồng bộ Supabase → nhập PIN hiện tại để liên kết. Dữ liệu cục bộ được giữ và ghép theo ID; nếu có xung đột, ứng dụng yêu cầu đối chiếu. Không tạo lại tài khoản cục bộ cùng username. Nếu cần, đăng xuất rồi đăng nhập bằng username/PIN cũ cũng thực hiện liên kết.

Không cần cấu hình email, OTP, Supabase Auth hoặc sửa cơ chế đăng nhập của các dự án khác. Username/PIN được xác thực qua các RPC `soghi_`; PIN dùng bcrypt, phiên 30 ngày chỉ lưu hash trên máy chủ. Sai PIN 5 lần sẽ tạm khóa đăng nhập 15 phút. Chưa có chức năng Admin đặt lại PIN.

## Bảng và đồng bộ

- `soghi_accounts`: tài khoản username/tên hiển thị và PIN đã băm.
- `soghi_harvesters`: người hái thuộc tài khoản.
- `soghi_entries`: từng lần ghi kg, ngày và người hái.
- `soghi_rates`: giá chung/riêng theo ngày áp dụng.
- `soghi_advances`: lịch sử ứng tiền.
- `soghi_settlements`, `soghi_settlement_entries`, `soghi_settlement_advances`: snapshot kết sổ, các lần ghi đã chốt, các khoản ứng đã khấu trừ.
- `soghi_settings`, `soghi_sessions`, `soghi_requests`, `soghi_schema`: giao diện, phiên, nhận diện yêu cầu gửi lại và phiên bản cài đặt.

Tất cả bảng và hàm riêng đều có tiền tố `soghi_`. Không cấp quyền đọc bảng trực tiếp cho anon/authenticated; chỉ các RPC được chỉ định mới có quyền thực thi. Các RPC lấy tài khoản từ phiên đăng nhập, không nhận account ID tùy ý từ trình duyệt.

Trạng thái dưới trang cho biết đã đồng bộ, đang chờ, ngoại tuyến hay cần đối chiếu. Khi có thay đổi, ứng dụng tự gửi sau một nhịp ngắn; lúc mở ứng dụng sẽ kiểm tra cloud mỗi 15 giây, hoặc chọn Đồng bộ ngay trong Cài đặt. IndexedDB lưu bền vững dữ liệu chờ và mã yêu cầu; gửi lại sau mất mạng không tạo bản ghi mới.

Các bản ghi khác nhau được ghép. Nếu hai thiết bị sửa cùng bản ghi, web giữ dữ liệu trên máy và yêu cầu chọn bản trong Cài đặt → Đồng bộ Supabase. Có nút sao lưu JSON trước khi đối chiếu. Dữ liệu đã kết sổ trên cloud được bảo vệ.

## Ghi sản lượng

- Tạo tài khoản/đăng nhập bằng username và PIN 6 chữ số như phiên bản cũ.
- Thêm người hái ở màn hình chính, chạm tên để mở sổ.
- Chạm bút trên thanh tiêu đề để bật/tắt bàn phím riêng. Không dùng bàn phím iPhone để nhập kg.
- Số đang gõ xuất hiện ngay trên sổ trong ô có viền xanh. Đây là **bản nháp**, chưa tính vào số lần/tổng.
- Nhấn ENTER để lưu và nhập tiếp. Bàn phím vẫn mở; tổng và số lần đã lưu luôn hiện trên bàn phím.
- Chạm số đã lưu để sửa. Gõ số mới để thay thế; xóa lùi để sửa từng ký tự. Có Hủy nhập và Xóa số.
- Bản nháp được giữ riêng theo người/ngày trong lần mở ứng dụng, không nằm trong file sao lưu và không được giữ sau khi tải lại/đóng ứng dụng.
- Mỗi cột 7 hàng, ghi từ trên xuống. Điện thoại hiển thị mặc định 4–5 cột theo chiều rộng; quá sức chứa thì tăng cột và cuộn ngang. Ô đang nhập tự cuộn vào vùng nhìn thấy.
- Đổi ngày bằng nút, lịch hoặc vuốt trên phần giấy ngoài vùng ô số. Vuốt trong bảng dành cho cuộn ngang.

## Đơn giá trong Cài đặt

Mở Cài đặt → Đơn giá công hái theo ngày.

- Chọn giá chung cho tất cả hoặc giá riêng của một người.
- Nhập ngày bắt đầu áp dụng và đơn giá đồng/kg, không dùng dấu phân cách hàng nghìn.
- Mỗi mức có hiệu lực đến mức kế tiếp của cùng đối tượng; giá riêng được ưu tiên hơn giá chung.
- Ví dụ giá chung từ 01/11 là 2.000đ, từ 10/11 là 2.500đ: ngày 01–09 tính 2.000đ/kg, từ ngày 10 tính 2.500đ/kg.
- Có thể sửa/xóa mức giá. Chỉ phần chưa kết sổ được tính lại, lịch sử đã chốt giữ nguyên.
- Nếu một ngày chưa có giá áp dụng, ứng dụng yêu cầu bổ sung giá trước khi kết sổ.

## Ứng tiền và kết sổ

Trong sổ của từng người, mở menu **⋯** để chọn Ứng tiền, Kết sổ hoặc Lịch sử.

1. Ứng tiền: ghi ngày, số tiền nguyên đồng, ghi chú. Khoản chưa khấu trừ có thể sửa/xóa trong Lịch sử.
2. Kết sổ: chọn khoảng từ ngày–đến ngày (cùng một ngày để tính một ngày), hoặc toàn bộ phần chưa kết toán.
3. Nhấn Tính tiền để xem chi tiết: kg từng ngày × đơn giá ngày đó; làm tròn tiền đến đồng theo từng ngày rồi cộng.
4. Với khoảng ngày, khấu trừ tiền ứng chưa sử dụng đến hết ngày cuối, bao gồm cả khoản ứng trước ngày bắt đầu. Chế độ toàn bộ bao gồm tất cả tiền ứng chưa sử dụng.
5. Nếu tiền ứng vượt tiền công, chỉ khấu trừ bằng tiền công; phần ứng còn lại giữ trên khoản ứng gốc để dùng lần sau. Số phải trả không âm.
6. Nhấn Xác nhận kết sổ để lưu lịch sử. **Trong chế độ Supabase, bước xác nhận cần mạng:** máy chủ tính và khóa dữ liệu trong một giao dịch, ngăn hai thiết bị kết sổ trùng. Mất phản hồi sẽ giữ mã yêu cầu để kiểm tra lại, không chốt lần hai. Đây là ghi nhận kết toán trong sổ, không thực hiện chuyển tiền.

Các số kg đã kết sổ bị khóa sửa/xóa; khoản ứng đã được khấu trừ một phần hoặc toàn bộ cũng bị khóa. Không thể xóa người đã có lịch sử kết sổ. Những phần này được giữ để đối chiếu, tránh thay đổi số tiền đã chốt.

Nếu số liệu hoặc đơn giá thay đổi sau khi xem trước, ứng dụng yêu cầu tính lại trước khi xác nhận. Mỗi số kg chỉ thuộc một lần kết sổ; một khoản ứng không thể bị khấu trừ vượt số tiền gốc.

## Sao lưu, khôi phục, CSV và offline

- JSON sao lưu toàn bộ sản lượng, đơn giá, tiền ứng, lịch sử kết sổ và giao diện của tài khoản hiện tại; không chứa PIN.
- Hỗ trợ khôi phục JSON phiên bản cũ và mới. File được kiểm tra trước, thao tác thay thế dùng một giao dịch: nếu ghi lỗi, dữ liệu cũ được giữ lại.
- Khôi phục vẫn **thay thế** toàn bộ dữ liệu của tài khoản đang đăng nhập sau xác nhận; nên giữ một bản sao lưu hiện tại trước khi khôi phục bản cũ. Chế độ cloud cần liên kết và đồng bộ xong trước khi khôi phục; nếu cloud thay đổi trong lúc khôi phục, web yêu cầu đối chiếu, không tự ghi đè dữ liệu mới.
- Khôi phục file sang tài khoản khác tự đổi ID khi bị trùng và giữ đúng quan hệ, không ghi đè dữ liệu của tài khoản gốc.
- CSV mở được bằng Excel: gồm người hái, ngày, kg, thời điểm nhập, đơn giá, trạng thái và mã kết sổ. JSON dùng để lưu đầy đủ lịch sử tiền công.
- Mở ứng dụng khi có mạng ít nhất một lần để Service Worker tải đủ tài nguyên. Sau đó có thể tải lại và nhập offline. Khi có mạng trở lại, các thay đổi được tự đồng bộ. Đăng nhập lần đầu/liên kết và xác nhận kết sổ cần mạng; ghi kg, sửa/xóa phần chưa chốt, đặt giá và ghi ứng tiền vẫn dùng offline.
- Không xóa dữ liệu trang web trong cài đặt trình duyệt nếu chưa sao lưu.

Kiểm tra phần tính toán: `node soghi-ledger.test.cjs`. Kiểm tra ghép dữ liệu: `node soghi-tests/soghi-sync.test.cjs`. Bộ SQL và các luồng đồng bộ đã được kiểm tra bằng PostgreSQL tạm và các hồ sơ trình duyệt độc lập; chưa chạy trên dự án Supabase của bạn. Thư mục kiểm thử không cần đưa lên hosting.

Kiểm tra phần giao diện/thống kê độc lập: `node soghi-tests/soghi-ui.test.cjs`.
