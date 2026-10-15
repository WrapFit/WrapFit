import { PHOTOS, type SitePhoto } from "./photos";

// Articles of /blog. The knowledge comes from docs/05 (packaging lexicon, paper matrix, print troubleshooting) and the
// CP2 research report (survey N = 109, expert interviews); figures are quoted with their source.

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string; id: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "quote"; text: string; cite: string }
  | { type: "tip"; title: string; text: string }
  | { type: "table"; head: string[]; rows: string[][] };

export type BlogCategory = "kien-thuc-in" | "chat-lieu" | "su-co" | "nghien-cuu" | "huong-dan";

export const BLOG_CATEGORIES: Record<BlogCategory, string> = {
  "kien-thuc-in": "Kiến thức in",
  "chat-lieu": "Chất liệu giấy",
  "su-co": "Xử lý sự cố",
  "huong-dan": "Hướng dẫn",
  "nghien-cuu": "Nghiên cứu thị trường",
};

export interface BlogAuthor {
  name: string;
  role: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  category: BlogCategory;
  tags: string[];
  author: BlogAuthor;
  /** ISO date. */
  date: string;
  readMinutes: number;
  /** Cover photo, from the project library. */
  cover: SitePhoto;
  body: BlogBlock[];
}

const PHAT: BlogAuthor = { name: "Võ Lê Đức Phát", role: "Trưởng nhóm & Kỹ thuật công nghệ" };
const TRUNG: BlogAuthor = { name: "Nguyễn Chí Trung", role: "Kỹ thuật công nghệ & Frontend Lead" };
const THO: BlogAuthor = { name: "Nguyễn Quang Thổ", role: "Kỹ thuật công nghệ & WebGL 3D" };
const QUOC: BlogAuthor = { name: "Lê Minh Quốc", role: "Khám phá khách hàng & Tiếp thị" };
const NGHIA: BlogAuthor = { name: "Đỗ Hồng Nghĩa", role: "Xây dựng mô hình kinh doanh" };
const PHUONG: BlogAuthor = { name: "Trần Thị Trúc Phương", role: "Phân tích thị trường & Tài chính" };

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "109-nguoi-ban-qua-noi-gi-ve-bao-bi",
    title: "109 người bán quà nói gì về bao bì?",
    subtitle: "Kết quả khảo sát tháng 10/2026: số lượng đặt nhỏ, hộp không vừa và file in lỗi là ba nỗi đau lớn nhất.",
    category: "nghien-cuu",
    tags: ["khảo sát", "MOQ", "người bán nhỏ"],
    author: PHUONG,
    date: "2026-10-09",
    readMinutes: 6,
    cover: PHOTOS.kraftBags,
    body: [
      { type: "p", text: "Từ ngày 4 đến 6/10/2026, nhóm WrapFit khảo sát 109 người đang bán quà tặng: chủ tiệm nến thơm, xưởng trang sức bạc, tiệm bánh, thương hiệu trà và đồ gốm. 88,1% là người bán một mình, nhóm 2–3 người hoặc đang chuẩn bị ra mắt — đúng nhóm khách hàng mà các xưởng in công nghiệp thường từ chối." },
      { type: "h2", id: "so-luong", text: "Đặt ít hộp là chuyện bình thường" },
      { type: "p", text: "67% người trả lời đặt từ 50 hộp trở xuống mỗi lần; 81,7% đặt dưới 100 hộp. Trong khi đó, in offset chỉ có lãi từ khoảng 500 hộp. Khoảng cách này giải thích vì sao 72,5% vẫn dùng hộp carton có sẵn, nhiều người dán thêm nhãn logo." },
      { type: "table", head: ["Rào cản lớn nhất", "Tỷ lệ"], rows: [["Xưởng đòi số lượng tối thiểu (MOQ) cao", "53,2%"], ["Hộp có sẵn không vừa sản phẩm", "32,1%"], ["File thiết kế bị lỗi khi in", "28,4%"], ["Tiền làm khuôn dao bế đắt", "25,7%"]] },
      { type: "quote", text: "Không biết xưởng nào nhận in vì số lượng quá ít, chưa đến 10 bao bì.", cite: "Người trả lời khảo sát, nhóm chuẩn bị ra mắt" },
      { type: "h2", id: "canva", text: "Thiết kế bằng Canva, nhưng hộp thì không gấp được" },
      { type: "p", text: "69,7% thiết kế bao bì bằng Canva. Vấn đề họ gặp: mẫu chung chung (50,5%), không tính được nếp gấp 3D (31,2%) và không xuất được file vector tách lớp (28,4%). Chuyên gia chế bản cho biết khoảng 90% file Canva gửi đến xưởng phải vẽ lại vì thiếu tràn lề 2 mm, chữ nằm sát đường cắt hoặc chỉ là ảnh một lớp." },
      { type: "h2", id: "tinh-nang", text: "Tính năng được chờ đợi nhất" },
      { type: "list", items: ["Mô phỏng gấp hộp 3D: 74,3% đánh giá hữu ích (4,03/5)", "FitCheck™ kiểm tra file trước khi in: 74,3%", "Xuất file vector tách lớp: 73,4%", "Tự dựng khuôn bế theo kích thước: 70,6%", "Hoa văn AI: 67% — hữu ích nhưng chỉ là tính năng phụ"] },
      { type: "h2", id: "tra-phi", text: "Sẵn sàng trả bao nhiêu?" },
      { type: "p", text: "78% chấp nhận trả từ 20.000đ cho mỗi lần xuất file; 38,5% chọn khoảng 50.000–100.000đ/tháng cho gói thuê bao. Không có một cách trả tiền áp đảo (thuê bao 32,1%, gói lượt 26,6%, trả theo lần 24,8%), nên WrapFit kết hợp cả hai: 19.000đ/lần xuất và gói 99.000đ/tháng." },
      { type: "tip", title: "Điều khảo sát nhắc chúng tôi", text: "90,8% vẫn muốn có hộp mẫu thật trước khi in số lượng. Màn hình 3D giúp kiểm tra hình dáng, nhưng màu giấy và độ cứng chỉ biết được khi cầm trên tay — vì thế WrapFit có dịch vụ in 1 hộp mẫu." },
    ],
  },
  {
    slug: "5-thuat-ngu-in-bao-bi",
    title: "5 thuật ngữ in bao bì người làm quà nên biết",
    subtitle: "Nét cắt, nét gấp, tràn lề, vùng an toàn và độ dày giấy — hiểu đúng để file đến xưởng không phải vẽ lại.",
    category: "kien-thuc-in",
    tags: ["khuôn bế", "file in", "người mới"],
    author: TRUNG,
    date: "2026-10-03",
    readMinutes: 5,
    cover: PHOTOS.embossedDieline,
    body: [
      { type: "p", text: "Thợ in và người thiết kế nói hai thứ ngôn ngữ khác nhau. Năm thuật ngữ dưới đây là đủ để bạn đọc được một bản vẽ khuôn bế và biết vì sao WrapFit bắt lỗi file của bạn." },
      { type: "table", head: ["Thuật ngữ", "Nghĩa", "Chuẩn WrapFit"], rows: [["Nét cắt (Cut line)", "Đường dao bế cắt rời tấm bìa", "Màu đỏ #E53E3E, nét liền"], ["Nét gấp (Crease)", "Đường ấn lõm để gấp không nứt sớ giấy", "Màu xanh #3182CE, nét đứt 4,4"], ["Tràn lề (Bleed)", "Nền in phủ ra ngoài nét cắt", "Tối thiểu 2 mm"], ["Vùng an toàn (Safe area)", "Vùng chữ, logo không được vượt ra", "Cách nét cắt và nét gấp ≥ 3 mm"], ["Độ dày giấy (Caliper, t)", "Bề dày thật của tấm giấy", "t = GSM × 0,0014 mm"]] },
      { type: "h2", id: "vi-sao", text: "Vì sao phải tách lớp?" },
      { type: "p", text: "Máy cắt kỹ thuật số đọc nét cắt và nét gấp như hai lệnh khác nhau: một lệnh cắt đứt, một lệnh chỉ ấn lõm. Nếu chúng nằm chung với hình in, kỹ thuật viên phải tách tay — mất 1,5 đến 3 giờ cho mỗi mẫu theo chuyên gia chế bản chúng tôi phỏng vấn. File PDF của WrapFit có sẵn bốn lớp: CutContour, Crease, Artwork và Dimensions." },
      { type: "tip", title: "Mẹo nhỏ", text: "Bật lớp “Vùng an toàn” trong studio: khung nét đứt màu cam cho biết chính xác chỗ an toàn để đặt logo và lời chúc." },
    ],
  },
  {
    slug: "chon-giay-ivory-kraft-duplex",
    title: "Ivory, Kraft hay Duplex: chọn giấy nào cho món quà?",
    subtitle: "Bảng tra nhanh theo từng loại sản phẩm, từ nến thơm đến set mỹ phẩm cao cấp.",
    category: "chat-lieu",
    tags: ["giấy", "GSM", "nến thơm", "trang sức"],
    author: QUOC,
    date: "2026-09-28",
    readMinutes: 4,
    cover: PHOTOS.kraftPaper,
    body: [
      { type: "p", text: "Định lượng giấy (GSM) quyết định độ cứng của hộp, còn bề mặt giấy quyết định cảm giác khi cầm. Hộp nhỏ cần tối thiểu 250 GSM, hộp lớn nên dùng 350–400 GSM." },
      { type: "table", head: ["Sản phẩm", "Kích thước gợi ý", "Giấy", "GSM", "Kiểu hộp"], rows: [["Nến thơm hũ thủy tinh", "80 × 80 × 100 mm", "Kraft nâu / Ivory bồi sóng E", "350", "Hộp nắp gài đáy khoá"], ["Khuyên tai, nhẫn bạc", "50 × 50 × 25 mm", "Giấy mỹ thuật vân mây", "250–300", "Hộp gối"], ["Khăn lụa, áo thun handmade", "200 × 150 × 40 mm", "Kraft vàng nhám", "300", "Hộp bao diêm"], ["Set mỹ phẩm cao cấp", "180 × 120 × 60 mm", "Mỹ thuật bồi carton", "350", "Hộp âm dương"], ["Xà bông organic", "90 × 60 × 35 mm", "Kraft tái chế 100%", "280", "Hộp nắp gài"]] },
      { type: "h2", id: "mau", text: "Màu in trên giấy Kraft" },
      { type: "p", text: "Giấy Kraft có nền nâu, nên màu in sẽ trầm hơn trên màn hình — một người trả lời khảo sát kể logo xanh mint của họ thành xanh lá đậm khi nhận hàng. Hãy in thử 1 hộp mẫu trước khi in số lượng, hoặc chọn Ivory nếu màu thương hiệu cần chính xác." },
    ],
  },
  {
    slug: "hop-bi-bung-day",
    title: "Hộp gập xong bị bung đáy khi đựng quà nặng",
    subtitle: "Nguyên nhân là đáy cài thường. Với món quà trên 300 g, hãy dùng đáy tự khoá.",
    category: "su-co",
    tags: ["đáy khoá", "hộp nắp gài", "quà nặng"],
    author: PHAT,
    date: "2026-09-21",
    readMinutes: 3,
    cover: PHOTOS.kraftTuck,
    body: [
      { type: "p", text: "Đáy cài thường giữ hộp bằng ma sát của tai gài. Với lọ nến, chai nước hoa hay cốc gốm nặng hơn 300 g, lực kéo xuống sẽ làm tai bật ra sau vài lần nhấc hộp." },
      { type: "steps", items: [{ title: "Chọn hộp nắp gài đáy khoá", text: "Đáy gồm 4 cánh đan chéo, khoá vào nhau khi mở hộp ra, không cần keo." }, { title: "Tăng tai gài thêm 3 mm", text: "Nếu vẫn dùng đáy cài, tai dài hơn cho ma sát tốt hơn." }, { title: "Tăng định lượng giấy", text: "Từ 300 lên 350 GSM cho hộp đựng hũ thủy tinh." }] },
      { type: "tip", title: "Trong studio", text: "Cấu trúc “Hộp nắp gài đáy khoá” của WrapFit đã có đáy tự khoá, khuôn được dựng lại theo đúng kích thước bạn nhập." },
    ],
  },
  {
    slug: "do-day-giay-nap-hop-bi-chat",
    title: "Nắp gài quá chật, hộp bị phồng: lỗi của độ dày giấy",
    subtitle: "Giấy 350 GSM dày gần nửa milimét. Bỏ qua con số này, bốn mặt gập vào sẽ thiếu chỗ.",
    category: "su-co",
    tags: ["độ dày giấy", "dung sai", "công thức"],
    author: TRUNG,
    date: "2026-09-14",
    readMinutes: 4,
    cover: PHOTOS.oilsDrawer,
    body: [
      { type: "p", text: "Khi gấp 90°, bề dày giấy chiếm một phần không gian bên trong. Một hộp vẽ đúng 120 mm trên giấy 0,42 mm sẽ hụt gần 1 mm sau khi gấp đủ các mặt — đủ để nắp kẹt hoặc thành hộp phồng ra." },
      { type: "p", text: "Công thức của WrapFit cộng thêm 0,5 × t cho mỗi nếp gập liên tiếp, ví dụ kích thước ngoài L ngoài = L + 2t. Bạn chỉ cần nhập kích thước lọt lòng của món quà và chọn giấy; khuôn bế tự tính phần còn lại." },
      { type: "quote", text: "Giấy Ivory 350 GSM có độ dày rõ rệt. Gập bốn mặt vào mà không trừ độ dày thì nắp sẽ không đóng được.", cite: "Chuyên gia chế bản, xưởng in kỹ thuật số" },
      { type: "tip", title: "Kiểm tra nhanh", text: "Ở bước Kích thước của studio, dòng “Phủ bì ≈” cho biết kích thước ngoài đã cộng độ dày giấy." },
    ],
  },
  {
    slug: "tran-le-2mm-het-vien-trang",
    title: "Tràn lề 2 mm: hết viền trắng quanh mép hộp",
    subtitle: "Máy bế có thể lệch 1 mm. Nền in phải phủ ra ngoài đường cắt để không lộ giấy trắng.",
    category: "kien-thuc-in",
    tags: ["bleed", "FitCheck", "file in"],
    author: THO,
    date: "2026-09-07",
    readMinutes: 3,
    cover: PHOTOS.yellowDrawer,
    body: [
      { type: "p", text: "Dao bế không bao giờ cắt chính xác tuyệt đối. Nếu màu nền dừng đúng ở đường cắt, chỉ cần lệch 1 mm là mép hộp lộ ra một viền giấy trắng." },
      { type: "list", items: ["Kéo ảnh nền và hoa văn phủ ra ngoài đường cắt ít nhất 2 mm", "Giữ chữ và logo cách đường cắt, đường gấp từ 3 mm", "Dùng ảnh từ 200 DPI ở kích thước in thật"] },
      { type: "tip", title: "FitCheck™ làm thay bạn", text: "Nếu ảnh nền kết thúc sát nét cắt, FitCheck™ chặn xuất file và chỉ đúng mặt hộp bị lỗi. Trong khuôn 2D, đường chấm xanh lá là mép tràn lề 2 mm." },
    ],
  },
  {
    slug: "mang-file-di-in-o-dau",
    title: "Thiết kế xong rồi: mang file nào đi in, in ở đâu?",
    subtitle: "Từ nút “Xuất file in” đến chiếc hộp hoàn chỉnh trong 4 bước.",
    category: "huong-dan",
    tags: ["xuất file", "xưởng in", "PDF"],
    author: NGHIA,
    date: "2026-08-30",
    readMinutes: 4,
    cover: PHOTOS.offset,
    body: [
      { type: "steps", items: [{ title: "Bấm “Xuất file in”", text: "FitCheck™ chạy lần cuối; file chỉ được tạo khi không còn lỗi." }, { title: "Chọn định dạng", text: "PDF CMYK tách lớp cho xưởng, PDF A4/A3 có dấu xén để tự in, SVG hoặc DXF cho máy cắt." }, { title: "Mang đến xưởng in kỹ thuật số", text: "Yêu cầu in trên Kraft hoặc Ivory 250–350 GSM và chạy máy cắt theo lớp CutContour và Crease có sẵn." }, { title: "In 1 hộp mẫu trước", text: "Kiểm tra màu và độ vừa trên món quà thật rồi mới in số lượng." }] },
      { type: "p", text: "Bàn cắt phẳng dao rung hoặc laser cắt được 20–50 hộp trong vài phút mà không cần khuôn gỗ, miễn là file vector sạch. Đó là lý do WrapFit tập trung vào chất lượng file thay vì bán hộp in sẵn." },
    ],
  },
  {
    slug: "dat-30-hop-khong-can-khuon-dao",
    title: "Đặt 30 hộp quà mà không cần khuôn dao 2 triệu",
    subtitle: "Khuôn dao bế làm số lượng nhỏ đội giá mỗi hộp thêm 30.000–40.000đ. Máy cắt kỹ thuật số thay đổi điều đó.",
    category: "nghien-cuu",
    tags: ["MOQ", "in kỹ thuật số", "chi phí"],
    author: PHUONG,
    date: "2026-08-22",
    readMinutes: 5,
    cover: PHOTOS.inspection,
    body: [
      { type: "p", text: "Một khuôn dao thép uốn trên gỗ có giá 1,5–2 triệu đồng cho mỗi kích thước. Với 50 hộp, riêng tiền khuôn đã cộng thêm 30.000–40.000đ vào mỗi hộp — gấp đôi ngân sách của 69% người bán nhỏ trong khảo sát (dưới 20.000đ/hộp)." },
      { type: "quote", text: "Cứ 10 khách hỏi thì 7 hoặc 8 người phải bỏ đi và quay về hộp carton nâu dán nhãn.", cite: "Chuyên gia chế bản, xưởng in kỹ thuật số" },
      { type: "h2", id: "giai-phap", text: "Không khuôn, chỉ cần file sạch" },
      { type: "p", text: "Bàn cắt kỹ thuật số đọc đường cắt từ file. Không có khuôn thì không có tiền khuôn — nhưng file phải đúng: nét liền, tách lớp, có tràn lề và đã cộng độ dày giấy. WrapFit tạo đúng loại file đó từ kích thước món quà." },
    ],
  },
];

export const findPost = (slug: string) => BLOG_POSTS.find((post) => post.slug === slug);

export function formatPostDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} tháng ${month}, ${year}`;
}
