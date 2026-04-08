const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(process.cwd(), 'clayo.db');
console.log('[Clayo] Starting — DB path:', DB_PATH);

try {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'other',
      phone TEXT,
      email TEXT UNIQUE NOT NULL,
      address TEXT,
      website TEXT,
      password_hash TEXT NOT NULL,
      bot_token TEXT,
      system_prompt TEXT,
      services TEXT,
      opening_hours TEXT,
      demo_code TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      service TEXT,
      date TEXT,
      time TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      chat_id TEXT NOT NULL,
      customer_name TEXT,
      messages TEXT DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const existing = db.prepare("SELECT id FROM businesses WHERE email = 'demo@clayo.co.uk'").get();
  if (!existing) {
    const hash = bcrypt.hashSync('demo123', 10);
    const bizId = db.prepare(`
      INSERT INTO businesses (name, type, phone, email, address, password_hash, services, system_prompt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "Bella's Hair Studio",
      'salon',
      '0191 555 0123',
      'demo@clayo.co.uk',
      '14 High Street, Sunderland SR1 3AA',
      hash,
      "Cut & Blow Dry £35, Colour from £65, Highlights from £85, Treatments from £25",
      "You are a helpful assistant for Bella's Hair Studio in Sunderland. Help customers book appointments and answer questions. Services: Cut & Blow Dry £35, Colour from £65, Highlights from £85, Treatments from £25. Hours: Mon-Sat 9am-6pm. Address: 14 High Street, Sunderland SR1 3AA. Collect name, phone, service and preferred date/time to book."
    ).lastInsertRowid;

    const services = ["Cut & Blow Dry", "Colour", "Highlights", "Treatment", "Cut & Blow Dry", "Colour", "Highlights", "Cut & Blow Dry", "Treatment", "Colour"];
    const names = ["Sarah Johnson", "Emma Wilson", "Lisa Thompson", "Katie Brown", "Rachel Davis", "Amy Clarke", "Zoe Turner", "Hannah White", "Jade Martin", "Chloe Harris"];
    const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "09:30", "11:30"];
    const statuses = ["confirmed", "confirmed", "pending", "confirmed", "confirmed", "pending", "confirmed", "cancelled", "confirmed", "pending"];
    const dates = ["2026-04-07", "2026-04-08", "2026-04-09", "2026-04-10", "2026-04-11", "2026-04-12", "2026-04-05", "2026-04-06", "2026-04-13", "2026-04-14"];

    for (let i = 0; i < 10; i++) {
      db.prepare(`INSERT INTO bookings (business_id, customer_name, customer_phone, service, date, time, status) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(bizId, names[i], `0779${i}000${i}00`, services[i], dates[i], times[i], statuses[i]);
    }

    const enquiries = [
      ["Sophie Adams", "07911000001", "Do you do balayage? How much does it cost?", "new"],
      ["Megan Scott", "07911000002", "Are you open on Sundays?", "read"],
      ["Nicola Ford", "07911000003", "I need to cancel my appointment tomorrow", "new"],
      ["Becky Hall", "07911000004", "What's the earliest appointment this week?", "new"],
      ["Laura Price", "07911000005", "Do I need to book in advance for highlights?", "read"],
    ];
    for (const [name, phone, message, status] of enquiries) {
      db.prepare(`INSERT INTO enquiries (business_id, customer_name, customer_phone, message, status) VALUES (?, ?, ?, ?, ?)`)
        .run(bizId, name, phone, message, status);
    }

    console.log('[Clayo] Demo account created: demo@clayo.co.uk / demo123');
  }

  // Always fix passwords
  const hash = bcrypt.hashSync('demo123', 10);
  db.prepare("UPDATE businesses SET password_hash = ? WHERE email = 'demo@clayo.co.uk'").run(hash);

  db.close();
  console.log('[Clayo] Startup complete.');
} catch(e) {
  console.error('[Clayo] Startup error:', e.message);
}
