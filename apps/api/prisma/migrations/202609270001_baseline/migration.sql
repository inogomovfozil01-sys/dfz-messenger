-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('DIRECT', 'GROUP', 'CHANNEL', 'SAVED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'FILE', 'SYSTEM', 'POLL', 'STICKER', 'VIDEO_NOTE', 'GIFT', 'STARS_TRANSFER');

-- CreateEnum
CREATE TYPE "StarTransactionType" AS ENUM ('ACTIVITY_REWARD', 'ADMIN_GRANT', 'ADMIN_DEBIT', 'GIFT_PURCHASE', 'TRANSFER_IN', 'TRANSFER_OUT', 'REFUND', 'SYSTEM_REWARD', 'PREMIUM_REWARD', 'PREMIUM_PURCHASE');

-- CreateEnum
CREATE TYPE "GiftRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

-- CreateEnum
CREATE TYPE "StoryMediaType" AS ENUM ('IMAGE', 'VIDEO', 'TEXT');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('AUDIO', 'VIDEO');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'CONNECTED', 'ENDED', 'REJECTED', 'MISSED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'SCAM', 'ILLEGAL_CONTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PrivacyVisibility" AS ENUM ('EVERYONE', 'CONTACTS', 'NOBODY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedReason" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumUntil" TIMESTAMP(3),
    "premiumType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "twoFactorSecret" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastSeenVisibility" "PrivacyVisibility" NOT NULL DEFAULT 'EVERYONE',
    "messageVisibility" "PrivacyVisibility" NOT NULL DEFAULT 'EVERYONE',
    "callVisibility" "PrivacyVisibility" NOT NULL DEFAULT 'EVERYONE',
    "groupAddVisibility" "PrivacyVisibility" NOT NULL DEFAULT 'EVERYONE',
    "photoVisibility" "PrivacyVisibility" NOT NULL DEFAULT 'EVERYONE',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "language" TEXT NOT NULL DEFAULT 'ru',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceName" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactUserId" TEXT NOT NULL,
    "nickname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "type" "ChatType" NOT NULL DEFAULT 'DIRECT',
    "title" TEXT,
    "description" TEXT,
    "avatarUrl" TEXT,
    "ownerId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isForum" BOOLEAN NOT NULL DEFAULT false,
    "inviteCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMember" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "permissions" JSONB,
    "customTitle" TEXT,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "mutedUntil" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "clearedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "topicId" TEXT,
    "replyToId" TEXT,
    "forwardedFromId" TEXT,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReceipt" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'DELIVERED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "duration" INTEGER,
    "waveform" JSONB,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "storageKey" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("storageKey")
);

