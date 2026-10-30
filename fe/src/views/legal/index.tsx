"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Container } from "@/components/landing";
import { Card, PageHero, SitePage, Toc } from "@/components/site";
import { EXPORT_PACK_LIST, EXPORT_PACK_VALID_MONTHS, PLANS, PRO_PERIOD_DAYS, formatVnd } from "@/features/pricing";
import { cn } from "@/utils/helpers";

// /legal/privacy, /legal/terms and /legal/cookies. The facts follow the back end: what it stores (be/prisma), the
// session cookies (be/src/auth/auth-cookie.service.ts), the 30-day trash (be/src/projects), the AI provider
// (be/src/ai) and the print liability the CP2 report asks to state plainly.

interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

interface LegalDoc {
  path: string;
  label: string;
  title: string;
  lead: string;
  updated: string;
  versions: { version: string; date: string; change: string }[];
  sections: LegalSection[];
}

const DOCS: LegalDoc[] = [];
const P = ({ children }: { children: React.ReactNode }) => <p>{children}</p>;
const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-fpt-orange-ink">
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
);

const PRIVACY: LegalDoc = {
  path: "/legal/privacy",
  label: "Quyền riêng tư",
  title: "Chính sách quyền riêng tư",
  lead: "WrapFit chỉ thu thập những gì cần để bạn thiết kế, lưu và in chiếc hộp của mình — và không bán dữ liệu của bạn cho bất kỳ ai.",
  updated: "2026-10-12",
  versions: [
    { version: "1.1", date: "2026-10-12", change: "Thêm phần đơn in mẫu và xưởng in đối tác." },
    { version: "1.0", date: "2026-09-20", change: "Bản đầu tiên cho bản thử nghiệm (beta)." },
  ],
  sections: [
    {
      id: "thu-thap",
      title: "Dữ liệu chúng tôi thu thập",
      body: (
        <UL
          items={[
            <><strong>Tài khoản:</strong> email, họ tên, tên cửa hàng, ảnh đại diện; mật khẩu chỉ được lưu dưới dạng băm (bcrypt), không ai đọc được.</>,
            <><strong>Thiết kế:</strong> kích thước hộp, cấu trúc, giấy, chữ, logo, ảnh và hoa văn bạn đặt lên khuôn, cùng các phiên bản đã lưu.</>,
            <><strong>Tệp tải lên và file in:</strong> logo, ảnh, ảnh thu nhỏ dự án và file PDF/SVG/DXF đã xuất.</>,
            <><strong>Đơn in mẫu:</strong> tên người nhận, số điện thoại và địa chỉ giao hàng bạn nhập khi đặt hộp mẫu.</>,
            <><strong>Kỹ thuật:</strong> địa chỉ IP và thời điểm truy cập, dùng để chống đăng nhập dò mật khẩu và gỡ lỗi.</>,
          ]}
        />
      ),
    },
    {
      id: "su-dung",
      title: "Chúng tôi dùng dữ liệu để làm gì",
      body: (
        <UL
          items={[
            "Đăng nhập, lưu và mở lại dự án của bạn trên mọi thiết bị.",
            "Dựng khuôn bế, chạy FitCheck™ và tạo file in.",
            "Gửi email xác nhận tài khoản, đặt lại mật khẩu và thông báo về file in.",
            "Chuyển đơn in mẫu đến xưởng in bạn chọn.",
            "Tính hạn mức dung lượng và lượt tạo hoa văn AI theo gói.",
          ]}
        />
      ),
    },
    {
      id: "chia-se",
      title: "Chia sẻ với bên thứ ba",
      body: (
        <>
          <P>Chúng tôi không bán và không cho thuê dữ liệu. Một số nhà cung cấp xử lý dữ liệu thay mặt WrapFit:</P>
          <UL
            items={[
              <><strong>Lưu trữ tệp</strong> (dịch vụ tương thích S3 / Cloudflare R2): logo, ảnh và file in của bạn.</>,
              <><strong>Hoa văn AI</strong> (Anthropic Claude): chỉ từ khoá phong cách và bảng màu bạn nhập được gửi đi, không kèm email hay thiết kế.</>,
              <><strong>Đăng nhập Google</strong>: chỉ khi bạn chọn, Google gửi cho chúng tôi email và tên của bạn.</>,
              <><strong>Xưởng in đối tác</strong>: chỉ nhận file in và thông tin giao hàng của đơn bạn đặt.</>,
            ]}
          />
        </>
      ),
    },
    {
      id: "cong-khai",
      title: "Thiết kế công khai",
      body: <P>Dự án mặc định là riêng tư. Khi bạn chuyển sang “Chỉ ai có liên kết” hoặc “Công khai”, người khác xem được hộp 3D và tên tác giả; thiết kế công khai đạt FitCheck™ từ 90 điểm có thể xuất hiện trong thư viện cộng đồng. Bạn đổi lại riêng tư bất cứ lúc nào.</P>,
    },
    {
      id: "luu-giu",
      title: "Thời gian lưu giữ",
      body: (
        <UL
          items={[
            "Dự án và tệp: lưu đến khi bạn xoá.",
            "Thùng rác: dự án đã xoá được giữ 30 ngày rồi xoá hẳn cùng các tệp của nó.",
            "Phiên đăng nhập: hết hạn tự động; “Đăng xuất mọi thiết bị” huỷ tất cả ngay lập tức.",
          ]}
        />
      ),
    },
    {
      id: "quyen",
      title: "Quyền của bạn",
      body: (
        <>
          <P>Bạn có quyền xem, sửa, tải xuống và yêu cầu xoá dữ liệu của mình, theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.</P>
          <UL items={["Sửa hồ sơ trong Cài đặt tài khoản.", "Tải file in của từng dự án trong Đơn hàng & file in.", "Yêu cầu xoá tài khoản: gửi email đến privacy@wrapfit.vn, chúng tôi xử lý trong 7 ngày làm việc."]} />
        </>
      ),
    },
  ],
};

