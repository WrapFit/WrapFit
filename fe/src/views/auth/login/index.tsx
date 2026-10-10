"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { googleSignInUrl, login, register } from "@/api/auth";
import { ROUTES } from "@/constants";
import { safeRedirect, useAuth } from "@/features/auth";
import { isApiError } from "@/services/api";
import type { LoginRequest, RegisterRequest } from "@/types/api";
import {
  ApiErrorAlert,
  FormAlert,
  PASSWORD_HINT,
  emailError,
  fullNameError,
  passwordError,
  withEmail,
} from "@/views/account/shared";

/*
 * Stitch screen `auth-login`, status `wired` (docs/12, D2): the markup and classes come from the Stitch export, the
 * behavior is React. Keep `data-stitch="auth-login"` on the root, the screen's CSS and tokens are scoped to it.
 */

export type AuthMode = "login" | "register";

type Params = Pick<URLSearchParams, "get">;
const NO_PARAMS: Params = new URLSearchParams();

const COPY: Record<
  AuthMode,
  { titleLead: string; description: string; submit: string; busy: string; switchLabel: string; switchAction: string }
> = {
  login: {
    titleLead: "Đăng nhập vào ",
    description: "Chào mừng bạn trở lại, vui lòng nhập thông tin để truy cập không gian CAD & 3D Studio.",
    submit: "Đăng nhập",
    busy: "Đang đăng nhập…",
    switchLabel: "Chưa có tài khoản? ",
    switchAction: "Đăng ký ngay",
  },
  register: {
    titleLead: "Tạo tài khoản ",
    description: "Khởi tạo tài khoản miễn phí để thiết kế khuôn bế & mô phỏng 3D ngay lập tức.",
    submit: "Bắt đầu miễn phí",
    busy: "Đang tạo tài khoản…",
    switchLabel: "Đã có tài khoản? ",
    switchAction: "Đăng nhập ngay",
  },
};

/** `?error=` set by the backend when "Sign in with Google" fails (`be/src/auth/auth.controller.ts`). */
const GOOGLE_ERRORS: Record<string, string> = {
  google_auth_failed: "Đăng nhập bằng Google chưa thành công. Vui lòng thử lại.",
  google_account_rejected:
    "Không đăng nhập được bằng tài khoản Google này: email Google chưa được xác minh, email đã gắn với một tài khoản Google khác, hoặc tài khoản đã bị khoá.",
};

/** `?notice=` set by the account pages before sending the user here. */
const NOTICES: Record<string, string> = {
  password_reset: "Đặt mật khẩu thành công, hãy đăng nhập.",
  email_verified: "Email đã được xác nhận, hãy đăng nhập.",
};

