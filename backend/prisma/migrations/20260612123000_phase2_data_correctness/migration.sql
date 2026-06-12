-- Phase 2 data correctness migration.
-- Convert financial floats to fixed precision decimals and enforce one transaction per booking link.

ALTER TABLE `Service`
    MODIFY `price` DECIMAL(12, 2) NOT NULL,
    MODIFY `commissionValue` DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE `CashShift`
    MODIFY `startCash` DECIMAL(12, 2) NOT NULL,
    MODIFY `actualEndCash` DECIMAL(12, 2) NULL DEFAULT 0,
    MODIFY `totalRevenue` DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE `Transaction`
    MODIFY `totalAmount` DECIMAL(12, 2) NOT NULL;

ALTER TABLE `Expense`
    MODIFY `amount` DECIMAL(12, 2) NOT NULL;

ALTER TABLE `Payroll`
    MODIFY `totalCommission` DECIMAL(12, 2) NOT NULL,
    MODIFY `baseSalary` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `bonuses` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `deductions` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `totalPayout` DECIMAL(12, 2) NOT NULL;

ALTER TABLE `Booking`
    MODIFY `servicePrice` DECIMAL(12, 2) NULL,
    ADD COLUMN `activeSlotKey` VARCHAR(191) NULL;

UPDATE `Booking`
SET `activeSlotKey` = CONCAT(`barberId`, ':', DATE_FORMAT(`bookingDate`, '%Y-%m-%d'), ':', `timeSlot`)
WHERE `status` IN ('pending', 'confirmed');

ALTER TABLE `Capital`
    MODIFY `amount` DECIMAL(12, 2) NOT NULL;

CREATE UNIQUE INDEX `Booking_transactionId_key` ON `Booking`(`transactionId`);
CREATE UNIQUE INDEX `Booking_activeSlotKey_key` ON `Booking`(`activeSlotKey`);
