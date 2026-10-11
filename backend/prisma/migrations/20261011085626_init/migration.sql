-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(20) NOT NULL,
    `displayName` VARCHAR(20) NOT NULL,
    `passwordHash` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `avatarUrl` VARCHAR(255) NULL,
    `bio` VARCHAR(200) NULL,
    `college` VARCHAR(50) NULL,
    `grade` VARCHAR(20) NULL,
    `major` VARCHAR(50) NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'USER',
    `level` INTEGER NOT NULL DEFAULT 1,
    `exp` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `mutedUntil` DATETIME(3) NULL,
    `invitedByCodeId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_status_idx`(`status`),
    INDEX `User_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InviteCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(32) NOT NULL,
    `createdById` INTEGER NULL,
    `maxUses` INTEGER NOT NULL DEFAULT 1,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NULL,
    `disabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `InviteCode_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Board` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(20) NOT NULL,
    `slug` VARCHAR(30) NOT NULL,
    `description` VARCHAR(120) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    UNIQUE INDEX `Board_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(20) NOT NULL,
    `slug` VARCHAR(30) NOT NULL,
    `postCount` INTEGER NOT NULL DEFAULT 0,
    `isOfficial` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Tag_name_key`(`name`),
    UNIQUE INDEX `Tag_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TagSynonym` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tagId` INTEGER NOT NULL,
    `synonym` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `TagSynonym_tagId_synonym_key`(`tagId`, `synonym`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostTag` (
    `postId` INTEGER NOT NULL,
    `tagId` INTEGER NOT NULL,

    INDEX `PostTag_tagId_idx`(`tagId`),
    PRIMARY KEY (`postId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `boardId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,
    `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
    `title` VARCHAR(80) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `excerpt` VARCHAR(200) NULL,
    `courseId` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `likeCount` INTEGER NOT NULL DEFAULT 0,
    `commentCount` INTEGER NOT NULL DEFAULT 0,
    `bookmarkCount` INTEGER NOT NULL DEFAULT 0,
    `acceptedCommentId` INTEGER NULL,
    `lastActivityAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `editedAt` DATETIME(3) NULL,
    `editCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Post_acceptedCommentId_key`(`acceptedCommentId`),
    INDEX `Post_boardId_lastActivityAt_idx`(`boardId`, `lastActivityAt`),
    INDEX `Post_authorId_createdAt_idx`(`authorId`, `createdAt`),
    INDEX `Post_status_isPinned_lastActivityAt_idx`(`status`, `isPinned`, `lastActivityAt`),
    FULLTEXT INDEX `ft_posts`(`title`, `content`) WITH PARSER `ngram`,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostRevision` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `postId` INTEGER NOT NULL,
    `title` VARCHAR(80) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `editorId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PostRevision_postId_createdAt_idx`(`postId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `postId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,
    `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
    `parentId` INTEGER NULL,
    `replyToUserId` INTEGER NULL,
    `content` VARCHAR(2000) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    `likeCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    INDEX `Comment_postId_status_createdAt_idx`(`postId`, `status`, `createdAt`),
    INDEX `Comment_parentId_createdAt_idx`(`parentId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Like` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `targetType` VARCHAR(10) NOT NULL,
    `targetId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Like_targetType_targetId_idx`(`targetType`, `targetId`),
    UNIQUE INDEX `Like_userId_targetType_targetId_key`(`userId`, `targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookmarkFolder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(30) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BookmarkFolder_userId_order_idx`(`userId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bookmark` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `postId` INTEGER NOT NULL,
    `folderId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Bookmark_userId_folderId_idx`(`userId`, `folderId`),
    UNIQUE INDEX `Bookmark_userId_postId_folderId_key`(`userId`, `postId`, `folderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Follow` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `followerId` INTEGER NOT NULL,
    `followeeId` INTEGER NULL,
    `tagId` INTEGER NULL,
    `courseId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Follow_followeeId_idx`(`followeeId`),
    UNIQUE INDEX `Follow_followerId_followeeId_key`(`followerId`, `followeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `View` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `postId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `viewerHash` VARCHAR(64) NULL,
    `viewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `View_postId_userId_idx`(`postId`, `userId`),
    INDEX `View_postId_viewerHash_idx`(`postId`, `viewerHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipientId` INTEGER NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `payload` JSON NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_recipientId_isRead_createdAt_idx`(`recipientId`, `isRead`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reporterId` INTEGER NOT NULL,
    `targetType` VARCHAR(10) NOT NULL,
    `targetId` INTEGER NOT NULL,
    `reason` VARCHAR(30) NOT NULL,
    `detail` VARCHAR(500) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `handledById` INTEGER NULL,
    `handledAt` DATETIME(3) NULL,
    `handleNote` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Report_targetType_targetId_status_idx`(`targetType`, `targetId`, `status`),
    INDEX `Report_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Draft` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `boardId` INTEGER NULL,
    `title` VARCHAR(80) NULL,
    `content` LONGTEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Draft_userId_key`(`userId`),
    INDEX `Draft_userId_updatedAt_idx`(`userId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Course` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `department` VARCHAR(60) NULL,
    `teacher` VARCHAR(30) NULL,
    `ratingScore` DOUBLE NULL,
    `ratingCount` INTEGER NOT NULL DEFAULT 0,
    `workloadScore` DOUBLE NULL,
    `attendanceScore` DOUBLE NULL,
    `recommendScore` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Course_code_key`(`code`),
    INDEX `Course_department_idx`(`department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourseReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `courseId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `workload` INTEGER NOT NULL,
    `attendance` INTEGER NOT NULL,
    `recommend` INTEGER NOT NULL,
    `content` VARCHAR(2000) NULL,
    `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CourseReview_courseId_createdAt_idx`(`courseId`, `createdAt`),
    UNIQUE INDEX `CourseReview_courseId_userId_key`(`courseId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actorId` INTEGER NULL,
    `action` VARCHAR(40) NOT NULL,
    `targetType` VARCHAR(10) NULL,
    `targetId` INTEGER NULL,
    `meta` JSON NULL,
    `ip` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `AuditLog_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SensitiveWord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `word` VARCHAR(50) NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SensitiveWord_word_key`(`word`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Announcement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(60) NOT NULL,
    `content` TEXT NOT NULL,
    `type` VARCHAR(10) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Announcement_type_startsAt_endsAt_idx`(`type`, `startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_BoardModerators` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_BoardModerators_AB_unique`(`A`, `B`),
    INDEX `_BoardModerators_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_invitedByCodeId_fkey` FOREIGN KEY (`invitedByCodeId`) REFERENCES `InviteCode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InviteCode` ADD CONSTRAINT `InviteCode_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagSynonym` ADD CONSTRAINT `TagSynonym_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTag` ADD CONSTRAINT `PostTag_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTag` ADD CONSTRAINT `PostTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `Board`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_acceptedCommentId_fkey` FOREIGN KEY (`acceptedCommentId`) REFERENCES `Comment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostRevision` ADD CONSTRAINT `PostRevision_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostRevision` ADD CONSTRAINT `PostRevision_editorId_fkey` FOREIGN KEY (`editorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Comment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_replyToUserId_fkey` FOREIGN KEY (`replyToUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Like` ADD CONSTRAINT `Like_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookmarkFolder` ADD CONSTRAINT `BookmarkFolder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `BookmarkFolder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Follow` ADD CONSTRAINT `Follow_followerId_fkey` FOREIGN KEY (`followerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Follow` ADD CONSTRAINT `Follow_followeeId_fkey` FOREIGN KEY (`followeeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Follow` ADD CONSTRAINT `Follow_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Follow` ADD CONSTRAINT `Follow_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `View` ADD CONSTRAINT `View_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_handledById_fkey` FOREIGN KEY (`handledById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Draft` ADD CONSTRAINT `Draft_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseReview` ADD CONSTRAINT `CourseReview_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseReview` ADD CONSTRAINT `CourseReview_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Announcement` ADD CONSTRAINT `Announcement_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BoardModerators` ADD CONSTRAINT `_BoardModerators_A_fkey` FOREIGN KEY (`A`) REFERENCES `Board`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BoardModerators` ADD CONSTRAINT `_BoardModerators_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
