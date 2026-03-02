/*
  Warnings:

  - The values [ADMIN,BASIC] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('admin', 'basic');
ALTER TABLE "public"."users" ALTER COLUMN "userRole" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "userRole" TYPE "UserRole_new" USING ("userRole"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "users" ALTER COLUMN "userRole" SET DEFAULT 'basic';
COMMIT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "userRole" SET DEFAULT 'basic';
