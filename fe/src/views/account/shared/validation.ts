/**
 * Client-side checks of the account forms, mirroring the backend DTOs (`be/src/auth/dto/register.dto.ts`) so the
 * user gets a Vietnamese message before the request instead of the server's English validation text.
 */

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt only reads the first 72 bytes: the backend refuses longer passwords. */
export const PASSWORD_MAX_LENGTH = 72;
export const FULL_NAME_MAX_LENGTH = 100;

export const PASSWORD_HINT = "8–72 ký tự, có ít nhất một chữ cái không dấu (a–z) và một chữ số.";

// Loose on purpose: the browser (`type="email"`) and the backend (`@IsEmail`) do the strict check.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(email: string): string | undefined {
  const value = email.trim();
  if (!value) return "Vui lòng nhập email.";
  if (!EMAIL_PATTERN.test(value)) return "Email chưa đúng định dạng, ví dụ ten@shop.vn.";
  return undefined;
}

/** Same policy as the backend: 8–72 characters, at least one ASCII letter and one digit. */
export function passwordError(password: string): string | undefined {
  if (!password) return "Vui lòng nhập mật khẩu.";
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return `Mật khẩu cần từ ${PASSWORD_MIN_LENGTH} đến ${PASSWORD_MAX_LENGTH} ký tự.`;
  }
  // The backend tests [A-Za-z]: a letter with diacritics alone does not count.
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Mật khẩu cần có ít nhất một chữ cái không dấu (a–z) và một chữ số.";
  }
  return undefined;
}

export function fullNameError(fullName: string): string | undefined {
  if (fullName.trim().length > FULL_NAME_MAX_LENGTH) return `Họ tên tối đa ${FULL_NAME_MAX_LENGTH} ký tự.`;
  return undefined;
}

/** Link tokens are 20–128 characters (`OneTimeTokenDto`); anything else cannot be valid, no need to ask the API. */
export function isPlausibleToken(token: string): boolean {
  return token.length >= 20 && token.length <= 128;
}
