export class AppError extends Error {
  constructor(status, code, message, hint = "") {
    super(message);
    Object.assign(this, { status, code, hint });
  }
}

export function assert(condition, message, code = "INVALID_INPUT") {
  if (!condition) throw new AppError(400, code, message);
}

export function safeMessage(value) {
  return String(value || "")
    .replace(
      /sbp_[\w-]+|sb_secret_[\w-]+|eyJ[\w-]+\.[\w-]+\.[\w-]+/g,
      "[đã ẩn mã]",
    )
    .slice(0, 1200);
}

export function upstreamError(status, detail, readOnly = false) {
  const text = safeMessage(detail);
  if (status === 401)
    return new AppError(
      401,
      "TOKEN_INVALID",
      "Supabase từ chối Access Token.",
      "Token đã hết hạn, bị thu hồi hoặc không phải Personal Access Token. Tạo token trong Supabase Account → Access Tokens rồi kết nối lại.",
    );
  if (/read.only transaction|25006|cannot execute.*read.only/i.test(text))
    return new AppError(
      403,
      "READ_ONLY_SQL",
      "Câu SQL thay đổi dữ liệu bị chặn trong chế độ Chỉ đọc.",
      "Tắt “Chỉ đọc”, kiểm tra đúng dự án và xác nhận chạy SQL nếu bạn muốn thay đổi dữ liệu.",
    );
  if (
    /permission denied|must be owner|42501|insufficient.privilege/i.test(text)
  )
    return new AppError(
      403,
      "DATABASE_PERMISSION",
      "Tài khoản database không có quyền thực hiện thao tác.",
      `${readOnly ? "Truy vấn đang chạy bằng supabase_read_only_user; schema tuỳ chỉnh có thể chưa cấp quyền USAGE/SELECT cho vai trò này. " : ""}Kiểm tra quyền của vai trò database và chủ sở hữu bảng/schema trong Supabase. Không cần tắt RLS để xử lý lỗi quyền quản trị này. Chi tiết: ${text}`,
    );
  if (status === 403)
    return new AppError(
      403,
      "TOKEN_SCOPE",
      "Access Token hoặc vai trò Supabase thiếu quyền cho thao tác này.",
      `Kiểm tra phạm vi dự án, quyền Database ${readOnly ? "Read" : "Write"} của token và vai trò tài khoản trong tổ chức. App không thể tự cấp thêm quyền. Chi tiết: ${text || "Supabase trả về HTTP 403."}`,
    );
  if (status === 429)
    return new AppError(
      429,
      "RATE_LIMIT",
      "Supabase đang giới hạn số lần gọi API.",
      "Chờ một lát rồi thử lại. App không tự gửi lại thao tác ghi.",
    );
  if (/paused|inactive|not.*healthy/i.test(text))
    return new AppError(
      409,
      "PROJECT_UNAVAILABLE",
      "Dự án Supabase chưa sẵn sàng.",
      "Mở Supabase Dashboard để kiểm tra và khởi động lại dự án nếu đang tạm dừng.",
    );
  if (/statement timeout|57014|canceling statement/i.test(text))
    return new AppError(
      504,
      "QUERY_TIMEOUT",
      "Truy vấn quá thời gian chờ.",
      "Nếu đây là thao tác ghi, kiểm tra lại dữ liệu trước khi chạy lại.",
    );
  return new AppError(
    502,
    "SUPABASE_ERROR",
    `Supabase chưa hoàn tất thao tác (HTTP ${status}).`,
    text,
  );
}
