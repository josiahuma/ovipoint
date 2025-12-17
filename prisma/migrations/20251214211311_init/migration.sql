-- DropIndex
DROP INDEX `Booking_eventDateId_fkey` ON `booking`;

-- DropIndex
DROP INDEX `Booking_pickupEventId_fkey` ON `booking`;

-- DropIndex
DROP INDEX `PickupEvent_churchId_fkey` ON `pickupevent`;

-- DropIndex
DROP INDEX `PickupEventDate_templateId_fkey` ON `pickupeventdate`;

-- DropIndex
DROP INDEX `PickupEventTemplate_churchId_fkey` ON `pickupeventtemplate`;

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
