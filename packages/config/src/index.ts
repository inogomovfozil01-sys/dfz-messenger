export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || 'DFZ Messenger',
  shortName: 'DFZ',
  description: 'Next-Generation Realtime Messenger',
  version: '1.0.0',
  defaultLanguage: 'ru',
  supportedLanguages: ['ru', 'en'],
  themeColor: '#0f172a',
  backgroundColor: '#020617',
} as const;

export const LIMITS = {
  maxMessageLength: 4096,
  maxBioLength: 200,
  maxUsernameLength: 32,
  minUsernameLength: 3,
  maxDisplayNameLength: 64,
  maxGroupNameLength: 64,
  maxChannelNameLength: 64,
  maxUploadSizeBytes: 50 * 1024 * 1024, // 50MB
  maxAvatarSizeBytes: 5 * 1024 * 1024, // 5MB
  defaultPageLimit: 40,
  maxPageLimit: 100,
  typingTimeoutMs: 3000,
  recordingMaxDurationSeconds: 300, // 5 minutes
} as const;

export const MIME_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  videos: ['video/mp4', 'video/webm', 'video/quicktime'],
  audios: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4'],
  documents: [
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/json',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

export const AUTH_CONFIG = {
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresInDays: 30,
  cookieNames: {
    accessToken: 'dfz_access_token',
    refreshToken: 'dfz_refresh_token',
  },
} as const;