/** Own keys only: `?error=constructor` must not reach Object.prototype. */
function messageFor(table: Record<string, string>, key: string | null): string | undefined {
  return key && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

const INPUT_CLASS =
  "w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-white border border-stone-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all placeholder:text-stone-400 text-stone-800 shadow-xs aria-[invalid=true]:border-rose-400";

type FieldName = "fullName" | "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;
const FIELD_IDS: Record<FieldName, string> = {
  fullName: "input-name",
  email: "input-email",
  password: "input-password",
};

interface AuthLoginPageProps {
  /** Mode shown first: `/auth/login` or `/auth/register`. The user can switch in place. */
  initialMode?: AuthMode;
}

/** Sign-in and sign-up form of `/auth/login` and `/auth/register` (docs/06, 3.2 and 3.5). */
export default function AuthLoginPage({ initialMode = "login" }: AuthLoginPageProps) {
  // useSearchParams needs a Suspense boundary on a static page: the prerendered HTML shows the form without the
  // query-string banners, the client then renders it with them.
  return (
    <Suspense fallback={<AuthLoginScreen initialMode={initialMode} params={NO_PARAMS} />}>
      <AuthLoginWithParams initialMode={initialMode} />
    </Suspense>
  );
}

function AuthLoginWithParams({ initialMode }: { initialMode: AuthMode }) {
  const params = useSearchParams();
  return <AuthLoginScreen initialMode={initialMode} params={params} />;
}

function AuthLoginScreen({ initialMode, params }: { initialMode: AuthMode; params: Params }) {
  const router = useRouter();
  const { status, signedIn } = useAuth();
  const redirectTarget = safeRedirect(params.get("redirect"));
  const googleError = messageFor(GOOGLE_ERRORS, params.get("error"));
  const notice = messageFor(NOTICES, params.get("notice"));

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(() => params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // The query-string banners describe how the user got here: hide them once they act.
  const [submitted, setSubmitted] = useState(false);
  const [leavingForGoogle, setLeavingForGoogle] = useState(false);

  const redirected = useRef(false);
  const goToTarget = useCallback(() => {
    if (redirected.current) return;
    redirected.current = true;
    router.replace(redirectTarget);
  }, [redirectTarget, router]);

  // A signed-in user has nothing to do here (also covers the session set by a successful login below).
  useEffect(() => {
    if (status === "authenticated") goToTarget();
  }, [status, goToTarget]);

  // Back from Google through the back/forward cache: the button must work again.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setLeavingForGoogle(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: (session) => {
      signedIn(session.user);
      goToTarget();
    },
    onError: (error, data) => {
      // Right password, address not verified yet: the "check your inbox" page offers to resend the email.
      if (isApiError(error, "EMAIL_NOT_VERIFIED")) router.push(withEmail(ROUTES.checkEmail, data.email));
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => register(data),
    // Always 201, also for an address that already has an account: the email tells the owner what to do next.
    onSuccess: (result, data) => router.push(withEmail(ROUTES.checkEmail, result.email || data.email)),
  });

  const copy = COPY[mode];
  const isRegister = mode === "register";
  const activeMutation = isRegister ? registerMutation : loginMutation;
  // Busy until the next page opens, so a second click cannot send the form again.
  const busy = activeMutation.isPending || activeMutation.isSuccess;
  const formError =
    activeMutation.error != null && !isApiError(activeMutation.error, "EMAIL_NOT_VERIFIED")
      ? activeMutation.error
      : null;

  const toggleMode = () => {
    setMode((current) => (current === "login" ? "register" : "login"));
    setFieldErrors({});
    loginMutation.reset();
    registerMutation.reset();
  };

  const updateField =
    (field: FieldName, setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
      if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
    };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setSubmitted(true);
    const address = email.trim();
    const errors: FieldErrors = isRegister
      ? { fullName: fullNameError(fullName), email: emailError(address), password: passwordError(password) }
      : { email: emailError(address), password: password ? undefined : "Vui lòng nhập mật khẩu." };
    setFieldErrors(errors);
    const firstInvalid = (Object.keys(FIELD_IDS) as FieldName[]).find((field) => errors[field]);
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }
    if (isRegister) {
      registerMutation.mutate({ email: address, password, fullName: fullName.trim() || undefined });
    } else {
      loginMutation.mutate({ email: address, password });
    }
  };

  const signInWithGoogle = () => {
    setLeavingForGoogle(true);
    // A browser navigation, not fetch: the backend redirects to Google, then back here with the cookies set.
    window.location.assign(googleSignInUrl(redirectTarget));
  };

  const errorProps = (field: FieldName, hint?: string) => {
    const id = fieldErrors[field] ? `${FIELD_IDS[field]}-error` : hint ? `${FIELD_IDS[field]}-hint` : undefined;
    return { "aria-invalid": fieldErrors[field] ? true : undefined, "aria-describedby": id };
  };

  const fieldNote = (field: FieldName, hint?: string) =>
    fieldErrors[field] ? (
      <p id={`${FIELD_IDS[field]}-error`} className="mt-1.5 px-1 text-[11px] sm:text-xs text-rose-700">
        {fieldErrors[field]}
      </p>
    ) : hint ? (
      <p id={`${FIELD_IDS[field]}-hint`} className="mt-1.5 px-1 text-[11px] sm:text-xs text-stone-500">
        {hint}
      </p>
    ) : null;

  return (
    <div
      data-stitch="auth-login"
      className="bg-[#fff8f5] text-stone-800 font-sans antialiased h-screen w-screen overflow-hidden relative flex flex-col selection:bg-brand selection:text-white p-0 m-0"
    >
      {/* Center Master Card Container (Exact Jobsly 2-Column Bento Ratio) */}
      <main className="w-full h-full flex flex-row overflow-hidden relative z-10 p-0 m-0">
        {/* Decorative mosaic: desktop only, below lg the form takes the whole width. */}
        <div className="hidden lg:flex w-full lg:w-[58%] h-full bg-stone-900 p-3 sm:p-4 overflow-hidden relative flex-col justify-between">
          <div className="w-full h-full grid grid-cols-12 grid-rows-12 gap-3 p-1.5 overflow-hidden">
            <div className="col-span-7 row-span-5 rounded-3xl overflow-hidden relative group bg-stone-800 shadow-lg">
              <img
                alt="Luxury Packaging 3D"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida/AEtjO1Uspg_z7u6HUHwxug2zn0dP_ORO7bcN3t1JPm5gpUPgqwRTn-PZxNTGy6jwX6cRHrJWBif8jouGcXyokXK9LjgLIkfyRcVYFrchcSonmM0rDnr2RrAI6kPCaT2_uc1evheMkx5CeRN5wHvbqlRAk0hY9BynK8v1AVZ143Hzsh3KgenXiu8P9m0goczlGZIUlibmW4LyjCSpJvI0-ORnEh1p5fBH6o2PgdjhBTCyHawNNKGTTS4KZrpgQgm7"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs font-mono text-white/95">
                <span className="font-medium tracking-wide">Luxury Rigid Studio</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold uppercase backdrop-blur-sm">
                  3D CAD v4.2
                </span>
              </div>
            </div>
            <div className="col-span-5 row-span-4 bg-[#f05335] rounded-3xl p-5 sm:p-6 flex flex-col justify-between text-white shadow-lg transition-transform hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold bg-white/20 px-2.5 py-1 rounded-full text-white backdrop-blur-sm">
                  ECMA / FEFCO
                </span>
                <span className="material-symbols-outlined text-[18px] text-white/90">timer</span>
              </div>
              <div>
                <div className="font-sans font-extrabold text-3xl sm:text-4xl tracking-tight leading-none mb-2">
                  88%
                </div>
                <p className="text-white/95 text-xs sm:text-[13px] leading-snug font-medium">
                  {"tiết kiệm hơn 4 giờ dựng khuôn dao mẫu & test bế mỗi ngày."}
                </p>
              </div>
            </div>
            <div className="col-span-5 row-span-4 rounded-3xl bg-amber-50/95 border border-amber-200/60 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-md">
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-300/30 rounded-full blur-md" />
              <div className="w-16 h-16 relative mb-1.5 transform group-hover:scale-110 transition-transform">
                <img
                  alt="Bé Gói WrapFit Mascot"
                  className="w-full h-full object-contain filter drop-shadow-sm"
                  src="https://lh3.googleusercontent.com/aida/AEtjO1XxMYClelQATTbgX-vN_jkPVV4PnMq2OIqCnXmvGWJZVLKvlmtyezi-_Xmj82uuy0I0F9K3YDSknOObCwlRFLmimZMNB29nGbj-O-qQZnuPZ9FkcHbB8Cvt6yE7WrNrURALTtcfv129y3JfhuVsWsF2bwCwPyTHEjBAfHHBsXdjJQNcV_W9LJjzJmd9Io_1uZhRLT_5EMNaOHFvUyLbucdqWwc5Fve6ZbGa8e0Z6hUsoD2JeAHPo1q6TVY"
                />
              </div>
              <span className="font-mono text-[11px] uppercase font-bold text-amber-900 tracking-wider">
                Bé Gói AI Copilot
              </span>
              <span className="text-[10px] text-amber-800/80 font-mono mt-0.5">Hỗ trợ tính dung sai tự động</span>
            </div>
            <div className="col-span-7 row-span-4 rounded-3xl overflow-hidden relative group bg-stone-800 shadow-lg">
              <img
                alt="Dieline CAD Library"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                src="/stitch/img/bc0799ef9688db0c.png"
              />
              <div className="absolute inset-0 bg-stone-900/30" />
              <div className="absolute bottom-3 left-3 text-[11px] font-mono text-white/90 bg-stone-900/75 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="">Thư viện Cấu trúc Mẫu</span>
              </div>
            </div>
            <div className="col-span-7 row-span-3 rounded-3xl overflow-hidden relative group bg-stone-800 shadow-lg">
              <img
                alt="Template Matrix"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                src="/stitch/img/7e3fff2726afc0cb.png"
              />
              <div className="absolute inset-0 bg-stone-900/25" />
              <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-mono text-white/90 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                {" Template Chuẩn Hóa 3D"}
              </div>
            </div>
            <div className="col-span-5 row-span-4 bg-[#23c375] rounded-3xl p-5 flex flex-col justify-between text-white shadow-lg transition-transform hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold bg-white/20 px-2.5 py-1 rounded-full text-white backdrop-blur-sm">
                  FitCheck™
                </span>
                <span className="material-symbols-outlined text-[18px] text-white/90">verified</span>
              </div>
              <div>
                <div className="font-sans font-extrabold text-3xl tracking-tight leading-none mb-1.5">99.8%</div>
                <p className="text-white/95 text-xs leading-snug font-medium">
                  {"Tự động bù dung sai & kiểm tra đường cấn dao bế chuẩn xác."}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom padding below md clears the floating mobile navigation bar. */}
        <div className="w-full lg:w-[42%] h-full bg-[#fff8f5] flex flex-col justify-between px-6 sm:px-10 lg:px-14 pt-6 pb-24 md:pb-6 overflow-y-auto">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-wider text-stone-900">/WrapFit — 01</span>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-stone-200/80 text-stone-600 font-medium">
                Packaging Studio
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-stone-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {" Studio Online"}
            </div>
          </div>
          <div className="my-auto py-6 max-w-sm w-full mx-auto">
            <div className="text-left mb-6">
              <h1
                className="text-2xl sm:text-[30px] font-bold tracking-tight text-stone-900 leading-snug"
                id="auth-title"
              >
                {copy.titleLead}
                <span className="text-brand font-extrabold" id="brand-highlight">
                  WrapFit
                </span>
              </h1>
              <p className="text-stone-500 text-xs sm:text-[13px] mt-2 leading-relaxed" id="auth-desc">
                {copy.description}
              </p>
            </div>

            {status === "authenticated" ? (
              <div
                role="status"
                className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-xs sm:text-sm text-stone-600 shadow-xs"
              >
                <span
                  aria-hidden
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-stone-200 border-t-brand motion-reduce:animate-none"
                />
                Bạn đã đăng nhập. Đang mở không gian làm việc…
              </div>
            ) : (
              <>
                {!submitted && (googleError || notice) && (
                  <div className="mb-4 space-y-2.5">
                    {googleError && <FormAlert tone="error">{googleError}</FormAlert>}
                    {notice && <FormAlert tone="success">{notice}</FormAlert>}
                  </div>
                )}
                <form className="space-y-3.5" onSubmit={onSubmit} aria-labelledby="auth-title" noValidate>
                  {isRegister && (
                    <div className="transition-all duration-300" id="field-fullname">
                      <label htmlFor="input-name" className="sr-only">
                        Họ và tên hoặc tên xưởng in
                      </label>
                      <input
                        className={INPUT_CLASS}
                        id="input-name"
                        name="name"
                        autoComplete="name"
                        maxLength={200}
                        placeholder="Họ và tên hoặc tên xưởng in"
                        type="text"
                        value={fullName}
                        onChange={updateField("fullName", setFullName)}
                        {...errorProps("fullName")}
                      />
                      {fieldNote("fullName")}
                    </div>
                  )}
                  <div>
                    <label htmlFor="input-email" className="sr-only">
                      Địa chỉ Email
                    </label>
                    <input
                      className={INPUT_CLASS}
                      id="input-email"
                      name="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="Địa chỉ Email"
                      required
                      type="email"
                      value={email}
                      onChange={updateField("email", setEmail)}
                      {...errorProps("email")}
                    />
                    {fieldNote("email")}
                  </div>
                  <div>
                    <div className="relative">
                      <label htmlFor="input-password" className="sr-only">
                        Mật khẩu
                      </label>
                      <input
                        className={`${INPUT_CLASS} pr-12`}
                        id="input-password"
                        name="password"
                        autoComplete={isRegister ? "new-password" : "current-password"}
                        placeholder="Mật khẩu"
                        required
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={updateField("password", setPassword)}
                        {...errorProps("password", isRegister ? PASSWORD_HINT : undefined)}
                      />
                      <button
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        aria-pressed={showPassword}
                        aria-controls="input-password"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors w-11 h-11 flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                      >
                        <span className="material-symbols-outlined text-[19px]" id="eye-icon" aria-hidden>
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                    {fieldNote("password", isRegister ? PASSWORD_HINT : undefined)}
                  </div>
                  {!isRegister && (
                    <div className="flex items-center justify-end" id="forgot-password-container">
                      <Link
                        className="text-[12px] font-semibold text-brand hover:underline py-1"
                        href={withEmail(ROUTES.forgotPassword, email)}
                      >
                        Quên mật khẩu?
                      </Link>
                    </div>
                  )}
                  {formError != null && <ApiErrorAlert error={formError} />}
                  <button
                    className="w-full mt-2 min-h-[44px] py-3 px-5 rounded-xl bg-brand hover:bg-brand-dark active:scale-[0.99] text-white text-xs sm:text-sm font-semibold tracking-wide shadow-md shadow-brand/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70 disabled:active:scale-100"
                    id="submit-btn"
                    type="submit"
                    disabled={busy}
                    aria-busy={busy || undefined}
                  >
                    {busy && (
                      <span
                        aria-hidden
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                      />
                    )}
                    <span className="">{busy ? copy.busy : copy.submit}</span>
                  </button>
                </form>
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200" />
                  </div>
                  <span className="relative px-3 bg-[#fff8f5] text-[10px] font-mono uppercase tracking-widest text-stone-400">
                    OR
                  </span>
                </div>
                <div className="space-y-2.5">
                  <button
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-[13px] font-medium transition-all shadow-xs flex items-center justify-center gap-2.5 disabled:cursor-wait disabled:opacity-70"
                    type="button"
                    onClick={signInWithGoogle}
                    disabled={leavingForGoogle}
                    aria-busy={leavingForGoogle || undefined}
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                        fill="#EA4335"
                      />
                      <path
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z"
                        fill="#4285F4"
                      />
                      <path
                        d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 15.9C3.5 19.7 7.4 23 12 23z"
                        fill="#34A853"
                      />
                    </svg>
                    <span className="">{leavingForGoogle ? "Đang chuyển tới Google…" : "Đăng nhập với Google"}</span>
                  </button>
                  {/* No Apple sign-in on the backend: static button (decision D6). */}
                  <button
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-[13px] font-medium transition-all shadow-xs flex items-center justify-center gap-2.5"
                    type="button"
                  >
                    <svg className="w-4 h-4 shrink-0 fill-current text-stone-900" viewBox="0 0 170 170" aria-hidden>
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.73-7.98-12.13-14.69-6.32-9.82-11.22-20.73-14.69-32.74-3.48-12.01-5.21-23.49-5.21-34.45 0-14.15 3.57-26.01 10.7-35.59 7.13-9.58 16.03-14.47 26.69-14.69 4.9 0 10.45 1.34 16.66 4.02 6.2 2.68 10.02 4.07 11.45 4.18 1.13 0 5.1-1.46 11.91-4.38 6.81-2.92 12.53-4.23 17.16-3.92 13.06.72 23.33 5.43 30.82 14.13-11.43 6.94-17.03 16.63-16.8 29.08.23 9.7 3.91 17.79 11.04 24.28 7.13 6.49 15.64 10.15 25.53 10.99-2.39 7.04-5.32 14.28-8.8 21.7zM119.22 33.15c0-6.9 2.51-13.41 7.54-19.53 5.03-6.12 11.37-10.22 19.03-12.3 0 1.25.07 2.45.07 3.61 0 6.69-2.67 13.43-8 20.21-5.34 6.79-11.54 10.74-18.6 11.85-.03-1.28-.04-2.56-.04-3.84z" />
                    </svg>
                    <span className="">Đăng nhập với Apple</span>
                  </button>
                </div>
                <div className="mt-6 text-center text-xs text-stone-500">
                  <span id="bottom-switch-label" className="">
                    {copy.switchLabel}
                  </span>
                  <button
                    type="button"
                    id="bottom-switch-btn"
                    className="font-semibold text-brand hover:underline transition-all ml-1 py-2"
                    onClick={toggleMode}
                  >
                    {copy.switchAction}
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="pt-3 text-center text-[11px] text-stone-400 font-mono flex items-center justify-between border-t border-stone-200/80">
            <span className="">Bảo mật TLS 256-Bit</span>
            <div className="flex gap-3">
              <a className="hover:text-stone-700 transition-colors" href="#">
                Điều khoản
              </a>
              <Link className="hover:text-stone-700 transition-colors" href="/support">
                Trợ giúp CAD
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
