-- Migration: add_reschedule_fields
-- Date: 2026-03-05
-- Description: Add reschedule tracking columns to Booking table

ALTER TABLE `Booking`
  ADD COLUMN `rescheduledFrom`      DATETIME     NULL,
  ADD COLUMN `rescheduledFromSlot`  VARCHAR(191) NULL,
  ADD COLUMN `rescheduledAt`        DATETIME     NULL,
  ADD COLUMN `rescheduledByAdminId` INT          NULL,
  ADD COLUMN `rescheduleCount`      INT          NOT NULL DEFAULT 0;
