-- Performance Indexes for ISSUE-INT002a
-- Composite indexes for common query patterns identified in API routes

-- Match queries: filter by demand_id + status, supply_id + status
CREATE INDEX IF NOT EXISTS "matches_demand_id_status_idx" ON "matches"("demand_id", "status");
CREATE INDEX IF NOT EXISTS "matches_supply_id_status_idx" ON "matches"("supply_id", "status");
CREATE INDEX IF NOT EXISTS "matches_score_idx" ON "matches"("score" DESC);

-- Demand pagination: status + created_at for listing open demands
CREATE INDEX IF NOT EXISTS "demands_status_created_at_idx" ON "demands"("status", "created_at" DESC);

-- Supply pagination: status + created_at for listing available supplies
CREATE INDEX IF NOT EXISTS "supplies_status_created_at_idx" ON "supplies"("status", "created_at" DESC);

-- Chat messages: room + time for message history pagination
CREATE INDEX IF NOT EXISTS "chat_messages_room_created_at_idx" ON "chat_messages"("chat_room_id", "created_at" DESC);

-- Notifications: user + status + created_at for notification list
CREATE INDEX IF NOT EXISTS "notifications_user_status_created_idx" ON "notifications"("user_id", "status", "created_at" DESC);

-- Points transactions: user + created_at for transaction history
CREATE INDEX IF NOT EXISTS "points_transactions_user_created_idx" ON "points_transactions"("user_id", "created_at" DESC);

-- Reviews: reviewee + status for public review listing
CREATE INDEX IF NOT EXISTS "reviews_reviewee_status_idx" ON "reviews"("reviewee_id", "status");

-- Connections: user + status for active connection lookup
CREATE INDEX IF NOT EXISTS "connections_user_status_idx" ON "connections"("user_id", "status");

-- Transactions: user + type + created_at for filtered transaction history
CREATE INDEX IF NOT EXISTS "transactions_user_type_created_idx" ON "transactions"("user_id", "type", "created_at" DESC);

-- Offers: status + validity date range for active offer queries
CREATE INDEX IF NOT EXISTS "offers_status_validity_idx" ON "offers"("status", "valid_from", "valid_until");
