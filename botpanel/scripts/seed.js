const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'botpanel.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    phone TEXT,
    email TEXT UNIQUE NOT NULL,
    address TEXT,
    password_hash TEXT NOT NULL,
    bot_token TEXT,
    system_prompt TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    service TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id)
  );

  CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    chat_id TEXT NOT NULL,
    customer_name TEXT,
    messages TEXT NOT NULL DEFAULT '[]',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, chat_id),
    FOREIGN KEY (business_id) REFERENCES businesses(id)
  );
`);

// Delete existing demo business
const existing = db.prepare("SELECT id FROM businesses WHERE email = 'demo@botpanel.co.uk'").get();
if (existing) {
  db.prepare('DELETE FROM bookings WHERE business_id = ?').run(existing.id);
  db.prepare('DELETE FROM enquiries WHERE business_id = ?').run(existing.id);
  db.prepare('DELETE FROM conversations WHERE business_id = ?').run(existing.id);
  db.prepare('DELETE FROM businesses WHERE id = ?').run(existing.id);
  console.log('Removed existing demo business');
}

// Hash password
const passwordHash = bcrypt.hashSync('demo123', 10);

const systemPrompt = `You are a helpful assistant for Bella's Hair Studio in Sunderland. You help customers book appointments and answer questions about our services. Services: Cut & Blow Dry £35, Colour from £65, Highlights from £85, Treatments from £25. Opening hours: Mon-Sat 9am-6pm. Location: 14 High Street, Sunderland SR1 3AA. When a customer wants to book, collect their name, phone number, desired service, and preferred date/time, then confirm the booking.`;

// Insert demo business
const result = db.prepare(`
  INSERT INTO businesses (name, type, phone, email, address, password_hash, bot_token, system_prompt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  "Bella's Hair Studio",
  'salon',
  '0191 567 8901',
  'demo@botpanel.co.uk',
  '14 High Street, Sunderland SR1 3AA',
  passwordHash,
  null,
  systemPrompt
);

const businessId = result.lastInsertRowid;
console.log(`Created business ID: ${businessId}`);

// Generate dates relative to today
const today = new Date();
function daysAgo(n) {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function daysAhead(n) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Insert 10 bookings
const bookings = [
  { name: 'Sarah Thompson', phone: '07700 900123', service: 'Cut & Blow Dry', date: daysAgo(14), time: '10:00', status: 'confirmed', notes: 'Prefers no layers' },
  { name: 'Emma Wilson', phone: '07700 900456', service: 'Highlights', date: daysAgo(10), time: '14:00', status: 'confirmed', notes: 'Full head highlights' },
  { name: 'Lucy Davies', phone: '07700 900789', service: 'Colour', date: daysAgo(7), time: '11:30', status: 'confirmed', notes: 'Permanent brunette' },
  { name: 'Rachel Green', phone: '07700 900321', service: 'Treatment', date: daysAgo(3), time: '09:00', status: 'confirmed', notes: 'Keratin treatment' },
  { name: 'Jessica Martin', phone: '07700 900654', service: 'Cut & Blow Dry', date: daysAgo(1), time: '15:30', status: 'confirmed', notes: '' },
  { name: 'Olivia Clarke', phone: '07700 900987', service: 'Colour', date: daysAhead(1), time: '10:00', status: 'pending', notes: 'Going from blonde to red' },
  { name: 'Amy Johnson', phone: '07700 900111', service: 'Highlights', date: daysAhead(2), time: '13:00', status: 'pending', notes: 'Balayage style' },
  { name: 'Chloe Brown', phone: '07700 900222', service: 'Cut & Blow Dry', date: daysAhead(3), time: '11:00', status: 'confirmed', notes: '' },
  { name: 'Sophie Taylor', phone: '07700 900333', service: 'Treatment', date: daysAhead(5), time: '09:30', status: 'pending', notes: 'Deep conditioning' },
  { name: 'Hannah White', phone: '07700 900444', service: 'Colour', date: daysAhead(7), time: '14:30', status: 'pending', notes: 'Ombre effect' },
];

const insertBooking = db.prepare(`
  INSERT INTO bookings (business_id, customer_name, customer_phone, service, date, time, notes, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const b of bookings) {
  insertBooking.run(businessId, b.name, b.phone, b.service, b.date, b.time, b.notes, b.status);
}
console.log(`Inserted ${bookings.length} bookings`);

// Insert 5 enquiries
const enquiries = [
  {
    name: 'Natalie Reed',
    phone: '07700 900555',
    message: "Hi, I was wondering if you do wedding hair packages? I'm getting married in August and looking for a full bridal party package for 4 people.",
    status: 'new',
  },
  {
    name: 'Karen Phillips',
    phone: '07700 900666',
    message: "Do you offer any student discounts? I'm at Sunderland University and looking for a regular place to get my hair done.",
    status: 'new',
  },
  {
    name: 'Michelle Ford',
    phone: '07700 900777',
    message: "I had highlights done last month and they've faded quite quickly. Is there anything I can do or is a toner needed? Happy to come in for a consultation.",
    status: 'read',
  },
  {
    name: 'Laura Cox',
    phone: '07700 900888',
    message: "What's the earliest appointment you have available next week? I need a cut and colour but I'm quite flexible on timing.",
    status: 'read',
  },
  {
    name: 'Dawn Pearson',
    phone: '07700 900999',
    message: "Can I bring my 8-year-old daughter in for a trim? What would you charge for children's cuts? She has quite long hair.",
    status: 'new',
  },
];

const insertEnquiry = db.prepare(`
  INSERT INTO enquiries (business_id, customer_name, customer_phone, message, status)
  VALUES (?, ?, ?, ?, ?)
`);

for (const e of enquiries) {
  insertEnquiry.run(businessId, e.name, e.phone, e.message, e.status);
}
console.log(`Inserted ${enquiries.length} enquiries`);

console.log('\n✅ Demo data seeded successfully!');
console.log('   Business: Bella\'s Hair Studio');
console.log('   Email: demo@botpanel.co.uk');
console.log('   Password: demo123');

db.close();
