// Core Enums
export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
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

