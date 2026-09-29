# Local rebuild verification

Run only with the dedicated local QA database. The repository's existing environment files may point to a remote database; explicit process environment overrides are required.

```powershell
$env:DATABASE_URL='postgresql://postgres@127.0.0.1:5432/dfz_rebuild_qa?schema=public'
$env:UPLOAD_DIR='C:/Users/Lenovo/Desktop/messenger/uploads/qa'
npm run build:api
npm run test --workspace=@dfz/api
npx tsx apps/api/test/security-regression.ts
npx tsx apps/api/test/management-regression.ts
npx tsx apps/api/test/security-hardening.ts
npx tsx apps/api/test/test-economy.ts
npx tsx apps/web/test/api-client.ts
```

Stop the web development server before `npm run build:web`; the dev server and production build share `.next`. After a successful build use `npm run start --workspace=@dfz/web` for a local production preview. Start the API separately with the explicit QA environment above.

The regression suites create their own test users and clean them up. `scripts/seed-qa.cjs` seeds named local browser-QA users and refuses other databases. Do not seed these users in production.

Two checked-in migrations were applied only to local QA. For a new empty database, deploy migrations normally. For an existing populated installation, compare the actual schema and migration baseline, back up, and prepare an incremental migration before adopting history. The baseline includes new Upload and clearedAt fields, so it cannot simply be marked applied against the original schema.

Production checklist still requires configuration of the actual HTTPS origin, API/WebSocket routing, strong runtime secrets, Redis, private uploads, backup/restore, and TURN where direct WebRTC connections fail. See FEATURE_AUDIT.md for outstanding feature scope and tested limitations.
