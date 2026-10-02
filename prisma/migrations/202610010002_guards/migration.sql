ALTER TABLE "EconomyAccount" ADD CONSTRAINT "nonnegative_balance" CHECK (balance >= 0);
CREATE UNIQUE INDEX "one_active_priority_per_session" ON "PriorityRequest" ("sessionId") WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX "one_pending_appeal_per_case" ON "Appeal" ("moderationId") WHERE status IN ('PENDING', 'UNDER_REVIEW');
CREATE FUNCTION prevent_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'History records are immutable';
END;
$$;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION prevent_history_mutation();
CREATE TRIGGER immutable_appeal_history BEFORE UPDATE OR DELETE ON "AppealAction" FOR EACH ROW EXECUTE FUNCTION prevent_history_mutation();
CREATE TRIGGER immutable_application_review BEFORE UPDATE OR DELETE ON "ApplicationReview" FOR EACH ROW EXECUTE FUNCTION prevent_history_mutation();
CREATE TRIGGER immutable_economy_ledger BEFORE UPDATE OR DELETE ON "EconomyTransaction" FOR EACH ROW EXECUTE FUNCTION prevent_history_mutation();
