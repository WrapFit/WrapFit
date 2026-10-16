/* ds-artwork: payment brand marks (VietQR, MoMo, Napas) drawn as small vector wordmarks in their own colours. */
import React from "react";

/** Every tile has the same height (and width, but the longer bank transfer) so the row reads as one even strip. */
const TILE = "inline-flex h-9 items-center justify-center overflow-hidden rounded-lg bg-white shadow-xs ring-1 ring-black/5";
const FONT = "Inter, Arial, sans-serif";

export type PaymentMethodId = "vietqr" | "bank" | "momo" | "napas" | "cod";

/** The methods of the footer strip. */
const FOOTER_METHODS: PaymentMethodId[] = ["vietqr", "momo", "napas", "cod"];

const MARKS: Record<PaymentMethodId, { title: string; wide?: boolean; style?: React.CSSProperties; svg: React.ReactNode }> = {
  vietqr: { title: "VietQR", svg: (
          <svg viewBox="0 0 60 16" width="56" role="img" aria-label="VietQR">
            <text x="30" y="12.5" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="13.5" letterSpacing="-0.3">
              <tspan fill="#E21F26">Viet</tspan>
              <tspan fill="#0A61A8">QR</tspan>
            </text>
          </svg>
      ) },
  bank: { title: "Chuyển khoản ngân hàng", wide: true, svg: (
          <svg viewBox="0 0 92 16" width="92" role="img" aria-label="Chuyển khoản ngân hàng">
            <g fill="none" stroke="#005CA9" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
              <path d="M2 6.2 8 2.8l6 3.4H2Z" />
              <path d="M3.6 7.8v4.4M6.4 7.8v4.4M9.6 7.8v4.4M12.4 7.8v4.4M2 13.4h12" />
            </g>
            <text x="18" y="12" fontFamily={FONT} fontWeight="700" fontSize="10.5" fill="#1D293D">Chuyển khoản</text>
          </svg>
      ) },
  momo: { title: "Ví MoMo", style: { background: "#A50064" }, svg: (
          <svg viewBox="0 0 60 16" width="56" role="img" aria-label="MoMo">
            <text x="30" y="12.5" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="13.5" fill="#FFFFFF" letterSpacing="-0.2">
              MOMO
            </text>
          </svg>
      ) },
  napas: { title: "Thẻ nội địa Napas", svg: (
          <svg viewBox="0 0 60 16" width="56" role="img" aria-label="Napas">
            <text x="30" y="12.5" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="13.5" fill="#0B3E91" letterSpacing="-0.3">
              napas
            </text>
          </svg>
      ) },
  cod: { title: "Thanh toán khi nhận hàng", svg: (
          <svg viewBox="0 0 60 16" width="56" role="img" aria-label="COD - thanh toán khi nhận hàng">
            <g fill="none" stroke="#1D293D" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
              <path d="M6 3h10v8H6z" />
              <path d="M16 6h3.5l2.5 2.6V11h-6" />
              <circle cx="9.5" cy="12.5" r="1.6" fill="#FFFFFF" />
              <circle cx="19" cy="12.5" r="1.6" fill="#FFFFFF" />
            </g>
            <text x="26" y="12" fontFamily={FONT} fontWeight="800" fontSize="11" fill="#1D293D">COD</text>
          </svg>
      ) },
};

/** One payment brand mark on its tile, the same in the footer, billing and checkout. */
export function PaymentMark({ method, className }: { method: PaymentMethodId; className?: string }) {
  const mark = MARKS[method];
  return (
    <span className={[TILE, mark.wide ? "w-[112px]" : "w-[76px]", className].filter(Boolean).join(" ")} style={mark.style} title={mark.title}>
      {mark.svg}
    </span>
  );
}

/** Payment methods accepted, as crisp vector marks on white tiles (footer, checkout). */
export function PaymentLogos({ className, methods = FOOTER_METHODS }: { className?: string; methods?: PaymentMethodId[] }) {
  return (
    <ul className={className} aria-label="Phương thức thanh toán">
      {methods.map((method) => (
        <li key={method}>
          <PaymentMark method={method} />
        </li>
      ))}
    </ul>
  );
}
