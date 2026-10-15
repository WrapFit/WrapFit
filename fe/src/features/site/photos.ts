/** A photo of public/stitch/img (plain module: also used on the server, by the blog metadata). */
const photo = (id: string) => `/stitch/img/${id}.jpg`;

// Photos of the company and marketing pages, from the project library (public/stitch/img), named after what they show
// (the home page describes the same files in components/home/content.ts).

export const PHOTOS = {
  designer: { src: photo("52d394c3859e67b0"), alt: "Nhà thiết kế làm việc với khuôn hộp trên màn hình lớn" },
  inspection: { src: photo("911d50c6851db5c2"), alt: "Nhóm kỹ thuật cùng soi tờ in và mẫu bế hộp trên bàn" },
  offset: { src: photo("0fd63a93bcc6e79f"), alt: "Thợ in vận hành máy in với tờ in khuôn hộp" },
  foil: { src: photo("583fb224c447a31f"), alt: "Nghệ nhân ép kim vàng lên giấy mỹ thuật" },
  foilSample: { src: photo("d4747bd7fbdff9e6"), alt: "Mẫu thử ép kim chữ WrapFit trên giấy" },
  embossedDieline: { src: photo("8bc6e04f24de029f"), alt: "Khuôn hộp kraft trải phẳng dập nổi đường gấp" },
  sketching: { src: photo("475326f160122011"), alt: "Bàn tay phác thảo hoa văn bao bì" },
  pallets: { src: photo("f7c292efc7189f00"), alt: "Pallet thùng carton in sẵn trong kho" },
  delivery: { src: photo("7690e8d6ff974a31"), alt: "Giao hộp quà bằng xe máy trên phố" },
  kraftPaper: { src: photo("7b5628e1ca1cb23e"), alt: "Bề mặt giấy kraft mộc" },
  tetGift: { src: photo("af8c8412c159d49a"), alt: "Hộp quà Tết xanh thắt nơ vàng" },
  lacquerBox: { src: photo("9aeea1ca61895060"), alt: "Hộp âm dương sơn mài cho quà Tết" },
  kraftTuck: { src: photo("8f3cf51318eaf072"), alt: "Hộp nắp gài giấy kraft đứng trên bàn" },
  kraftPillow: { src: photo("1a2b00bef63aaaf6"), alt: "Hộp gối giấy kraft in logo WrapFit" },
  greenLid: { src: photo("0d6ad47bfba44c5b"), alt: "Hộp nắp rời xanh rêu ép kim logo WrapFit" },
  blackMagnet: { src: photo("d9bcf1d058bfb05b"), alt: "Hộp nam châm đen ép kim vàng" },
  candleBox: { src: photo("5714e230a3e22084"), alt: "Hộp giấy mỹ thuật đựng nến thơm" },
  chocolate: { src: photo("3729dc5394915422"), alt: "Hộp khay kraft đựng socola thủ công" },
  oilsDrawer: { src: photo("4c7ce7d1a5170261"), alt: "Hộp khay rút đựng bộ tinh dầu" },
  yellowDrawer: { src: photo("f958a0d1ac6f013b"), alt: "Hộp khay rút màu vàng in khuôn bế" },
  teaBags: { src: photo("45070742ddab799c"), alt: "Túi và hộp kraft đựng trà, cà phê thủ công" },
  kraftBags: { src: photo("ceb84293f215fae7"), alt: "Túi giấy kraft in logo cho cửa hàng" },
  skincare: { src: photo("727b7e0788de4f2f"), alt: "Hộp mỹ phẩm in thương hiệu Aurora" },
  waxLetter: { src: photo("1012c6f152a6d72f"), alt: "Phong thư niêm sáp đỏ kèm lời nhắn viết tay" },
  ivoryPillow: { src: photo("0bdf429fa5bb6e20"), alt: "Hộp gối ivory thắt nơ" },
  whiteBox: { src: photo("42f41003ce34a4a9"), alt: "Hộp trắng tối giản in chìm logo" },
  candleTube: { src: photo("11aab61a5e6b85b3"), alt: "Hộp ống giấy đựng nến" },
} as const;

export type SitePhoto = (typeof PHOTOS)[keyof typeof PHOTOS];
