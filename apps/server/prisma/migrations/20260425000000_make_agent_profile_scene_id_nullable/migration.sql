-- Make scene_id nullable in agent_profiles to allow base profiles without a scene

-- First, fix any existing rows with empty-string scene_id (which violate FK) by setting them to NULL
UPDATE "agent_profiles" SET "scene_id" = NULL WHERE "scene_id" = '';

-- Make the column nullable
ALTER TABLE "agent_profiles" ALTER COLUMN "scene_id" DROP NOT NULL;

-- Drop existing foreign key constraint
ALTER TABLE "agent_profiles" DROP CONSTRAINT IF EXISTS "agent_profiles_scene_id_fkey";

-- Re-add foreign key constraint allowing NULL scene_id
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_scene_id_fkey"
  FOREIGN KEY ("scene_id") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
