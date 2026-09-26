// Core Enums
export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
  SUPER_ADMIN = 'SUPERADMIN',
}

export enum UserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
}

export enum ChatType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  CHANNEL = 'CHANNEL',
  SAVED = 'SAVED',
}

export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  VOICE = 'VOICE',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',
  POLL = 'POLL',
  STICKER = 'STICKER',
  VIDEO_NOTE = 'VIDEO_NOTE',
  GIFT = 'GIFT',
  STARS_TRANSFER = 'STARS_TRANSFER',
}

export enum StoryMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
}

export enum ReceiptStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

export enum CallType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

export enum CallStatus {
  RINGING = 'RINGING',
  CONNECTED = 'CONNECTED',
  ENDED = 'ENDED',
  REJECTED = 'REJECTED',
  MISSED = 'MISSED',
}

export enum ReportReason {
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  SCAM = 'SCAM',
  ILLEGAL_CONTENT = 'ILLEGAL_CONTENT',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum PrivacyVisibility {
  EVERYONE = 'EVERYONE',
  CONTACTS = 'CONTACTS',
  NOBODY = 'NOBODY',
}

// User & Profile
export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  lastSeenAt: string | null;
  lastSeenVisibility: PrivacyVisibility;
  messageVisibility: PrivacyVisibility;
  callVisibility: PrivacyVisibility;
  groupAddVisibility: PrivacyVisibility;
  photoVisibility: PrivacyVisibility;
  theme: 'dark' | 'light' | 'system';
  language: string;
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  isBanned: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  profile?: UserProfile | null;
  status?: UserStatus;
  lastSeen?: string | null;
  isPremium?: boolean;
  premiumUntil?: string | null;
  premiumType?: string | null;
  starBalance?: number;
  isUnlimitedStars?: boolean;
  permissions?: string[];
}

// Sessions & Devices
export interface UserSession {
  id: string;
  userId: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

// Attachments
export interface Attachment {
  id: string;
  messageId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  waveform?: number[] | null;
  width?: number | null;
  height?: number | null;
}

// Reactions
export interface ReactionSummary {
  emoji: string;
  count: number;
  users: Array<{ id: string; username: string; displayName?: string }>;
  hasReacted: boolean;
}

// Messages
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  sender?: User;
  senderName?: string;
  type: MessageType;
  content: string;
  attachments?: Attachment[];
  replyToId?: string | null;
  replyTo?: (Message & { senderName?: string }) | null;
  forwardedFromId?: string | null;
  forwardedFrom?: User | null;
  topicId?: string | null;
  topic?: Topic | null;
  poll?: Poll | null;
  isEdited: boolean;
  isDeleted: boolean;
  idempotencyKey?: string | null;
  reactions?: ReactionSummary[];
  receipts?: Array<{ userId: string; status: ReceiptStatus; updatedAt: string }>;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Chat Members & Permissions
export interface GroupPermissions {
  canSendMessages: boolean;
  canSendMedia: boolean;
  canAddUsers: boolean;
  canPinMessages: boolean;
  canChangeInfo: boolean;
}

export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: MemberRole;
  permissions?: GroupPermissions | null;
  customTitle?: string | null;
  isMuted: boolean;
  mutedUntil?: string | null;
  joinedAt?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  lastSeenAt?: string | null;
  user?: User;
}

// Chat
export interface Chat {
  id: string;
  type: ChatType;
  title: string | null;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string | null;
  isPublic: boolean;
  isForum?: boolean;
  inviteCode?: string | null;
  createdAt: string;
  updatedAt: string;
  members: ChatMember[];
  lastMessage?: Message | null;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  pinnedMessages?: Message[];
  topics?: Topic[];
}

// Contacts
export interface Contact {
  id: string;
  userId: string;
  contactUserId: string;
  contactUser: User;
  nickname?: string | null;
  createdAt: string;
}

// WebRTC Calls
export interface CallSession {
  id: string;
  chatId: string;
  callerId: string;
  caller: User;
  receiverId?: string;
  type: CallType;
  status: CallStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number;
}

