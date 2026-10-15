/* ds-artwork: payment brand marks (VietQR, MoMo, Napas) drawn as small vector wordmarks in their own colours. */
import React from "react";

/** Every tile has the same size so the row reads as one even strip. */
const TILE = "inline-flex h-9 w-[76px] items-center justify-center overflow-hidden rounded-lg bg-white shadow-xs ring-1 ring-black/5";
const FONT = "Inter, Arial, sans-serif";

export type PaymentMethodId = "vietqr" | "momo" | "napas" | "cod";

const MARKS: Record<PaymentMethodId, { title: string; style?: React.CSSProperties; svg: React.ReactNode }> = {
  vietqr: { title: "VietQR", svg: (
          <svg viewBox="0 0 60 16" width="56" role="img" aria-label="VietQR">
            <text x="30" y="12.5" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="13.5" letterSpacing="-0.3">
              <tspan fill="#E21F26">Viet</tspan>
              <tspan fill="#0A61A8">QR</tspan>
            </text>
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
    <span className={className ? `${TILE} ${className}` : TILE} style={mark.style} title={mark.title}>
      {mark.svg}
    </span>
  );
}

/** Payment methods accepted, as crisp vector marks on white tiles (footer, checkout). */
export function PaymentLogos({ className }: { className?: string }) {
  return (
    <ul className={className} aria-label="Phương thức thanh toán">
      {(Object.keys(MARKS) as PaymentMethodId[]).map((method) => (
        <li key={method}>
          <PaymentMark method={method} />
        </li>
      ))}
    </ul>
  );
}
