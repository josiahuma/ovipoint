-- CreateTable
CREATE TABLE `Church` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `smsContactPhone` VARCHAR(191) NULL,
    `adminEmail` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NULL,

    UNIQUE INDEX `Church_slug_key`(`slug`),
    UNIQUE INDEX `Church_adminEmail_key`(`adminEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PickupEventTemplate` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `churchId` BIGINT NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `pickupStartTime` TIME(0) NOT NULL,
    `pickupEndTime` TIME(0) NOT NULL,
    `intervalMinutes` INTEGER NOT NULL,
    `capacity` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `slug` VARCHAR(191) NULL,

    UNIQUE INDEX `PickupEventTemplate_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PickupEventDate` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `templateId` BIGINT NOT NULL,
    `pickupDate` DATE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PickupEvent` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `pickupDate` DATE NOT NULL,
    `capacity` INTEGER NOT NULL DEFAULT 0,
    `pickupStartTime` TIME(0) NOT NULL,
    `pickupEndTime` TIME(0) NOT NULL,
    `intervalMinutes` INTEGER NOT NULL DEFAULT 15,
    `insertedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `churchId` BIGINT NOT NULL,
    `bookingsOpen` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `pickupEventId` BIGINT NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `pickupTime` TIME(0) NOT NULL,
    `insertedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `eventDateId` BIGINT NULL,
    `partySize` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PickupEventTemplate` ADD CONSTRAINT `PickupEventTemplate_churchId_fkey` FOREIGN KEY (`churchId`) REFERENCES `Church`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickupEventDate` ADD CONSTRAINT `PickupEventDate_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `PickupEventTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickupEvent` ADD CONSTRAINT `PickupEvent_churchId_fkey` FOREIGN KEY (`churchId`) REFERENCES `Church`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_pickupEventId_fkey` FOREIGN KEY (`pickupEventId`) REFERENCES `PickupEvent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_eventDateId_fkey` FOREIGN KEY (`eventDateId`) REFERENCES `PickupEventDate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
