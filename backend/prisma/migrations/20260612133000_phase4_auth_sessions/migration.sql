-- Phase 4 auth/session hardening.
-- Adds user token versioning and DB-backed token revocation.

ALTER TABLE `User`
    ADD COLUMN `tokenVersion` INT NOT NULL DEFAULT 0;

CREATE TABLE `RevokedToken` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `tokenHash` VARCHAR(191) NOT NULL,
    `userId` INT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RevokedToken_tokenHash_key` (`tokenHash`),
    INDEX `RevokedToken_expiresAt_idx` (`expiresAt`),
    INDEX `RevokedToken_userId_idx` (`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