const TERMS: LegalDoc = {
  path: "/legal/terms",
  label: "Điều khoản",
  title: "Điều khoản sử dụng",
  lead: "Những thỏa thuận giữa bạn và WrapFit khi dùng studio, xuất file in và đặt in mẫu — viết ngắn gọn, đặc biệt là phần trách nhiệm khi in.",
  updated: "2026-10-12",
  versions: [
    { version: "1.1", date: "2026-10-12", change: "Làm rõ trách nhiệm về màu in và hộp mẫu." },
    { version: "1.0", date: "2026-09-20", change: "Bản đầu tiên cho bản thử nghiệm (beta)." },
  ],
  sections: [
    {
      id: "tai-khoan",
      title: "Tài khoản",
      body: <P>Bạn cần một email hợp lệ và chịu trách nhiệm giữ mật khẩu. Một người hoặc một cửa hàng có thể có nhiều dự án, nhưng không chia sẻ một tài khoản cho nhiều người dùng khác nhau.</P>,
    },
    {
      id: "noi-dung",
      title: "Nội dung của bạn",
      body: <P>Logo, ảnh, chữ và thiết kế bạn tạo thuộc về bạn. Bạn cho phép WrapFit lưu, hiển thị và chuyển chúng đến xưởng in chỉ để cung cấp dịch vụ. Bạn cam kết có quyền sử dụng mọi hình ảnh, nhãn hiệu tải lên.</P>,
    },
    {
      id: "file-in",
      title: "Khuôn bế, FitCheck™ và file in",
      body: (
        <>
          <P>Khuôn bế được tính từ kích thước và độ dày giấy bạn nhập. FitCheck™ kiểm tra vùng an toàn 3 mm, tràn lề 2 mm, độ phân giải 200 DPI và tai dán — nhưng không thay thế được việc kiểm tra trên giấy thật.</P>
          <UL items={["Hãy đo món quà cẩn thận: khuôn đúng với số đo bạn nhập.", "Luôn in 1 hộp mẫu trước khi in số lượng.", "Kiểm tra bản xem trước của xưởng trước khi duyệt in."]} />
        </>
      ),
    },
    {
      id: "mau-sac",
      title: "Màu in và trách nhiệm",
      body: (
        <>
          <P>Màu trên màn hình (RGB) và màu in trên giấy (CMYK) luôn khác nhau, nhất là trên giấy Kraft. WrapFit không cam kết màu in giống hệt màn hình.</P>
          <UL
            items={[
              "Lỗi do file (khuôn sai so với số đo đã nhập, file thiếu lớp): WrapFit xuất lại file miễn phí.",
              "Lỗi in, cắt, gấp của xưởng: xưởng in chịu trách nhiệm theo chính sách in lại của xưởng.",
              "Đơn in mẫu đặt qua WrapFit: được in lại một lần miễn phí nếu hộp không vừa với số đo đã nhập.",
            ]}
          />
        </>
      ),
    },
    {
      id: "thanh-toan",
      title: "Gói cước và hoàn tiền",
      body: <P>{`Gói ${PLANS.STARTER.name} ${formatVnd(PLANS.STARTER.price.monthly)} dùng trong ${PRO_PERIOD_DAYS} ngày kể từ lúc thanh toán và không tự gia hạn. Lượt xuất mua theo gói ${EXPORT_PACK_LIST.map((pack) => `${pack.credits} lượt ${formatVnd(pack.priceVnd)}`).join(', ')}, còn hạn ${EXPORT_PACK_VALID_MONTHS} tháng; mỗi lượt mở khóa file in sạch của một bản thiết kế trong 7 ngày. Gói ${PLANS.PRO_BUSINESS.name} ký theo hợp đồng.`} Trong 7 ngày đầu của lần thanh toán đầu tiên, nếu bạn chưa xuất file in nào, chúng tôi hoàn tiền 100%. Lượt xuất đã dùng không được hoàn.</P>,
    },
    {
      id: "cam",
      title: "Những việc không được làm",
      body: <UL items={["Tải lên nội dung vi phạm pháp luật hoặc bản quyền của người khác.", "Dò tìm lỗ hổng ngoài chương trình báo cáo lỗ hổng.", "Tự động thu thập dữ liệu thư viện mẫu với số lượng lớn."]} />,
    },
    {
      id: "thay-doi",
      title: "Thay đổi điều khoản",
      body: <P>Khi điều khoản thay đổi đáng kể, chúng tôi báo qua email ít nhất 14 ngày trước khi áp dụng. Lịch sử phiên bản ở cuối trang này.</P>,
    },
  ],
};

