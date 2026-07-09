-- Keep Booking.activeSlotKey aligned with the booking's current slot.
-- Older admin reschedules moved bookingDate/timeSlot/barberId without moving activeSlotKey,
-- leaving the previous slot blocked by the unique active-slot key.

UPDATE `Booking`
SET `activeSlotKey` = CASE
    WHEN `status` IN ('pending', 'confirmed')
        THEN CONCAT(`barberId`, ':', DATE_FORMAT(`bookingDate`, '%Y-%m-%d'), ':', `timeSlot`)
    ELSE NULL
END;
