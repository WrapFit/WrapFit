import { BLEED_MM, HARD_MIN_DPI, MAX_SHEET_MM, MIN_DPI, MIN_LINE_MM, SAFE_MARGIN_CREASE_MM, SAFE_MARGIN_CUT_MM } from "@wrapfit/shared";
import { ROUTES } from "@/constants";
import { PLANS, formatQuota } from "@/features/pricing";

// Articles of the help center (/support). There is no help API: the answers describe what the app and the API do,
// and every number comes from @wrapfit/shared (FitCheck) or features/pricing (quotas), so they follow the code.

export interface Article {
  id: string;
  title: string;
  /** Paragraphs; the first one is the excerpt of the card. */
  body: string[];
  /** Where to do it in the app. */
  action?: { label: string; href: string };
}

export interface ArticleCategory {
  id: string;
  title: string;
  articles: Article[];
}

const { FREE, PAY_PER_EXPORT, STARTER, PRO_BUSINESS } = PLANS;

export const CATEGORIES: ArticleCategory[] = [
  {
    id: "bat-dau",
    title: "Bắt đầu",
    articles: [
      {
        id: "tao-tai-khoan",
        title: "Tạo tài khoản và xác nhận email",
        body: [
          "Đăng ký bằng email và mật khẩu, WrapFit gửi một liên kết xác nhận vào hộp thư của bạn. Bấm liên kết đó để kích hoạt tài khoản rồi đăng nhập.",
          "Không thấy thư? Kiểm tra mục Spam, hoặc gửi lại thư xác nhận từ trang “Kiểm tra hộp thư”. Bạn cũng có thể đăng nhập ngay bằng tài khoản Google.",
        ],
        action: { label: "Đăng ký", href: ROUTES.register },
      },
      {
        id: "thu-khong-can-tai-khoan",
        title: "Dùng thử studio không cần tài khoản",
        body: [
          "Bản demo của studio mở ngay mà không cần đăng nhập: chọn cấu trúc, đổi kích thước, thiết kế và xem hộp 3D.",
          "Bản demo không lưu gì cả. Khi muốn giữ thiết kế, xuất file in hay chia sẻ, hãy tạo tài khoản và bắt đầu một dự án.",
        ],
        action: { label: "Mở bản demo", href: ROUTES.editorDemo },
      },
      {
        id: "du-an-dau-tien",
        title: "Tạo dự án hộp đầu tiên",
        body: [
          "Vào “Tạo dự án”, chọn một trong bốn cấu trúc hộp, nhập kích thước và chất liệu giấy. WrapFit dựng khuôn bế rồi mở studio để bạn thiết kế.",
          "Muốn đi nhanh hơn? Chọn một mẫu trong thư viện và bấm “Dùng mẫu này”: dự án mới có sẵn thiết kế, bạn chỉ cần đổi kích thước theo món quà.",
        ],
        action: { label: "Tạo dự án", href: ROUTES.editorNew },
      },
      {
        id: "quen-mat-khau",
        title: "Quên mật khẩu",
        body: [
          "Ở trang đăng nhập, chọn “Quên mật khẩu” và nhập email. WrapFit gửi liên kết đặt lại mật khẩu vào hộp thư của bạn.",
          "Sau khi đặt mật khẩu mới, mọi phiên đăng nhập cũ phải đăng nhập lại.",
        ],
        action: { label: "Đặt lại mật khẩu", href: ROUTES.forgotPassword },
      },
    ],
  },
  {
    id: "kich-thuoc",
    title: "Cấu trúc và kích thước hộp",
    articles: [
      {
        id: "lwh-la-gi",
        title: "L × W × H là kích thước lòng hộp",
        body: [
          "Chiều dài (L), rộng (W) và cao (H) bạn nhập là kích thước bên trong của hộp khi đã gấp: món quà phải lọt vừa. Hãy đo món quà và cộng thêm khoảng hở bạn muốn.",
          "WrapFit tự cộng độ dày giấy vào từng tấm và nếp gấp, nên lòng hộp đúng bằng số bạn nhập dù giấy dày hay mỏng.",
        ],
      },
      {
        id: "do-day-giay",
        title: "Độ dày giấy t và định lượng GSM",
        body: [
          "Độ dày giấy t (mm) được tính từ định lượng: t ≈ GSM × 0,0014. Giấy 300 GSM dày khoảng 0,42 mm.",
          "Độ dày ảnh hưởng đến khoảng cách các nếp gấp và kích thước tai gài. Chọn đúng loại giấy bạn sẽ in để khuôn khớp khi gấp.",
        ],
      },
      {
        id: "kho-giay-toi-da",
        title: "Hộp lớn nhất có thể in là bao nhiêu?",
        body: [
          `Khuôn trải phẳng nên nằm gọn trong khổ B1 (${MAX_SHEET_MM.long} × ${MAX_SHEET_MM.short} mm), khổ lớn nhất của phần lớn xưởng in. FitCheck™ cảnh báo khi một tấm khuôn vượt khổ này.`,
          "Mỗi cấu trúc còn có giới hạn kích thước riêng: xem mục “Bốn cấu trúc hộp” trên trang này.",
        ],
      },
      {
        id: "nang-cap-cong-thuc",
        title: "“Cập nhật công thức khuôn” là gì?",
        body: [
          "Công thức dựng khuôn được cải tiến theo thời gian. Dự án cũ giữ nguyên công thức đã tạo ra nó để bản in không đổi bất ngờ.",
          "Khi có công thức mới, studio đề nghị cập nhật và bạn chọn có áp dụng cho dự án hay không.",
        ],
      },
    ],
  },
  {
    id: "fitcheck-file-in",
    title: "FitCheck™ và file in",
    articles: [
      {
        id: "fitcheck-kiem-tra-gi",
        title: "FitCheck™ kiểm tra những gì?",
        body: [
          `Chữ, logo, ảnh và mã vạch phải cách đường cắt tối thiểu ${SAFE_MARGIN_CUT_MM} mm và cách đường gấp ${SAFE_MARGIN_CREASE_MM} mm. Hình nền chạm đường cắt phải tràn qua ${BLEED_MM}–3 mm. Ảnh cần đạt ${MIN_DPI} DPI theo kích thước in thật; nét chữ mảnh nhất từ ${MIN_LINE_MM} mm.`,
          "File xuất ra đã đạt chuẩn nhà in: hình in CMYK, chữ chuyển thành đường nét vector (không cần font), ảnh nhúng sẵn, mã vạch và QR in đen K100 trên nền trắng. Gói gửi nhà in có file gốc .ai kèm PDF và JPG để đối chiếu.",
          "FitCheck™ còn báo khi một thành phần đè lên tai dán, hay khi tấm khuôn lớn hơn khổ giấy. Mỗi lỗi chỉ rõ vị trí trên khuôn và Gói đề xuất cách sửa.",
        ],
      },
      {
        id: "diem-fitcheck",
        title: "Điểm FitCheck™ và vì sao chưa xuất được file",
        body: [
          "Mỗi lần lưu, thiết kế được chấm điểm trên thang 100: mỗi lỗi trừ 30 điểm, mỗi cảnh báo trừ 10. Lỗi (một thành phần cách nét cắt hay nếp gấp dưới 1 mm, mực in lấn lên tai dán) chặn việc xuất file in cho đến khi được sửa.",
          `Cảnh báo (chưa đủ vùng an toàn, ảnh ${HARD_MIN_DPI}–${MIN_DPI - 1} DPI, nét chữ quá mảnh, khuôn lớn hơn khổ B1) không chặn xuất file nhưng nên xem lại trước khi in. Ảnh dưới ${HARD_MIN_DPI} DPI là lỗi.`,
          "Thiết kế công khai đạt từ 90 điểm sẽ được đưa vào thư viện cộng đồng.",
        ],
      },
      {
        id: "dinh-dang-xuat",
        title: "Các định dạng file in",
        body: [
          "PDF CMYK tách lớp: nét cắt (CutContour), nét gấp (Crease), hình in (Artwork) và kích thước (Dimensions) trên các lớp riêng, đúng thứ xưởng in và máy bế cần.",
          "SVG cho phần mềm đồ hoạ và DXF cho máy cắt plotter, laser hay bàn cắt CNC.",
        ],
      },
      {
        id: "tai-file",
        title: "Tải file in sau khi xuất",
        body: [
          "File được dựng ở hàng đợi phía máy chủ; studio hiện tiến trình và nút tải khi xong. Đường tải có hiệu lực 15 phút.",
          "Hết hạn thì cứ xuất lại: file mới được dựng từ thiết kế hiện tại của bạn.",
        ],
      },
    ],
  },
  {
    id: "chia-se",
    title: "Chia sẻ, cộng đồng và mở hộp QR",
    articles: [
      {
        id: "che-do-hien-thi",
        title: "Riêng tư, chỉ ai có liên kết, công khai",
        body: [
          "Dự án mới luôn ở chế độ riêng tư. “Chỉ ai có liên kết” mở trang 3D cho người có đường dẫn nhưng không cho máy tìm kiếm thấy. “Công khai” cho mọi người xem.",
          "Chuyển về riêng tư lúc nào cũng được: trang chia sẻ ngừng hiển thị ngay.",
        ],
      },
      {
        id: "remix",
        title: "Phối lại thiết kế của cộng đồng",
        body: [
          "Trên trang 3D của một thiết kế công khai, bấm “Phối lại” để sao chép nó vào dự án của bạn và chỉnh sửa tự do. Bản phối lại ghi nguồn tác giả gốc.",
          "Tác giả có thể tắt tính năng này; khi đó nút Phối lại không hiện.",
        ],
        action: { label: "Xem thư viện mẫu", href: ROUTES.templates },
      },
      {
        id: "qr-mo-hop",
        title: "Tạo mã QR mở hộp 3D",
        body: [
          "Trong dự án, bật trải nghiệm mở hộp: nhập tên người nhận, lời nhắn (tối đa 2.000 ký tự), chọn hiệu ứng pháo giấy, pháo hoa, trái tim, cánh hoa hay tuyết.",
          "Tải mã QR dạng PNG hoặc SVG để in cùng món quà. Mã QR không đổi, kể cả khi bạn sửa lời nhắn sau đó.",
        ],
      },
      {
        id: "nhap-ma-mo-qua",
        title: "Người nhận không quét được mã QR?",
        body: [
          "Người nhận mở trang nhập mã của WrapFit và gõ đoạn mã in cạnh mã QR (hoặc dán cả đường dẫn). Không cần tài khoản.",
        ],
        action: { label: "Trang nhập mã", href: ROUTES.unboxCode },
      },
    ],
  },
  {
    id: "tai-khoan-goi",
    title: "Tài khoản, gói và dung lượng",
    articles: [
      {
        id: "han-muc-goi",
        title: "Hạn mức của từng gói",
        body: [
          `${FREE.name}: ${formatQuota(FREE.storageBytes)} lưu trữ và ${FREE.xuPerPeriod} xu Wrap mỗi tháng cho ảnh và hoa văn AI, xuất PDF A4 có watermark ở tai dán. ${PAY_PER_EXPORT.name}: ${formatQuota(PAY_PER_EXPORT.storageBytes)} và ${PAY_PER_EXPORT.xuPerPeriod} xu. ${STARTER.name}: ${formatQuota(STARTER.storageBytes)} và ${STARTER.xuPerPeriod.toLocaleString("vi-VN")} xu. ${PRO_BUSINESS.name}: ${formatQuota(PRO_BUSINESS.storageBytes)} và ${PRO_BUSINESS.xuPerPeriod.toLocaleString("vi-VN")} xu.`,
          "Mức đã dùng hiện trên trang Tổng quan của bạn.",
        ],
        action: { label: "Xem bảng giá", href: "/pricing" },
      },
      {
        id: "dung-luong",
        title: "Dung lượng lưu trữ gồm những gì?",
        body: [
          "Logo, ảnh, ảnh đại diện, ảnh thu nhỏ của dự án và các file in đã xuất đều tính vào dung lượng. Khi đầy, tệp mới bị từ chối cho đến khi bạn xoá bớt hoặc nâng gói.",
          "Xoá một dự án sẽ giải phóng các tệp chỉ thuộc về dự án đó.",
        ],
      },
      {
        id: "phien-ban-thu-muc",
        title: "Phiên bản và thư mục dự án",
        body: [
          "Lưu một phiên bản trước khi thử thay đổi lớn; khôi phục lại bất cứ lúc nào. Nhân bản dự án để làm nhiều biến thể của cùng một hộp.",
          "Sắp xếp dự án vào thư mục để quản lý theo khách hàng, mùa hay dòng sản phẩm.",
        ],
        action: { label: "Dự án của tôi", href: ROUTES.projects },
      },
      {
        id: "dang-xuat-moi-thiet-bi",
        title: "Đăng xuất khỏi mọi thiết bị",
        body: [
          "Trong Cài đặt tài khoản, “Đăng xuất khỏi mọi thiết bị” kết thúc mọi phiên đăng nhập, kể cả phiên trên máy khác. Dùng khi bạn đăng nhập ở máy lạ hay nghi lộ mật khẩu.",
        ],
        action: { label: "Cài đặt tài khoản", href: ROUTES.settings },
      },
    ],
  },
];

/** "Bài viết phổ biến": the first row of the page. */
export const POPULAR_IDS = ["du-an-dau-tien", "fitcheck-kiem-tra-gi", "lwh-la-gi", "dinh-dang-xuat", "qr-mo-hop", "han-muc-goi"];

export const ALL_ARTICLES: Article[] = CATEGORIES.flatMap((category) => category.articles);