// Moderation & Reports
export interface Report {
  id: string;
  reporterId: string;
  reporter: User;
  targetType: 'USER' | 'CHAT' | 'MESSAGE';
  targetId: string;
  reason: ReportReason;
  comment?: string | null;
  status: ReportStatus;
  reviewedBy?: string | null;
  createdAt: string;
  targetPreview?: any;
}

// Audit Logs
export interface AuditLog {
  id: string;
  actorId: string;
  actor?: User;
  action: string;
  target: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

// API Responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string | null;
  hasMore: boolean;
  total?: number;
}

// WebSocket Payloads
export interface WsTypingPayload {
  chatId: string;
  userId: string;
  username: string;
  displayName?: string;
  isTyping: boolean;
}

export interface WsPresencePayload {
  userId: string;
  status: UserStatus;
  lastSeenAt?: string;
}

export interface WsMessagePayload {
  message: Message;
}

export interface WsReceiptPayload {
  chatId: string;
  messageId: string;
  userId: string;
  status: ReceiptStatus;
  timestamp: string;
}

export interface WsCallSignalPayload {
  callId: string;
  senderId: string;
  receiverId: string;
  type: 'offer' | 'answer' | 'candidate' | 'call-user' | 'accept-call' | 'reject-call' | 'end-call';
  sdp?: any;
  candidate?: any;
  callType?: CallType;
  chatId?: string;
}

// Stories
export interface StoryView {
  id: string;
  storyId: string;
  viewerId: string;
  viewer?: User;
  viewedAt: string;
}

export interface StoryReaction {
  id: string;
  storyId: string;
  userId: string;
  user?: User;
  emoji: string;
  createdAt: string;
}

export interface Story {
  id: string;
  authorId: string;
  author?: User;
  mediaUrl: string;
  mediaType: StoryMediaType;
  caption?: string | null;
  textOverlay?: {
    text: string;
    bgColor?: string;
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
    alignment?: 'left' | 'center' | 'right';
  } | null;
  privacy: PrivacyVisibility;
  expiresAt: string;
  isArchived: boolean;
  createdAt: string;
  views?: StoryView[];
  reactions?: StoryReaction[];
  viewCount?: number;
  reactionCount?: number;
  hasViewed?: boolean;
}

export interface StoryFeedItem {
  user: User;
  stories: Story[];
  hasUnseen: boolean;
  latestCreatedAt: string;
}

// Polls
export interface PollVote {
  id: string;
  pollId: string;
  optionId: string;
  userId: string;
  votedAt: string;
}

export interface PollOption {
  id: string;
  pollId: string;
  text: string;
  voteCount: number;
  percentage?: number;
  hasVoted?: boolean;
}

export interface Poll {
  id: string;
  chatId: string;
  messageId: string;
  question: string;
  isAnonymous: boolean;
  allowMultiple: boolean;
  isClosed: boolean;
  createdAt: string;
  totalVotes?: number;
  hasVoted?: boolean;
  options: PollOption[];
  userVotes?: string[]; // IDs of options voted for by current user
}

// Topics / Forums
export interface Topic {
  id: string;
  chatId: string;
  title: string;
  icon?: string | null;
  color?: string | null;
  creatorId: string;
  creator?: User;
  isClosed: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message | null;
  messageCount?: number;
}

// Stickers
export interface Sticker {
  id: string;
  packId: string;
  emoji: string;
  url: string;
  width?: number | null;
  height?: number | null;
  createdAt: string;
}

export interface StickerPack {
  id: string;
  name: string;
  title: string;
  author?: string | null;
  isOfficial: boolean;
  stickers: Sticker[];
  createdAt: string;
}

// Link Preview
export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

// Additional WebSocket Events
export interface WsStoryPayload {
  story: Story;
  authorId: string;
}

export interface WsPollUpdatedPayload {
  chatId: string;
  messageId: string;
  poll: Poll;
}

export interface WsTopicPayload {
  chatId: string;
  topic: Topic;
}

