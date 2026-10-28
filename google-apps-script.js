/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - ĐỒNG BỘ FORM LANDING PAGE SỔ TAY SINH VIÊN
 * =========================================================================
 * Spreadsheet ID: 1Brx_6OdqcfRB2VMqI62tB3vDbDCAN3LM4k-PirCSdrc
 * Sheet Name: Landing-page-so-tay
 * =========================================================================
 */

// CẤU HÌNH HỆ THỐNG
const CONFIG = {
  SPREADSHEET_ID: '1Brx_6OdqcfRB2VMqI62tB3vDbDCAN3LM4k-PirCSdrc',
  SHEET_NAME: 'Landing-page-so-tay',
  DEFAULT_HEADERS: [
    'Thời gian gửi',
    'Họ và tên',
    'Vai trò',
    'Email',
    'Nội dung bạn mong muốn tìm hiểu thêm hoặc chủ đề cần giải đáp'
  ]
};

/**
 * Xử lý yêu cầu HTTP POST từ Landing Page Form
 */
function doPost(e) {
  // Áp dụng LockService để chống xung đột dữ liệu khi nhiều người gửi cùng lúc
  const lock = LockService.getScriptLock();
  try {
    // Đợi tối đa 30 giây để lấy quyền ghi
    lock.waitLock(30000);

    // 1. Phân tích dữ liệu nhận được (hỗ trợ cả URL-Encoded và JSON)
    let data = {};
    if (e && e.postData && e.postData.contents) {
      if (e.postData.type === 'application/json') {
        try {
          data = JSON.parse(e.postData.contents);
        } catch (err) {
          data = e.parameter || {};
        }
      } else {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // 2. Mở Spreadsheet theo ID đã chỉ định
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

    // Nếu trang tính chưa tồn tại thì tự động tạo mới
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    }

    // 3. Kiểm tra và thiết lập Header nếu trang tính còn trống
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(CONFIG.DEFAULT_HEADERS);
      // Định dạng dòng tiêu đề: In đậm, nền xanh dịu, căn giữa
      const headerRange = sheet.getRange(1, 1, 1, CONFIG.DEFAULT_HEADERS.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#E8F0FE');
      headerRange.setFontColor('#1E3A8A');
      headerRange.setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
    }

    // 4. Trích xuất các trường dữ liệu
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
    const fullName = data.name || data.fullName || data['Họ và tên'] || '';
    const role = data.role_label || data.role || data['Vai trò'] || '';
    const email = data.email || data['Email'] || '';
    const message = data.message || data['Nội dung bạn mong muốn tìm hiểu thêm hoặc chủ đề cần giải đáp'] || '';

    // 5. Kiểm tra tiêu đề hiện tại của Sheet để ghi đúng vị trí cột
    const headerRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    
    // Nếu sheet có 4 cột gốc (không có thời gian)
    const hasTimestampColumn = headerRow.some(function(col) {
      return col.toString().toLowerCase().indexOf('thời gian') !== -1;
    });

    let newRow = [];
    if (hasTimestampColumn) {
      newRow = [timestamp, fullName, role, email, message];
    } else {
      // Trường hợp sheet chỉ có đúng 4 cột theo thứ tự yêu cầu ban đầu
      newRow = [fullName, role, email, message];
    }

    // 6. Ghi dòng dữ liệu mới vào Google Sheet
    sheet.appendRow(newRow);

    // Tự động căn lề văn bản cho đẹp
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, newRow.length).setVerticalAlignment('middle');

    // 7. Trả về phản hồi thành công (JSON)
    return ContentService.createTextOutput(JSON.stringify({
      result: 'success',
      row: lastRow,
      message: 'Đã lưu thông tin thành công!'
    }))
    .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Lỗi khi lưu dữ liệu: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      result: 'error',
      message: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);

  } finally {
    // Luôn giải phóng lock để tiến trình khác tiếp tục ghi
    lock.releaseLock();
  }
}

/**
 * Xử lý yêu cầu HTTP GET để kiểm tra trạng thái Web App
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    message: 'Google Apps Script Web App đang hoạt động bình thường.',
    targetSheet: CONFIG.SHEET_NAME
  }))
  .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Hàm kiểm tra thử nghiệm trực tiếp trong trình soạn thảo Apps Script
 * Bấm chọn hàm này rồi bấm "Chạy" (Run) để kiểm tra kết nối với Google Sheet
 */
function testConnection() {
  const fakeEvent = {
    parameter: {
      name: 'Nguyễn Văn Test',
      role_label: 'Tân sinh viên năm nhất',
      email: 'test@sinhvien.edu.vn',
      message: 'Đây là tin nhắn kiểm tra kết nối tự động từ Apps Script'
    }
  };
  const result = doPost(fakeEvent);
  Logger.log(result.getContent());
}
