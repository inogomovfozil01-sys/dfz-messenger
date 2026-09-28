# DFZ Messenger — audit and verification ledger

Audit date: 2026-09-27. Existing Next.js frontend, Express API, Prisma/PostgreSQL and Socket.IO retained. Pre-existing working-tree edits retained. Status describes end-to-end behavior, not the existence of a component. IMPLEMENTED does not imply production verified; verification evidence is recorded separately.

| Area / request sections | Initial status | Evidence / required work |
| --- | --- | --- |
| Desktop / mobile / design / menu (2–5) | PARTIAL | Two-column layout already exists; hardcoded theme colors, mobile overlay overflow and false encryption claim remain. |
| Contacts / profile (6–8) | BROKEN | Persistent Contact model exists; username fallback can add wrong user; privacy bypass in list/search; UI reports success on rejected mutations. |
| Block / unblock / reports (9–11) | PARTIAL | Block model and moderation queue exist; block bypasses in stories, sockets, profile lists. |
| Chat info / context menus / select (12–15, 96–97) | PARTIAL | Shared context menus and selection exist; bulk forward/copy, touch and accessibility incomplete. |
| Chat basics / status / search / pins (16–19) | BROKEN | Client-trusted event relay, cross-chat reply/pin/receipt IDs, unguarded unpin, no search result navigation, forwarding attachments broken. |
| Attachments / media / voice / video (20–23) | BROKEN | Upload/record/play UI exists; public uploads expose private files; synthetic waveform; no comprehensive recorder controls or media pagination. |
| Emoji / stickers / GIF / reactions (24–25) | PARTIAL | Emoji and sticker packs exist; provider-based GIF, favorites and complete reaction synchronization absent. |
| Saved / folders / archive (26–28) | PARTIAL | Persistent folders and saved chat exist; custom folders and archive not connected to chat list. |
| Groups (29–37) | PARTIAL | Creation, settings, members, topics exist; permission flags unenforced; invites lack expiry/usage/approval; join requests and moderation history absent. |
| Channels (38–45) | PARTIAL | Creation/settings/admin UI exists; granular rights, discussion, comments, views, analytics incomplete. |
| Stories (46–48) | BROKEN | Private stories broadcast globally; incorrect contacts direction; views/reactions accept inaccessible IDs. Advanced audience rules and archive incomplete. |
| Calls (49–51) | BROKEN | WebRTC and history exist; signaling trusts target IDs; accept/end not participant-authorized; device controls need physical-device QA. |
| Settings / account / privacy / sessions (52–58) | PARTIAL | Profile/privacy/password/session endpoints exist; revoked sessions still authorize access tokens; 2FA incomplete; exceptions missing. |
| Appearance / storage / language / accessibility (59–62) | PARTIAL | Theme and locale fields exist; many hardcoded strings; local cache and accessibility incomplete. |
| Stars / rewards (63–68) | PARTIAL | Ledger, transfer and admin operations exist; reward race conditions, replay scoping and concurrency require tests. |
| Premium / gifts / collectibles (69–73) | PARTIAL | Persistent inventory, grants and ownership history exist; not all premium limits enforced; concurrency and privacy need tests. |
| Administration (74–78) | PARTIAL | Same messenger plus admin route, grants, reports and audit; platform group/channel/storage/system management incomplete. |
| Global search / new chat / notifications / usernames (79–82) | PARTIAL | Search endpoints exist; list only searches cached chats; notifications and profile deep links incomplete. |
| Presence / drafts / multi-device / realtime (83–88) | BROKEN | Global presence leaks privacy; drafts local; no recovery/resync; client emits persisted state. |
| Database (89) | PARTIAL | Normalized core models exist; no checked-in migration history, advanced invites/privacy/settings missing. |
| IDOR / files / preview / auth / sockets (90–94) | BROKEN | Multiple confirmed authorization gaps; DNS rebinding protection missing; uploads publicly served. |
| Economy security (95) | PARTIAL | Conditional debit and ledger exist; not all operations serialized or replay-bound. |
| Empty/loading/error states (98–100) | PARTIAL | Skeleton component exists; mutations often silently ignore errors; untyped domain errors become 500. |
| PWA / performance / scroll / keyboard (101–104) | PARTIAL | Manifest exists but service worker/icons absent; loading older messages can trigger bottom scroll; no search shortcut. |
| Fake feature sweep (105–106) | BROKEN | False E2EE statement, guessed online status, unconfirmed success state. |
| Responsive / real account / admin / permission / visual QA (107–111) | MISSING | Existing API tests cover subset only; requested browser and security matrix not recorded. |
| Production verification (112–115) | PARTIAL | API baseline compiles; full build/lint/runtime/Redis/browser verification pending. |

## Verification

