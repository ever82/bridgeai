-- CreateIndex
CREATE INDEX "agent_profiles_l2_data_idx" ON "agent_profiles" USING GIN ("l2_data");
