-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "priority" TEXT DEFAULT 'Standard';
