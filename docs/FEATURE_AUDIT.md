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
