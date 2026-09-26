-- CreateTable
CREATE TABLE "ChatPolicy" (
    "chatId" TEXT NOT NULL,
    "sendMessages" BOOLEAN NOT NULL DEFAULT true,
    "sendMedia" BOOLEAN NOT NULL DEFAULT true,
    "sendStickers" BOOLEAN NOT NULL DEFAULT true,
    "sendPolls" BOOLEAN NOT NULL DEFAULT true,
    "embedLinks" BOOLEAN NOT NULL DEFAULT true,
    "addMembers" BOOLEAN NOT NULL DEFAULT true,
    "pinMessages" BOOLEAN NOT NULL DEFAULT false,
    "changeInfo" BOOLEAN NOT NULL DEFAULT false,
    "slowModeSeconds" INTEGER NOT NULL DEFAULT 0,
    "reactions" BOOLEAN NOT NULL DEFAULT true,
    "signMessages" BOOLEAN NOT NULL DEFAULT false,
    "protectedContent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChatPolicy_pkey" PRIMARY KEY ("chatId")
);

-- CreateTable
CREATE TABLE "ChatInvite" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "notifyPrivate" BOOLEAN NOT NULL DEFAULT true,
    "notifyGroups" BOOLEAN NOT NULL DEFAULT true,
    "notifyChannels" BOOLEAN NOT NULL DEFAULT true,
    "notifyPreview" BOOLEAN NOT NULL DEFAULT true,
    "notifySound" BOOLEAN NOT NULL DEFAULT true,
    "textSize" INTEGER NOT NULL DEFAULT 14,
    "density" TEXT NOT NULL DEFAULT 'comfortable',
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "autoDownloadWifi" BOOLEAN NOT NULL DEFAULT true,
    "autoDownloadMobile" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatInvite_code_key" ON "ChatInvite"("code");

-- CreateIndex
CREATE INDEX "ChatInvite_chatId_idx" ON "ChatInvite"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_chatId_userId_key" ON "JoinRequest"("chatId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Draft_chatId_userId_key" ON "Draft"("chatId", "userId");

-- AddForeignKey
ALTER TABLE "ChatPolicy" ADD CONSTRAINT "ChatPolicy_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatInvite" ADD CONSTRAINT "ChatInvite_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