const COOKIES: LegalDoc = {
  path: "/legal/cookies",
  label: "Cookie",
  title: "Chính sách cookie",
  lead: "WrapFit dùng rất ít cookie: chủ yếu để giữ bạn đăng nhập an toàn. Không có cookie quảng cáo.",
  updated: "2026-10-12",
  versions: [{ version: "1.0", date: "2026-10-12", change: "Bản đầu tiên." }],
  sections: [
    {
      id: "can-thiet",
      title: "Cookie cần thiết",
      body: (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[520px] overflow-hidden rounded-2xl bg-landing-canvas text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-landing-muted">
              <tr>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Mục đích</th>
                <th className="px-4 py-3">Thời hạn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-landing-line/60">
              <tr>
                <td className="px-4 py-3 font-mono text-xs">wf_access</td>
                <td className="px-4 py-3">Phiên đăng nhập ngắn hạn (HttpOnly, không đọc được bằng JavaScript)</td>
                <td className="px-4 py-3">Vài phút, tự gia hạn</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">wf_refresh</td>
                <td className="px-4 py-3">Giữ đăng nhập, xoay vòng sau mỗi lần dùng (HttpOnly)</td>
                <td className="px-4 py-3">Đến khi đăng xuất</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">Trạng thái Google</td>
                <td className="px-4 py-3">Chống giả mạo khi đăng nhập bằng Google</td>
                <td className="px-4 py-3">Vài phút</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: "trinh-duyet",
      title: "Bộ nhớ trình duyệt",
      body: <P>Một số lựa chọn được ghi trên thiết bị của bạn (localStorage): đã xem phần giới thiệu, bản nháp studio dùng thử, email đăng ký bản tin trước khi danh sách thư mở. Chúng không rời khỏi trình duyệt.</P>,
    },
    {
      id: "tu-choi",
      title: "Từ chối cookie",
      body: <P>Bạn có thể chặn cookie trong cài đặt trình duyệt, nhưng khi đó không đăng nhập được. Studio dùng thử vẫn hoạt động mà không cần cookie.</P>,
    },
  ],
};

DOCS.push(PRIVACY, TERMS, COOKIES);

const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" });

function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <SitePage>
      <PageHero breadcrumb={[{ label: "Trang chủ", href: "/" }, { label: "Pháp lý", href: "/legal/terms" }, { label: doc.title }]} title={doc.title} lead={doc.lead} meta={<>Cập nhật lần cuối: <time dateTime={doc.updated}>{formatDate(doc.updated)}</time> · Phiên bản {doc.versions[0].version}</>} />
      <Container className="pb-16">
        <nav aria-label="Văn bản pháp lý" className="mb-8 flex flex-wrap gap-2">
          {DOCS.map((other) => (
            <Link
              key={other.path}
              href={other.path}
              aria-current={other.path === doc.path ? "page" : undefined}
              className={cn("h-9 rounded-full px-4 text-sm font-medium leading-9 transition-colors", other.path === doc.path ? "bg-landing-ink text-white" : "bg-white ring-1 ring-landing-line hover:bg-landing-tile/60")}
            >
              {other.label}
            </Link>
          ))}
        </nav>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-5">
            <Toc items={[...doc.sections.map(({ id, title }) => ({ id, label: title })), { id: "phien-ban", label: "Lịch sử phiên bản" }, { id: "lien-he", label: "Liên hệ pháp lý" }]} />
          </aside>
          <div className="flex flex-col gap-5">
            {doc.sections.map((section, index) => (
              <Card key={section.id} as="article" className="scroll-mt-24 p-6 sm:p-8">
                <h2 id={section.id} className="scroll-mt-28 font-landing-heading text-xl font-bold sm:text-2xl">
                  <span className="mr-2 font-mono text-sm text-landing-muted">{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </h2>
                <div className="mt-4 flex flex-col gap-3 text-body leading-7 text-landing-ink/90">{section.body}</div>
              </Card>
            ))}
            <Card as="article" className="p-6 sm:p-8">
              <h2 id="phien-ban" className="scroll-mt-28 font-landing-heading text-xl font-bold sm:text-2xl">
                Lịch sử phiên bản
              </h2>
              <ol className="mt-4 flex flex-col divide-y divide-landing-line/60">
                {doc.versions.map((version) => (
                  <li key={version.version} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
                    <span className="w-32 shrink-0 font-mono text-sm font-semibold">v{version.version} · {version.date.split("-").reverse().join("/")}</span>
                    <span className="text-sm text-landing-muted">{version.change}</span>
                  </li>
                ))}
              </ol>
            </Card>
            <Card as="article" className="flex flex-col gap-4 bg-landing-green-night p-6 text-white ring-0 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <h2 id="lien-he" className="scroll-mt-28 font-landing-heading text-xl font-bold">
                  Câu hỏi về pháp lý hoặc dữ liệu?
                </h2>
                <p className="mt-1 text-sm text-white/90">Chúng tôi trả lời trong 3 ngày làm việc.</p>
              </div>
              <a href="mailto:legal@wrapfit.vn" className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-landing-ink">
                <Mail className="size-4" aria-hidden /> legal@wrapfit.vn
              </a>
            </Card>
          </div>
        </div>
      </Container>
    </SitePage>
  );
}

export const PrivacyPage = () => <LegalPage doc={PRIVACY} />;
export const TermsPage = () => <LegalPage doc={TERMS} />;
export const CookiesPage = () => <LegalPage doc={COOKIES} />;
