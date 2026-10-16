/** A photo of public/photos (plain module: also used on the server, by the blog metadata). */
const photo = (name: string) => `/photos/${name}.jpg`;

// Photos of every user page, from public/photos, named after what they show. They are free photos from Unsplash
// (Unsplash License: free for commercial use, no attribution needed), resized to 1600 px wide;
// pillow-box.jpg was generated with Figma AI.

export const PHOTOS = {
  // Products and industries
  cosmetics: { src: photo("cosmetics"), alt: "Hộp giấy đựng serum dưỡng da" },
  candle: { src: photo("candle"), alt: "Nến thơm trong ly thủy tinh cạnh hộp giấy" },
  candleJars: { src: photo("candle-jars"), alt: "Hai hũ nến thơm dán nhãn" },
  chocolate: { src: photo("chocolate"), alt: "Hộp giấy chia ngăn đựng socola" },
  macarons: { src: photo("macarons"), alt: "Hộp giấy đựng bánh macaron nhiều màu" },
  jewelry: { src: photo("jewelry"), alt: "Hộp lót nhung đựng nhẫn vàng" },
  pillowBox: { src: photo("pillow-box"), alt: "Hộp gối giấy kraft cạnh mặt dây chuyền bạc" },
  tea: { src: photo("tea"), alt: "Các hộp trà in họa tiết trên kệ" },
  teaSet: { src: photo("tea-set"), alt: "Bộ ấm chén trà bên cành hoa" },
  necklaceBox: { src: photo("necklace-box"), alt: "Hộp giấy đựng dây chuyền" },
  // Occasions
  tet: { src: photo("tet"), alt: "Bàn trà ngày Tết với bình gốm và mứt" },
  tetTable: { src: photo("tet-table"), alt: "Góc nhà ngày Tết với cành đào và đèn lồng" },
  hoaMai: { src: photo("hoa-mai"), alt: "Cành hoa mai vàng ngày Tết" },
  christmas: { src: photo("christmas"), alt: "Hộp quà kraft buộc dây đỏ mùa Giáng sinh" },
  wedding: { src: photo("wedding"), alt: "Hộp quà cưới trắng thắt nơ" },
  valentine: { src: photo("valentine"), alt: "Hộp quà đỏ thắt nơ ngày Valentine" },
  birthday: { src: photo("birthday"), alt: "Hộp quà sinh nhật thắt ruy băng vàng" },
  // Boxes
  kraftDrawer: { src: photo("kraft-drawer"), alt: "Hộp bao diêm giấy kraft mở khay" },
  kraftTuck: { src: photo("kraft-boxes"), alt: "Hai hộp giấy kraft tối giản" },
  kraftTwine: { src: photo("kraft-twine"), alt: "Hộp kraft buộc dây và nhánh lá" },
  luxuryLid: { src: photo("luxury-lid"), alt: "Hộp âm dương trắng niêm sáp" },
  whiteBox: { src: photo("white-rigid"), alt: "Hộp cứng trắng tối giản" },
  blackGift: { src: photo("black-gift"), alt: "Hộp quà đen thắt ruy băng" },
  greenGift: { src: photo("green-gift"), alt: "Hộp quà xanh buộc dây cạnh bình hoa" },
  dieline: { src: photo("dieline"), alt: "Khuôn hộp in trải phẳng" },
  // Making and delivering
  measuring: { src: photo("measuring"), alt: "Thước dây đo kích thước" },
  designer: { src: photo("designer"), alt: "Nhà thiết kế vẽ trên bảng vẽ cạnh bảng màu" },
  sketching: { src: photo("design-desk"), alt: "Bàn làm việc với mẫu màu và bút vẽ" },
  swatches: { src: photo("swatches"), alt: "Bảng màu in ấn xòe ra" },
  offset: { src: photo("offset-press"), alt: "Máy in offset đang chạy" },
  largePrinter: { src: photo("large-printer"), alt: "Máy in khổ lớn trong xưởng" },
  foil: { src: photo("foil"), alt: "Chữ ép kim vàng trên bìa da" },
  kraftPaper: { src: photo("kraft-texture"), alt: "Bề mặt giấy kraft" },
  warehouse: { src: photo("warehouse"), alt: "Kệ hộp carton trong kho" },
  delivery: { src: photo("delivery"), alt: "Người giao hàng chở thùng hộp bằng xe máy" },
  giftHands: { src: photo("gift-hands"), alt: "Hai bàn tay trao hộp quà" },
  giftHold: { src: photo("gift-hold"), alt: "Người cầm hộp quà gói giấy kraft" },
} as const;

export type SitePhoto = (typeof PHOTOS)[keyof typeof PHOTOS];
