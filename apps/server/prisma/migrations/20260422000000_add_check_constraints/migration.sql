-- Add CHECK constraints for data integrity

-- NP-PT-001: creditScore must be between 0 and 100
ALTER TABLE "agents" ADD CONSTRAINT "agents_credit_score_check" CHECK ("credit_score" >= 0 AND "credit_score" <= 100);

-- NP-PT-002: match score must be between 0 and 100
ALTER TABLE "matches" ADD CONSTRAINT "matches_score_check" CHECK ("score" >= 0 AND "score" <= 100);
