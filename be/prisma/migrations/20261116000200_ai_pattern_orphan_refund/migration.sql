-- Hoàn xu các lần trừ AI_PATTERN không có kết quả sau 10 phút (AiPatternService.refundOrphanedDebits, chạy 5 phút/lần):
-- tìm lần trừ theo (reason, created_at), rồi kiểm ai_generations theo debit_operation_id.
CREATE INDEX "ai_generations_debit_operation_id_idx" ON "ai_generations"("debit_operation_id");

CREATE INDEX "credit_debits_reason_created_at_idx" ON "credit_debits"("reason", "created_at");
