"use client";

import { Bug, FileCheck2, KeyRound, Lock, Mail, MapPin, ScanSearch, ShieldCheck, UserCog } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Container } from "@/components/landing";
import { Card, CheckList, IconTile, PageHero, SitePage, Toc } from "@/components/site";

// /security: what the platform does today, from the back end (be/src/auth, be/src/common guards, be/src/storage),
// and what is planned, said as such.

const SECTIONS = [
  { id: "ma-hoa", label: "Mã hoá dữ liệu" },
  { id: "truy-cap", label: "Kiểm soát truy cập" },
  { id: "luu-tru", label: "Nơi lưu dữ liệu" },
  { id: "tuan-thu", label: "Tuân thủ & chứng nhận" },
  { id: "kiem-thu", label: "Kiểm thử bảo mật" },
  { id: "su-co", label: "Lịch sử sự cố" },
  { id: "bao-cao", label: "Báo cáo lỗ hổng" },
];

export default function SecurityPage() {
  return (
    <SitePage>
      <PageHero
        title="Bảo mật"
        subtitle="Thiết kế của bạn là tài sản của thương hiệu bạn."
        lead="Logo, bảng màu và khuôn hộp là thứ bạn mất nhiều công tạo ra. Đây là cách WrapFit giữ chúng an toàn — và những gì chúng tôi còn đang làm."
        actions={
          <a href="#bao-cao" className="inline-flex h-10 items-center gap-2 rounded-full bg-landing-ink px-5 text-sm font-semibold text-white hover:bg-landing-ink/90">
            <Bug className="size-4" aria-hidden /> Báo cáo lỗ hổng
          </a>
        }
      />

      <Container className="grid grid-cols-1 gap-8 pb-16 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside>
          <Toc items={SECTIONS} />
        </aside>

        <div className="flex flex-col gap-5">
          <Block id="ma-hoa" icon={Lock} title="Mã hoá dữ liệu">
            <CheckList
              items={[
                "Mọi kết nối dùng HTTPS (TLS), kể cả API và tải tệp.",
                "Mật khẩu được băm bằng bcrypt; WrapFit không lưu và không đọc được mật khẩu gốc.",
                "Phiên đăng nhập nằm trong cookie HttpOnly, Secure, SameSite=Lax — mã JavaScript trên trang không đọc được.",
                "Tệp tải lên đi thẳng vào kho lưu trữ qua đường dẫn ký trước, có thời hạn ngắn.",
              ]}
            />
          </Block>

          <Block id="truy-cap" icon={UserCog} title="Kiểm soát truy cập">
            <CheckList
              items={[
                "Dự án mặc định là riêng tư; chỉ chủ dự án sửa, xuất file hay xoá được.",
                "Phân quyền theo vai trò: Nhà sáng tạo, Nghệ nhân Pro, Xưởng in, Quản trị viên.",
                "Mã đăng nhập ngắn hạn, mã gia hạn xoay vòng sau mỗi lần dùng; “Đăng xuất mọi thiết bị” huỷ tất cả.",
                "Giới hạn số lần đăng nhập sai để chặn dò mật khẩu.",
                "Đăng nhập bằng Google có mã chống giả mạo (state).",
              ]}
            />
            <p className="mt-4 rounded-2xl bg-landing-canvas p-4 text-sm text-landing-muted">
              <KeyRound className="mr-1.5 inline size-4 align-[-3px]" aria-hidden />
              Xác thực hai bước (2FA) bằng mã OTP đang được hoàn thiện và sẽ bật cho mọi tài khoản trả phí.
            </p>
          </Block>

          <Block id="luu-tru" icon={MapPin} title="Nơi lưu dữ liệu">
            <p className="text-sm leading-relaxed text-landing-muted">
              Máy chủ ứng dụng và cơ sở dữ liệu PostgreSQL chạy trên máy chủ riêng (VPS) do đội WrapFit quản lý; tệp tải lên và file in nằm trên dịch vụ lưu trữ tương thích S3 (Cloudflare R2). Dự án bị xoá ở thùng rác quá 30 ngày được xoá hẳn cùng các tệp của nó. Chi tiết trong{" "}
              <Link href="/legal/privacy" className="font-semibold text-fpt-orange-ink">
                Chính sách quyền riêng tư
              </Link>
              .
            </p>
          </Block>

          <Block id="tuan-thu" icon={FileCheck2} title="Tuân thủ & chứng nhận">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Badge title="Nghị định 13/2023/NĐ-CP" status="Áp dụng" text="Bảo vệ dữ liệu cá nhân tại Việt Nam: quyền xem, sửa, xoá dữ liệu." />
              <Badge title="OWASP ASVS cấp 1" status="Đang rà soát" text="Danh sách kiểm tra bảo mật ứng dụng web dùng khi viết mã." />
              <Badge title="ISO/IEC 27001" status="Chưa có" text="Sẽ cân nhắc khi WrapFit phục vụ doanh nghiệp lớn." muted />
              <Badge title="PCI DSS" status="Không áp dụng" text="WrapFit không lưu số thẻ; thanh toán qua cổng của ngân hàng." muted />
            </div>
          </Block>

          <Block id="kiem-thu" icon={ScanSearch} title="Kiểm thử bảo mật">
            <CheckList
              items={[
                "Kiểm thử tự động cho đăng nhập, phân quyền và quyền sở hữu dự án chạy ở mỗi lần cập nhật mã.",
                "Kiểm tra thư viện phụ thuộc định kỳ để vá lỗ hổng đã công bố.",
                "Kiểm thử xâm nhập độc lập: dự kiến trước khi mở bản thương mại.",
              ]}
            />
          </Block>

          <Block id="su-co" icon={ShieldCheck} title="Lịch sử sự cố">
            <p className="text-sm leading-relaxed text-landing-muted">
              Chưa có sự cố bảo mật nào được ghi nhận. Nếu có sự cố ảnh hưởng đến dữ liệu của bạn, chúng tôi thông báo qua email trong vòng 72 giờ kể từ khi phát hiện, kèm những gì bị ảnh hưởng và việc bạn nên làm. Tình trạng vận hành xem tại{" "}
              <Link href="/status" className="font-semibold text-fpt-orange-ink">
                trang trạng thái
              </Link>
              .
            </p>
          </Block>

          <Card as="article" className="bg-landing-green-night p-6 text-white ring-0 sm:p-8">
            <h2 id="bao-cao" className="scroll-mt-28 font-landing-heading text-2xl font-bold">
              Báo cáo lỗ hổng
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/90">
              Bạn tìm thấy lỗ hổng? Cảm ơn bạn. Hãy gửi mô tả, các bước tái hiện và mức ảnh hưởng. Chúng tôi phản hồi trong 3 ngày làm việc và ghi tên bạn trong danh sách cảm ơn (nếu bạn muốn).
            </p>
            <CheckList
              tone="dark"
              className="mt-4"
              items={["Chỉ thử trên tài khoản của chính bạn.", "Không truy cập, sửa hay xoá dữ liệu của người khác.", "Không tấn công từ chối dịch vụ.", "Giữ kín cho đến khi lỗ hổng được vá."]}
            />
            <a href="mailto:security@wrapfit.vn" className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-landing-ink">
              <Mail className="size-4" aria-hidden /> security@wrapfit.vn
            </a>
          </Card>
        </div>
      </Container>
    </SitePage>
  );
}

function Block({ id, icon, title, children }: { id: string; icon: React.ComponentProps<typeof IconTile>["icon"]; title: string; children: React.ReactNode }) {
  return (
    <Card as="article" className="p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-3">
        <IconTile icon={icon} />
        <h2 id={id} className="scroll-mt-28 font-landing-heading text-xl font-bold sm:text-2xl">
          {title}
        </h2>
      </div>
      {children}
    </Card>
  );
}

function Badge({ title, status, text, muted }: { title: string; status: string; text: string; muted?: boolean }) {
  return (
    <div className="rounded-2xl bg-landing-canvas p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{title}</p>
        <span className={muted ? "rounded-full bg-white px-2 py-0.5 text-caption font-semibold text-landing-muted" : "rounded-full bg-fpt-orange px-2 py-0.5 text-caption font-semibold text-white"}>{status}</span>
      </div>
      <p className="mt-1 text-sm text-landing-muted">{text}</p>
    </div>
  );
}

