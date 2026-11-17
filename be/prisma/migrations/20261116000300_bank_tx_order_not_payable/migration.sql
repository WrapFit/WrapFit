-- docs/25 item 2: a transfer whose payment is for a sample order that no longer waits for payment (cancelled, or paid
-- by another payment) is stored UNMATCHED with its own reason, so an admin sees money arrived for it and refunds it.
ALTER TYPE "BankTxUnmatchedReason" ADD VALUE 'ORDER_NOT_PAYABLE';
