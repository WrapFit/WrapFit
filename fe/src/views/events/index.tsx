"use client";

import { CalendarDays, Clock, MapPin, Monitor, Ticket, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Card, CheckList, PageHero, PhotoFrame, PRIMARY_CTA, SECONDARY_CTA, Section, SitePage } from "@/components/site";
import { PHOTOS } from "@/features/site/photos";
import { TEAM, initialsOf } from "@/features/site/company";
import { cn } from "@/utils/helpers";

// /events: the workshop of the CP2 go-to-market ("packaging webinars", maker guilds), held at FPT University and online.
// Registration has no API yet: the seat is kept on this device and the page says so.

const START = new Date("2026-11-21T14:00:00+07:00");
const SEATS = 40;

const AGENDA = [
  { time: "14:00", title: "Đo món quà cho đúng", text: "Kích thước lọt lòng, dung sai và độ dày giấy: vì sao 2 mm quyết định nắp có đóng được không." },
  { time: "14:40", title: "Dựng khuôn và thiết kế trên WrapFit", text: "Mỗi người làm một hộp Tết cho sản phẩm của mình, có FitCheck™ kiểm tra." },
  { time: "15:40", title: "Nghỉ giải lao · gấp hộp mẫu", text: "Cầm trên tay hộp in thử trên Kraft và Ivory 300 GSM." },
  { time: "16:00", title: "Từ file đến xưởng in", text: "File PDF tách lớp, máy cắt kỹ thuật số và cách đặt 20–50 hộp không cần khuôn dao." },
  { time: "16:40", title: "Hỏi đáp & tặng quà", text: "Mỗi người tham dự nhận mã in 1 hộp mẫu miễn phí." },
];

const HOSTS = [TEAM[0], TEAM[1], TEAM[4]];

function useCountdown(target: Date) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  if (now === null) return null;
  const left = Math.max(0, target.getTime() - now);
  return { days: Math.floor(left / 86_400_000), hours: Math.floor((left % 86_400_000) / 3_600_000), minutes: Math.floor((left % 3_600_000) / 60_000) };
}

