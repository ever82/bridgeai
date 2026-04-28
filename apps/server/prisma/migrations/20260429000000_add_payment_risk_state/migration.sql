-- CreateTable
CREATE TABLE "payment_risk_states" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_risk_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_risk_states_user_id_category_key" ON "payment_risk_states"("user_id", "category");

-- CreateIndex
CREATE INDEX "payment_risk_states_user_id_idx" ON "payment_risk_states"("user_id");

-- CreateIndex
CREATE INDEX "payment_risk_states_category_idx" ON "payment_risk_states"("category");

-- AddForeignKey
ALTER TABLE "payment_risk_states" ADD CONSTRAINT "payment_risk_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
