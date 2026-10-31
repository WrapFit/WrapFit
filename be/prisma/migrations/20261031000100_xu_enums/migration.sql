-- Xu Wrap (docs/19): the enum values come first, in a migration of their own. PostgreSQL refuses a value added by
-- ALTER TYPE ... ADD VALUE inside the transaction that added it, and the CHECK constraints of the next migration use them.
ALTER TYPE "PaymentPurpose" ADD VALUE 'XU_500';
ALTER TYPE "PaymentPurpose" ADD VALUE 'XU_1050';
ALTER TYPE "PaymentPurpose" ADD VALUE 'XU_2200';
ALTER TYPE "CreditKind" ADD VALUE 'XU';
ALTER TYPE "CreditSource" ADD VALUE 'PLAN_ALLOWANCE';
ALTER TYPE "CreditDebitReason" ADD VALUE 'AI_IMAGE';
ALTER TYPE "CreditDebitReason" ADD VALUE 'AI_PATTERN';
ALTER TYPE "CreditDebitReason" ADD VALUE 'AI_TOOL';
