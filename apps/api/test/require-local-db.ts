// Imported before services: tests must never inherit a deployment database from .env.
const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/');
if (!['127.0.0.1', 'localhost'].includes(database.hostname) || database.pathname !== '/dfz_rebuild_qa') {
  throw new Error('Tests require explicit DATABASE_URL pointing to local dfz_rebuild_qa');
}
