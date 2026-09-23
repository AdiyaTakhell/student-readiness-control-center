-- AlterTable
ALTER TABLE "outbox_events" ALTER COLUMN "studentId" DROP NOT NULL,
ALTER COLUMN "attemptId" DROP NOT NULL;
