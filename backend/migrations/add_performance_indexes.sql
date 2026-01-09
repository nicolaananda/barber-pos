-- ⚡ Performance Optimization: Add Database Indexes
-- Migration: add_performance_indexes
-- Date: 2026-01-09

-- Booking table indexes
CREATE INDEX `Booking_barberId_bookingDate_status_idx` ON `Booking`(`barberId`, `bookingDate`, `status`);
CREATE INDEX `Booking_customerPhone_idx` ON `Booking`(`customerPhone`);
CREATE INDEX `Booking_status_bookingDate_idx` ON `Booking`(`status`, `bookingDate`);
CREATE INDEX `Booking_bookingDate_idx` ON `Booking`(`bookingDate`);

-- Transaction table indexes
CREATE INDEX `Transaction_barberId_date_idx` ON `Transaction`(`barberId`, `date`);
CREATE INDEX `Transaction_date_idx` ON `Transaction`(`date`);
CREATE INDEX `Transaction_customerPhone_idx` ON `Transaction`(`customerPhone`);

-- Customer table index
CREATE INDEX `Customer_lastVisit_idx` ON `Customer`(`lastVisit`);
