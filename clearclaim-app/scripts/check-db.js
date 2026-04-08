// Quick sanity check before starting
console.log('[ClearClaim] Node:', process.version);
console.log('[ClearClaim] Platform:', process.platform, process.arch);
console.log('[ClearClaim] CWD:', process.cwd());
console.log('[ClearClaim] PORT:', process.env.PORT);

try {
  const Database = require('better-sqlite3');
  console.log('[ClearClaim] better-sqlite3 loaded OK');
  const db = new Database(':memory:');
  db.exec('CREATE TABLE test (id INTEGER)');
  db.close();
  console.log('[ClearClaim] SQLite works OK');
} catch(e) {
  console.error('[ClearClaim] better-sqlite3 FAILED:', e.message);
  process.exit(1);
}