// RBAC Granular Permissions
export enum Permission {
  STARS_VIEW = 'stars.view',
  STARS_GRANT = 'stars.grant',
  STARS_DEBIT = 'stars.debit',
  STARS_UNLIMITED = 'stars.unlimited',
  PREMIUM_VIEW = 'premium.view',
  PREMIUM_GRANT = 'premium.grant',
  PREMIUM_REVOKE = 'premium.revoke',
  GIFTS_VIEW = 'gifts.view',
  GIFTS_MANAGE = 'gifts.manage',
  GIFTS_GRANT = 'gifts.grant',
  COLLECTIBLES_VIEW = 'collectibles.view',
  COLLECTIBLES_MANAGE = 'collectibles.manage',
  COLLECTIBLES_GRANT = 'collectibles.grant',
  USERS_VIEW = 'users.view',
  USERS_MANAGE = 'users.manage',
  MODERATION_MANAGE = 'moderation.manage',
  ECONOMY_MANAGE = 'economy.manage',
  SYSTEM_MANAGE = 'system.manage',
}

// Stars & Ledger
export enum StarTransactionType {
  ACTIVITY_REWARD = 'ACTIVITY_REWARD',
  ADMIN_GRANT = 'ADMIN_GRANT',
  ADMIN_DEBIT = 'ADMIN_DEBIT',
  GIFT_PURCHASE = 'GIFT_PURCHASE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  REFUND = 'REFUND',
  SYSTEM_REWARD = 'SYSTEM_REWARD',
  PREMIUM_REWARD = 'PREMIUM_REWARD',
  PREMIUM_PURCHASE = 'PREMIUM_PURCHASE',
}

export interface StarAccount {
  id: string;
  userId: string;
  balance: number;
  isUnlimited: boolean;
  totalEarned: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface StarTransaction {
  id: string;
  accountId: string;
  userId: string;
  type: StarTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  createdByAdminId?: string | null;
  createdAt: string;
  otherParty?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

export interface ActivityRewardState {
  userId: string;
  continuousActiveSeconds: number;
  remainingSeconds: number;
  lastHeartbeatAt: string;
  lastRewardAt?: string | null;
  nextRewardAt?: string | null;
  isEligible: boolean;
  hourlyRewardAmount: number;
}

// Gifts & Collectibles
export enum GiftRarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
  MYTHIC = 'MYTHIC',
}

export interface GiftDefinition {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  artwork: string;
  priceStars: number;
  rarity: GiftRarity;
  isLimited: boolean;
  totalSupply?: number | null;
  soldCount: number;
  availableFrom?: string | null;
  availableUntil?: string | null;
  isPremiumOnly: boolean;
  isCollectibleEligible: boolean;
  category: string;
  isActive: boolean;
  createdAt: string;
}

export interface GiftInstance {
  id: string;
  giftDefinitionId: string;
  giftDefinition: GiftDefinition;
  ownerId: string;
  owner?: User;
  senderId?: string | null;
  sender?: User | null;
  message?: string | null;
  serialNumber?: number | null;
  isAnonymous: boolean;
  showOnProfile: boolean;
  receivedAt: string;
  createdAt: string;
  collectible?: CollectibleInstance | null;
}

export interface CollectibleInstance {
  id: string;
  uniqueNumber: number;
  editionName: string;
  background: string;
  modelPattern: string;
  symbol: string;
  rarity: GiftRarity;
  totalSupply: number;
  mintedAt: string;
  giftInstanceId?: string | null;
  originalSenderId?: string | null;
  originalSender?: User | null;
  currentOwnerId: string;
  currentOwner?: User;
  history?: CollectibleHistoryItem[];
  createdAt: string;
}

export interface CollectibleHistoryItem {
  id: string;
  collectibleId: string;
  fromUserId?: string | null;
  fromUser?: User | null;
  toUserId: string;
  toUser?: User | null;
  action: string;
  priceStars?: number | null;
  createdAt: string;
}

export interface DFZPremiumState {
  isPremium: boolean;
  premiumUntil?: string | null;
  isLifetime: boolean;
  premiumType?: 'MONTHLY' | 'YEARLY' | 'LIFETIME' | 'ADMIN' | null;
  badge: string; // '◆'
}

export interface WsStarRewardPayload {
  amount: number;
  balance: number;
  message: string;
}

export interface WsStarTransferPayload {
  amount: number;
  senderId: string;
  senderName: string;
  recipientId: string;
  newBalance: number;
  message?: string;
}

export interface WsGiftReceivedPayload {
  giftInstance: GiftInstance;
  senderName?: string;
}

