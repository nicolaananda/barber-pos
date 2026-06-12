CREATE TABLE `BookingConfig` (
    `id` INT NOT NULL DEFAULT 1,
    `blackoutEnabled` BOOLEAN NOT NULL DEFAULT false,
    `blackoutStart` DATE NULL,
    `blackoutEnd` DATE NULL,
    `blackoutMessage` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `BookingConfig` (`id`, `blackoutEnabled`, `blackoutStart`, `blackoutEnd`, `blackoutMessage`, `updatedAt`)
VALUES (1, false, NULL, NULL, NULL, NOW(3))
ON DUPLICATE KEY UPDATE `id` = `id`;
