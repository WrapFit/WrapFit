"use client";

import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Mail, PlayCircle, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { googleSignInUrl, login, register } from "@/api/auth";
import { landingFontVariables } from "@/assets/fonts/landing";
import { PackagingSpecSheet } from "@/components/auth/PackagingSpecSheet";
import { LandingLogo } from "@/components/layout/LandingLogo";
import { ROUTES } from "@/constants";
import { safeRedirect, useAuth } from "@/features/auth";
import { isApiError } from "@/services/api";
import type { LoginRequest, RegisterRequest } from "@/types/api";
import { cn } from "@/utils/helpers";
import {
  ApiErrorAlert,
  FULL_NAME_MAX_LENGTH,
  FormAlert,
  PASSWORD_HINT,
  PASSWORD_MAX_LENGTH,
  emailError,
  fullNameError,
  passwordError,
  withEmail,
} from "@/views/account/shared";

export type AuthMode = "login" | "register";

type Params = Pick<URLSearchParams, "get">;
const NO_PARAMS: Params = new URLSearchParams();

// What the API offers (be/src/auth): register with email, password and an optional full name, then a verification
// email; login with email and password; Google sign-in; password reset by email. No Apple sign-in.
const COPY: Record<AuthMode, { title: string; submit: string; busy: string; switchLabel: string; switchAction: string; path: string }> = {
  login: {
    title: "Đăng nhập",
    submit: "Đăng nhập",
    busy: "Đang đăng nhập…",
    switchLabel: "Chưa có tài khoản?",
    switchAction: "Đăng ký",
    path: ROUTES.login,
  },
  register: {
    title: "Tạo tài khoản",
    submit: "Tạo tài khoản miễn phí",
    busy: "Đang tạo tài khoản…",
    switchLabel: "Đã có tài khoản?",
    switchAction: "Đăng nhập",
    path: ROUTES.register,
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

/**
 * Sign-in and sign-up of `/auth/login` and `/auth/register` (docs/06, 3.2 and 3.5): a packaging spec-sheet card next
 * to the form, on the left to sign in and on the right to sign up. Static: no WebGL, no animation.
 */
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
    activeMutation.error != null && !isApiError(activeMutation.error, "EMAIL_NOT_VERIFIED") ? activeMutation.error : null;

  const switchMode = () => {
    const next: AuthMode = isRegister ? "login" : "register";
    setMode(next);
    setFieldErrors({});
    loginMutation.reset();
    registerMutation.reset();
    // The address follows the mode without reloading the page (the typed email stays).
    window.history.replaceState(window.history.state, "", `${COPY[next].path}${window.location.search}`);
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


  return (
    <div className={`${landingFontVariables} flex min-h-screen flex-col bg-[#F5F6F4] font-landing-body text-landing-ink antialiased`}>
      <header className="flex h-16 shrink-0 items-center px-5 lg:px-8">
        <LandingLogo />
      </header>

      {/* Bottom padding below md clears the floating mobile navigation bar. */}
      <main className="flex flex-1 px-4 pb-24 md:pb-6 lg:px-8">
        {/* Sign in: sheet on the left, form on the right (as in the reference); sign up: the other way round. */}
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-6 lg:h-[calc(100vh-5.5rem)] lg:min-h-[640px] lg:grid-cols-2">
          <section
            aria-label="Bản vẽ kỹ thuật một chiếc hộp WrapFit"
            className={cn("hidden min-h-0 flex-col overflow-hidden rounded-[28px] border border-landing-line bg-[#F4F6F1] lg:flex", isRegister && "lg:order-2")}
          >
            <PackagingSpecSheet className="min-h-0 w-full flex-1 px-4 pt-4" />
            <div className="border-t border-landing-line/70 bg-white/60 px-7 py-5">
              <p className="font-landing-heading text-lg font-semibold text-landing-ink">
                {isRegister ? "Bản vẽ đầu tiên của bạn đang chờ." : "Hồ sơ hộp của bạn vẫn ở đây."}
              </p>
              <p className="mt-1 text-sm leading-6 text-landing-muted">
                {isRegister
                  ? "Nhập kích thước món quà, WrapFit dựng khuôn bế, kiểm tra FitCheck™ và cho bạn xem hộp 3D."
                  : "Dự án, phiên bản và file in đều được lưu, sẵn sàng để bạn mở lại."}
              </p>
            </div>
          </section>

          <section aria-labelledby="auth-title" className="flex min-w-0 items-center justify-center">
            <div className="w-full max-w-[440px] py-8">
              <h1 id="auth-title" className="font-landing-heading text-4xl font-bold tracking-tight sm:text-5xl">
                {copy.title}
              </h1>

              {status === "authenticated" ? (
                <div role="status" className="mt-8 flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm text-landing-muted ring-1 ring-landing-ink/10">
                  <span aria-hidden className="size-4 shrink-0 animate-spin rounded-full border-2 border-landing-line border-t-landing-green motion-reduce:animate-none" />
                  Bạn đã đăng nhập. Đang mở không gian làm việc…
                </div>
              ) : (
                <>
                  {!submitted && (googleError || notice) && (
                    <div className="mt-6 space-y-2.5">
                      {googleError && <FormAlert tone="error">{googleError}</FormAlert>}
                      {notice && <FormAlert tone="success">{notice}</FormAlert>}
                    </div>
                  )}

                  <p className="mt-6 text-base font-medium">Tiếp tục nhanh</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={signInWithGoogle}
                      disabled={leavingForGoogle}
                      aria-busy={leavingForGoogle || undefined}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-landing-line bg-white text-base font-medium transition-colors hover:bg-landing-tile/50 disabled:cursor-wait disabled:opacity-70"
                    >
                      <GoogleIcon />
                      {leavingForGoogle ? "Đang mở…" : "Google"}
                    </button>
                    <Link
                      href={ROUTES.editorDemo}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-landing-line bg-white text-base font-medium transition-colors hover:bg-landing-tile/50"
                    >
                      <PlayCircle className="size-5 text-landing-green" aria-hidden />
                      Dùng thử
                    </Link>
                  </div>

                  <div className="relative my-6 flex items-center" aria-hidden>
                    <span className="h-px flex-1 bg-landing-line" />
                    <span className="px-4 text-xs text-landing-muted">Hoặc</span>
                    <span className="h-px flex-1 bg-landing-line" />
                  </div>

                  <form className="space-y-3" onSubmit={onSubmit} aria-labelledby="auth-title" noValidate>
                    <p className="text-base font-medium">{isRegister ? "Đăng ký bằng email" : "Hoặc tiếp tục với email"}</p>
                    {isRegister && (
                      <Field
                        id={FIELD_IDS.fullName}
                        icon={<User className="size-5" aria-hidden />}
                        label="Họ và tên (không bắt buộc)"
                        error={fieldErrors.fullName}
                        inputProps={{
                          name: "name",
                          autoComplete: "name",
                          maxLength: FULL_NAME_MAX_LENGTH,
                          value: fullName,
                          onChange: updateField("fullName", setFullName),
                        }}
                      />
                    )}
                    <Field
                      id={FIELD_IDS.email}
                      icon={<Mail className="size-5" aria-hidden />}
                      label="Địa chỉ email"
                      error={fieldErrors.email}
                      inputProps={{
                        name: "email",
                        type: "email",
                        autoComplete: "email",
                        inputMode: "email",
                        required: true,
                        value: email,
                        onChange: updateField("email", setEmail),
                      }}
                    />
                    <Field
                      id={FIELD_IDS.password}
                      icon={<KeyRound className="size-5" aria-hidden />}
                      label="Mật khẩu"
                      error={fieldErrors.password}
                      hint={isRegister ? PASSWORD_HINT : undefined}
                      inputProps={{
                        name: "password",
                        type: showPassword ? "text" : "password",
                        autoComplete: isRegister ? "new-password" : "current-password",
                        maxLength: isRegister ? PASSWORD_MAX_LENGTH : undefined,
                        required: true,
                        value: password,
                        onChange: updateField("password", setPassword),
                      }}
                      trailing={
                        <button
                          type="button"
                          aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          aria-pressed={showPassword}
                          aria-controls={FIELD_IDS.password}
                          onClick={() => setShowPassword((visible) => !visible)}
                          className="flex size-11 items-center justify-center rounded-lg text-landing-muted hover:text-landing-ink"
                        >
                          {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                        </button>
                      }
                    />
                    {!isRegister && (
                      <div className="flex justify-end">
                        <Link href={withEmail(ROUTES.forgotPassword, email)} className="py-1 text-sm font-medium text-landing-green-deep hover:underline">
                          Quên mật khẩu?
                        </Link>
                      </div>
                    )}
                    {formError != null && <ApiErrorAlert error={formError} />}
                    <button
                      type="submit"
                      disabled={busy}
                      aria-busy={busy || undefined}
                      className="!mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-landing-lime text-base font-semibold text-landing-green-night transition-colors hover:bg-[#AFEC88] disabled:cursor-wait disabled:opacity-70"
                    >
                      {busy && (
                        <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-landing-green-night/30 border-t-landing-green-night motion-reduce:animate-none" />
                      )}
                      {busy ? copy.busy : copy.submit}
                    </button>
                  </form>

                  <p className="mt-5 text-center text-sm text-landing-muted">
                    {copy.switchLabel}{" "}
                    <button type="button" onClick={switchMode} className="py-2 font-semibold text-landing-ink hover:underline">
                      {copy.switchAction}
                    </button>
                  </p>
                  {isRegister && (
                    <p className="mt-2 text-center text-xs leading-5 text-landing-muted">
                      Sau khi đăng ký, WrapFit gửi một liên kết xác nhận vào email của bạn.
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({
  id,
  icon,
  label,
  error,
  hint,
  inputProps,
  trailing,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  error?: string;
  hint?: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  trailing?: React.ReactNode;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          "flex h-12 items-center rounded-lg bg-[#EBEDEF] pl-4 ring-1 ring-transparent transition-shadow focus-within:bg-white focus-within:ring-landing-green/60",
          error && "ring-red-400"
        )}
      >
        <span className="shrink-0 text-landing-muted">{icon}</span>
        <input
          id={id}
          placeholder={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-landing-ink outline-none placeholder:text-landing-muted"
          {...inputProps}
        />
        {trailing}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 px-1 text-xs text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 px-1 text-xs text-landing-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z" fill="#EA4335" />
      <path d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z" fill="#4285F4" />
      <path d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z" fill="#FBBC05" />
      <path d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 15.9C3.5 19.7 7.4 23 12 23z" fill="#34A853" />
    </svg>
  );
}
