// Company facts shared by /careers, /press and /events: team FORGE of the CP2 report (FPT University,
// EXE101, fall 2026) and the figures of its research. Names and roles follow the team section of /about
// (components/about/AboutTeam.tsx); each figure says where it comes from.

export type TeamArea = "cong-nghe" | "kinh-doanh" | "khach-hang";

export const TEAM_AREAS: Record<TeamArea, { label: string; text: string }> = {
  "cong-nghe": { label: "Công nghệ", text: "Công thức khuôn bế, studio 2D/3D, FitCheck™ và máy xuất file in." },
  "kinh-doanh": { label: "Kinh doanh & tài chính", text: "Mô hình doanh thu, giá gói, thị trường và đối tác xưởng in." },
  "khach-hang": { label: "Khách hàng & marketing", text: "Phỏng vấn người bán, khảo sát, cộng đồng và nội dung." },
};

export interface TeamMember {
  name: string;
  role: string;
  area: TeamArea;
  /** What they build at WrapFit, one line. */
  focus: string;
  /** Their favourite box, for the personality of the page. */
  box: string;
  tint: string;
}

export const TEAM: TeamMember[] = [
  { name: "Võ Lê Đức Phát", role: "Trưởng nhóm & Kỹ thuật công nghệ", area: "cong-nghe", focus: "Kiến trúc nền tảng và điều phối sản phẩm", box: "Hộp nắp gài đáy khoá", tint: "#E7F0FB" },
  { name: "Nguyễn Chí Trung", role: "Kỹ thuật công nghệ & Frontend Lead", area: "cong-nghe", focus: "Studio thiết kế, khuôn 2D và giao diện", box: "Hộp bao diêm", tint: "#EEF8F2" },
  { name: "Nguyễn Quang Thổ", role: "Kỹ thuật công nghệ & WebGL 3D", area: "cong-nghe", focus: "Hộp gấp 3D và trải nghiệm mở hộp", box: "Hộp âm dương", tint: "#FFF4DE" },
  { name: "Lê Minh Quốc", role: "Khám phá khách hàng & Tiếp thị", area: "khach-hang", focus: "Khảo sát 109 người bán và cộng đồng nhà sáng tạo", box: "Hộp gối", tint: "#F7EEF6" },
  { name: "Đỗ Hồng Nghĩa", role: "Xây dựng mô hình kinh doanh", area: "kinh-doanh", focus: "Phỏng vấn chuyên gia, giá gói và quan hệ xưởng in", box: "Hộp nắp gài", tint: "#FDEBD7" },
  { name: "Trần Thị Trúc Phương", role: "Phân tích thị trường & Tài chính", area: "kinh-doanh", focus: "Quy mô thị trường và dự báo doanh thu", box: "Hộp âm dương", tint: "#E9EFF5" },
];

export const initialsOf = (name: string) => {
  const parts = name.split(" ");
  return `${parts[0][0]}${parts[parts.length - 1][0]}`;
};

export const KEY_STATS = [
  { value: "109", label: "người bán quà tham gia khảo sát", source: "Khảo sát CP2, 10/2026" },
  { value: "67%", label: "đặt từ 50 hộp trở xuống mỗi lần", source: "Khảo sát CP2" },
  { value: "308,9 tỷ đ", label: "thị trường phục vụ được mỗi năm (SAM)", source: "Báo cáo CP2" },
  { value: "4", label: "cấu trúc hộp quà dựng theo milimét", source: "Sản phẩm" },
];