export default function EventPage() {
  const countdown = useCountdown(START);
  return (
    <SitePage>
      <PageHero
        kicker="Workshop miễn phí · 21/11/2026"
        title="Hộp quà Tết 2027 vừa khít"
        subtitle="làm xong trong một buổi chiều."
        lead="Ba giờ thực hành cho chủ shop nến, trà, bánh, trang sức: đo món quà, dựng khuôn, thiết kế và mang về hộp mẫu in thật — không cần biết phần mềm đồ hoạ."
        actions={
          <>
            <a href="#dang-ky" className={PRIMARY_CTA}>
              <Ticket className="size-4" aria-hidden /> Giữ chỗ miễn phí
            </a>
            <a href="#lich" className={SECONDARY_CTA}>
              Xem lịch trình
            </a>
          </>
        }
        aside={
          <PhotoFrame image={PHOTOS.foil} className="aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5]">
            <div className="absolute inset-x-4 bottom-4 rounded-3xl bg-white/95 p-4 shadow-soft-16 backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-5">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Fact icon={CalendarDays} label="Ngày" value="Thứ Bảy, 21/11/2026" />
                <Fact icon={Clock} label="Giờ" value="14:00 – 17:00" />
                <Fact icon={MapPin} label="Tại" value="Đại học FPT Hòa Lạc" />
                <Fact icon={Monitor} label="Trực tuyến" value="Google Meet" />
              </dl>
              {countdown && (
                <p className="mt-3 rounded-2xl bg-landing-lime-mist px-4 py-2.5 text-center text-sm text-landing-green-night" aria-live="polite">
                  Còn <strong>{countdown.days}</strong> ngày <strong>{countdown.hours}</strong> giờ <strong>{countdown.minutes}</strong> phút
                </p>
              )}
            </div>
          </PhotoFrame>
        }
      />

      <Section title="Bạn mang về được gì">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { title: "Một khuôn hộp của riêng bạn", text: "Dựng theo đúng sản phẩm bạn mang đến, đã qua FitCheck™.", image: PHOTOS.embossedDieline },
            { title: "Một hộp mẫu in thật", text: "In và cắt tại chỗ trên máy cắt kỹ thuật số, gấp ngay trong buổi.", image: PHOTOS.kraftTuck },
            { title: "Bảng giá in 20–50 hộp", text: "Từ xưởng đối tác, để bạn tính giá quà Tết cho chuẩn.", image: PHOTOS.lacquerBox },
          ].map((item) => (
            <article key={item.title} className="overflow-hidden rounded-card bg-white ring-1 ring-landing-ink/10 lg:rounded-card-lg">
              <PhotoFrame image={item.image} className="aspect-[4/3] rounded-none lg:rounded-none" />
              <div className="p-6">
                <p className="font-landing-heading text-xl font-bold">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-landing-muted">{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="lich" title="Lịch trình" band>
        <ol className="relative flex flex-col gap-4 border-l-2 border-landing-line pl-6">
          {AGENDA.map((item) => (
            <li key={item.time} className="relative">
              <span className="absolute -left-[33px] top-1.5 size-4 rounded-full border-4 border-white bg-fpt-orange" aria-hidden />
              <p className="font-mono text-sm font-semibold text-fpt-orange-ink">{item.time}</p>
              <p className="font-landing-heading text-lg font-bold">{item.title}</p>
              <p className="text-sm text-landing-muted">{item.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Người dẫn dắt">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {HOSTS.map((host) => (
            <Card key={host.name} className="flex items-center gap-4">
              <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl font-landing-heading text-lg font-bold text-landing-green-night" style={{ background: host.tint }}>
                {initialsOf(host.name)}
              </span>
              <div>
                <p className="font-semibold">{host.name}</p>
                <p className="text-sm text-landing-muted">{host.role}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Địa điểm">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card>
            <MapPin className="size-6 text-fpt-orange-ink" aria-hidden />
            <p className="mt-3 font-landing-heading text-lg font-bold">Trực tiếp: Đại học FPT Hòa Lạc</p>
            <p className="mt-1 text-sm text-landing-muted">Khu Công nghệ cao Hòa Lạc, Km29 Đại lộ Thăng Long, Hà Nội. Phòng sẽ gửi qua email trước 3 ngày. Mang theo món quà cần làm hộp.</p>
          </Card>
          <Card>
            <Monitor className="size-6 text-fpt-orange-ink" aria-hidden />
            <p className="mt-3 font-landing-heading text-lg font-bold">Trực tuyến: Google Meet</p>
            <p className="mt-1 text-sm text-landing-muted">Làm theo trên studio WrapFit từ máy tính; hộp mẫu gửi về nhà sau buổi học.</p>
          </Card>
        </div>
      </Section>

      <Section id="dang-ky" title="Giữ chỗ" className="pb-16">
        <Registration />
      </Section>
    </SitePage>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-landing-canvas p-3">
      <dt className="flex items-center gap-1.5 text-xs text-landing-muted">
        <Icon className="size-3.5" aria-hidden /> {label}
      </dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

const KEY = "wrapfit:event:tet-2027";

function Registration() {
  const [form, setForm] = useState({ name: "", email: "", mode: "offline", product: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) setDone(true);
    } catch {
      // Private mode: the form shows.
    }
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setError("Hãy nhập tên của bạn.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return setError("Email chưa đúng định dạng.");
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...form, at: new Date().toISOString() }));
    } catch {
      // Private mode.
    }
    setError(null);
    setDone(true);
  };

  if (done) {
    return (
      <Card className="bg-landing-lime-mist ring-0">
        <p className="font-landing-heading text-xl font-bold text-landing-green-night">Đã giữ chỗ trên thiết bị này</p>
        <p className="mt-1 text-sm text-landing-green-deep">
          Đăng ký trực tuyến chưa nối với hệ thống email. Để chắc chắn có chỗ, hãy gửi tên và email đến{" "}
          <a href="mailto:events@wrapfit.vn?subject=Đăng ký workshop Tết 2027" className="font-semibold underline">
            events@wrapfit.vn
          </a>
          .
        </p>
      </Card>
    );
  }

  const field = "mt-1 h-11 w-full rounded-xl bg-landing-canvas px-3 text-sm outline-none ring-1 ring-landing-line focus-visible:ring-[3px] focus-visible:ring-landing-green/30";
  return (
    <Card className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:p-10">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-landing-green-deep">
          <Users className="size-4" aria-hidden /> {SEATS} chỗ trực tiếp · không giới hạn trực tuyến
        </p>
        <CheckList className="mt-4" items={["Miễn phí, kèm 1 hộp mẫu", "Mang theo món quà cần làm hộp", "Có máy tính thì tốt, không có thì dùng máy của nhóm"]} />
      </div>
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Họ tên
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" className={field} />
        </label>
        <label className="text-sm font-medium">
          Email
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" className={field} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Sản phẩm bạn muốn làm hộp
          <input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Hũ nến 80 × 80 × 100 mm" className={field} />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium">Hình thức</legend>
          <div className="mt-2 flex gap-2">
            {[
              ["offline", "Trực tiếp"],
              ["online", "Trực tuyến"],
            ].map(([value, label]) => (
              <label key={value} className={cn("flex h-10 cursor-pointer items-center rounded-full px-4 text-sm ring-1", form.mode === value ? "bg-landing-ink text-white ring-landing-ink" : "bg-white ring-landing-line")}>
                <input type="radio" name="mode" value={value} checked={form.mode === value} onChange={() => setForm({ ...form, mode: value })} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm font-medium text-danger-fg sm:col-span-2">{error}</p>}
        <button type="submit" className={cn(PRIMARY_CTA, "sm:col-span-2")}>
          Giữ chỗ miễn phí
        </button>
      </form>
    </Card>
  );
}