-- CreateTable
CREATE TABLE "PinnedMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "pinnedById" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinnedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "receiverId" TEXT,
    "type" "CallType" NOT NULL DEFAULT 'AUDIO',
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "comment" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "filterType" TEXT NOT NULL,
    "chatIds" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" "StoryMediaType" NOT NULL DEFAULT 'IMAGE',
    "caption" TEXT,
    "textOverlay" JSONB,
    "privacy" "PrivacyVisibility" NOT NULL DEFAULT 'EVERYONE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryView" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryReaction" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "creatorId" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StickerPack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StickerPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sticker" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sticker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "isUnlimited" BOOLEAN NOT NULL DEFAULT false,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StarAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StarTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "reason" TEXT,
    "createdByAdminId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StarTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityRewardState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "continuousActiveSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRewardAt" TIMESTAMP(3),
    "nextRewardAt" TIMESTAMP(3),
    "lastClientFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityRewardState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "artwork" TEXT NOT NULL,
    "priceStars" INTEGER NOT NULL,
    "rarity" "GiftRarity" NOT NULL DEFAULT 'COMMON',
    "isLimited" BOOLEAN NOT NULL DEFAULT false,
    "totalSupply" INTEGER,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "availableFrom" TIMESTAMP(3),
    "availableUntil" TIMESTAMP(3),
    "isPremiumOnly" BOOLEAN NOT NULL DEFAULT false,
    "isCollectibleEligible" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL DEFAULT 'popular',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftInstance" (
    "id" TEXT NOT NULL,
    "giftDefinitionId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "senderId" TEXT,
    "message" TEXT,
    "serialNumber" INTEGER,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "showOnProfile" BOOLEAN NOT NULL DEFAULT true,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectibleInstance" (
    "id" TEXT NOT NULL,
    "uniqueNumber" INTEGER NOT NULL,
    "editionName" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "modelPattern" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "rarity" "GiftRarity" NOT NULL DEFAULT 'RARE',
    "totalSupply" INTEGER NOT NULL DEFAULT 1000,
    "mintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "giftInstanceId" TEXT,
    "originalSenderId" TEXT,
    "currentOwnerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectibleInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectibleHistory" (
    "id" TEXT NOT NULL,
    "collectibleId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "priceStars" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectibleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomyCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starsPerUser" INTEGER NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "totalStars" INTEGER NOT NULL,
    "createdByAdmin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomyCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_userId_key" ON "Credential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_tokenHash_idx" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Contact_userId_idx" ON "Contact"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_userId_contactUserId_key" ON "Contact"("userId", "contactUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Chat_inviteCode_key" ON "Chat"("inviteCode");

-- CreateIndex
CREATE INDEX "Chat_type_idx" ON "Chat"("type");

-- CreateIndex
CREATE INDEX "Chat_ownerId_idx" ON "Chat"("ownerId");

-- CreateIndex
CREATE INDEX "Chat_inviteCode_idx" ON "Chat"("inviteCode");

-- CreateIndex
CREATE INDEX "ChatMember_userId_idx" ON "ChatMember"("userId");

-- CreateIndex
CREATE INDEX "ChatMember_chatId_idx" ON "ChatMember"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMember_chatId_userId_key" ON "ChatMember"("chatId", "userId");

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_chatId_id_idx" ON "Message"("chatId", "id");

-- CreateIndex
CREATE INDEX "Message_topicId_idx" ON "Message"("topicId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_idempotencyKey_idx" ON "Message"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MessageReceipt_userId_idx" ON "MessageReceipt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReceipt_messageId_userId_key" ON "MessageReceipt"("messageId", "userId");

-- CreateIndex
CREATE INDEX "Reaction_messageId_idx" ON "Reaction"("messageId");

-- CreateIndex
CREATE INDEX "Reaction_userId_idx" ON "Reaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_messageId_userId_emoji_key" ON "Reaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "Attachment_messageId_idx" ON "Attachment"("messageId");

-- CreateIndex
CREATE INDEX "Upload_ownerId_idx" ON "Upload"("ownerId");

-- CreateIndex
CREATE INDEX "PinnedMessage_chatId_idx" ON "PinnedMessage"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "PinnedMessage_chatId_messageId_key" ON "PinnedMessage"("chatId", "messageId");

-- CreateIndex
CREATE INDEX "Block_blockerId_idx" ON "Block"("blockerId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "Call_chatId_idx" ON "Call"("chatId");

-- CreateIndex
CREATE INDEX "Call_callerId_idx" ON "Call"("callerId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChatFolder_userId_idx" ON "ChatFolder"("userId");

-- CreateIndex
CREATE INDEX "Story_authorId_idx" ON "Story"("authorId");

-- CreateIndex
CREATE INDEX "Story_expiresAt_idx" ON "Story"("expiresAt");

-- CreateIndex
CREATE INDEX "Story_createdAt_idx" ON "Story"("createdAt");

-- CreateIndex
CREATE INDEX "StoryView_storyId_idx" ON "StoryView"("storyId");

-- CreateIndex
CREATE INDEX "StoryView_viewerId_idx" ON "StoryView"("viewerId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryView_storyId_viewerId_key" ON "StoryView"("storyId", "viewerId");

-- CreateIndex
CREATE INDEX "StoryReaction_storyId_idx" ON "StoryReaction"("storyId");

-- CreateIndex
CREATE INDEX "StoryReaction_userId_idx" ON "StoryReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryReaction_storyId_userId_emoji_key" ON "StoryReaction"("storyId", "userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "Poll_messageId_key" ON "Poll"("messageId");

-- CreateIndex
CREATE INDEX "Poll_chatId_idx" ON "Poll"("chatId");

-- CreateIndex
CREATE INDEX "PollOption_pollId_idx" ON "PollOption"("pollId");

-- CreateIndex
CREATE INDEX "PollVote_pollId_idx" ON "PollVote"("pollId");

-- CreateIndex
CREATE INDEX "PollVote_userId_idx" ON "PollVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_optionId_userId_key" ON "PollVote"("pollId", "optionId", "userId");

-- CreateIndex
CREATE INDEX "Topic_chatId_idx" ON "Topic"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "StickerPack_name_key" ON "StickerPack"("name");

-- CreateIndex
CREATE INDEX "Sticker_packId_idx" ON "Sticker"("packId");

-- CreateIndex
CREATE UNIQUE INDEX "StarAccount_userId_key" ON "StarAccount"("userId");

-- CreateIndex
CREATE INDEX "StarAccount_userId_idx" ON "StarAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StarTransaction_idempotencyKey_key" ON "StarTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StarTransaction_userId_createdAt_idx" ON "StarTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StarTransaction_accountId_idx" ON "StarTransaction"("accountId");

-- CreateIndex
CREATE INDEX "StarTransaction_type_idx" ON "StarTransaction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRewardState_userId_key" ON "ActivityRewardState"("userId");

-- CreateIndex
CREATE INDEX "ActivityRewardState_userId_idx" ON "ActivityRewardState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftDefinition_slug_key" ON "GiftDefinition"("slug");

-- CreateIndex
CREATE INDEX "GiftDefinition_category_idx" ON "GiftDefinition"("category");

-- CreateIndex
CREATE INDEX "GiftDefinition_isActive_idx" ON "GiftDefinition"("isActive");

-- CreateIndex
CREATE INDEX "GiftInstance_ownerId_idx" ON "GiftInstance"("ownerId");

-- CreateIndex
CREATE INDEX "GiftInstance_giftDefinitionId_idx" ON "GiftInstance"("giftDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectibleInstance_giftInstanceId_key" ON "CollectibleInstance"("giftInstanceId");

-- CreateIndex
CREATE INDEX "CollectibleInstance_currentOwnerId_idx" ON "CollectibleInstance"("currentOwnerId");

-- CreateIndex
CREATE INDEX "CollectibleHistory_collectibleId_idx" ON "CollectibleHistory"("collectibleId");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permission_key" ON "UserPermission"("userId", "permission");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_contactUserId_fkey" FOREIGN KEY ("contactUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_forwardedFromId_fkey" FOREIGN KEY ("forwardedFromId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReceipt" ADD CONSTRAINT "MessageReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReceipt" ADD CONSTRAINT "MessageReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatFolder" ADD CONSTRAINT "ChatFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReaction" ADD CONSTRAINT "StoryReaction_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReaction" ADD CONSTRAINT "StoryReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_packId_fkey" FOREIGN KEY ("packId") REFERENCES "StickerPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarAccount" ADD CONSTRAINT "StarAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarTransaction" ADD CONSTRAINT "StarTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StarAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarTransaction" ADD CONSTRAINT "StarTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRewardState" ADD CONSTRAINT "ActivityRewardState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftInstance" ADD CONSTRAINT "GiftInstance_giftDefinitionId_fkey" FOREIGN KEY ("giftDefinitionId") REFERENCES "GiftDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftInstance" ADD CONSTRAINT "GiftInstance_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftInstance" ADD CONSTRAINT "GiftInstance_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleInstance" ADD CONSTRAINT "CollectibleInstance_giftInstanceId_fkey" FOREIGN KEY ("giftInstanceId") REFERENCES "GiftInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleInstance" ADD CONSTRAINT "CollectibleInstance_originalSenderId_fkey" FOREIGN KEY ("originalSenderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleInstance" ADD CONSTRAINT "CollectibleInstance_currentOwnerId_fkey" FOREIGN KEY ("currentOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleHistory" ADD CONSTRAINT "CollectibleHistory_collectibleId_fkey" FOREIGN KEY ("collectibleId") REFERENCES "CollectibleInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