- Baseline API TypeScript build: passed.
- No deployment performed; production readiness is not asserted.
- Additional changes and verified scenarios will be appended below.

## Rebuild progress — verified 2026-09-27

### Implemented in the existing application

- DFZ graphite/iris visual system, desktop navigation rail, revised chat list/search/stories, larger chat header, redesigned message bubbles and composer. Light and dim themes use their own tokens; theme selection persists in the profile. Density setting persists and affects chat rows. Desktop navigation opens the existing functional views.
- Local login no longer inherits the initial global loading state. Browser QA created a contact, opened a direct conversation, sent messages, searched globally, and navigated to the matching message.
- Search respects per-member cleared history; profile search, contacts, chat list and chat details respect photo and last-seen privacy. Cleared history does not leak through chat previews or pinned-message lists.
- Group policy, limited/expiring/revocable invites, join approval, recent actions, user settings and private drafts have persisted API routes. Invite usage and approval decisions use transaction locks.
- Message membership/right checks, cross-chat target validation, server-originated message events, participant-validated call signaling, session revocation checks and authenticated media access were added. Forwarding is performed server-side and respects source membership and protected content.
- Real report submission replaces the previous local alert. Inaccessible report targets are rejected. Forwarding errors remain visible instead of showing false success.
- Activity rewards serialize concurrent heartbeats; transfer replay keys are scoped to sender. Voice playback derives duration from media, and video notes use actual uploaded metadata.
- PWA offline shell and update notification added. Private chat responses are not cached by the new worker. Installation/offline lifecycle is not yet browser verified.

### Verification evidence

- API TypeScript build passed after chat privacy changes.
- Web TypeScript validation passed after navigation redesign; final production build status recorded below.
- Existing API integration suite: 13 scenarios passed against the dedicated local `dfz_rebuild_qa` PostgreSQL database.
- `apps/api/test/security-regression.ts`: passed, including contacts/list/detail privacy, cross-chat identifiers, blocked communication, cleared history/pins, revoked sessions.
- `apps/api/test/management-regression.ts`: passed, including HTTP admin/member permissions, global/in-chat cleared-history search, report access, concurrent one-use invite consumption, draft isolation, settings validation.
- Economy suite previously passed 14 scenarios on the same dedicated local database.
- Browser: actual message sending after redesign, global search result navigation, dark/light theme switch. Screenshot evidence: `qa/dfz-desktop.png` (1280 x 720) and `qa/dfz-mobile.png` (390 x 844). Mobile chat had document width and content width 390 px. This is not a full device/browser matrix.

### Remaining release blockers and unverified scope

This is progress, not completion of all 115 request sections. Still required: complete custom-folder UI, privacy exceptions and advanced story audiences, 2FA, channel comments/discussion/views/analytics, comprehensive granular permission enforcement, reliable retry/offline sending, full notification/autodownload behavior, every premium limit and gift race case, media content-signature validation and pagination, bounded search navigation, multi-device/reconnect/revocation race testing, complete localization, and full admin workflows.

Calls need real microphone/camera, ICE/TURN and two-device verification. Redis is unavailable locally; memory fallback is not equivalent to production Redis. No production deployment or remote database migration was performed. Existing-database migration adoption needs a backup and schema comparison; do not apply the initial baseline CREATE statements blindly to an existing database.

Final build result: `@dfz/types`, API and Next.js production build passed after theme schema/type alignment. The fresh economy rerun passed all 14 cases, and management HTTP tests also verified persisted `dim` theme. `git diff --check` passed. A standalone lint configuration is still not established; the build's type-check stage must not be reported as a complete lint audit.

## Authentication deployment — 2026-09-28

The Next.js API route now runs the shared Express application on Vercel when no external API_INTERNAL_URL is configured. The standalone API entry retains its HTTP/WebSocket server. Vercel builds generate Prisma and build shared packages before Next.js. Local environment files and build artifacts are excluded from deployment uploads.

Registration ignores stale username-availability responses and enforces the same 3–32 character username bounds as the API. Existing local form loading fixes are included in the published version.

Production schema drift was confirmed by P2022 on chats and P2021 on settings after successful login. The configured database was verified against a freshly created QA account before any change. An inspected Prisma diff contained only the nullable ChatMember.clearedAt column, six new tables, indexes and foreign keys. Those additions were applied in a single transaction; existing data was not dropped or rewritten. Existing Prisma migration-baseline adoption remains a separate maintenance task.

Live HTTPS checks on messenger-two-theta.vercel.app: registration 201, login 200, authenticated /me 200, chats 200, settings 200, refresh 200, wrong password 401. Browser automation could not attach during this run; these are HTTP/cookie integration checks, not a completed browser UI test. WebSockets and durable file storage still require their separate production infrastructure and are outside this auth fix.
