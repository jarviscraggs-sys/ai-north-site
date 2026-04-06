import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'clearclaim.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      company TEXT,
      role TEXT NOT NULL,
      employee_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subcontractor_id INTEGER NOT NULL,
      invoice_number TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      vat_amount REAL NOT NULL DEFAULT 0,
      work_from TEXT NOT NULL,
      work_to TEXT NOT NULL,
      cost_code TEXT,
      po_reference TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'queried')),
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at TEXT,
      reviewer_comment TEXT,
      FOREIGN KEY (subcontractor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ai_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      matched_invoice_id INTEGER NOT NULL,
      flag_type TEXT NOT NULL,
      confidence_score INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (matched_invoice_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      job_code TEXT NOT NULL,
      area TEXT NOT NULL,
      description TEXT NOT NULL,
      line_value REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      cis_rate INTEGER DEFAULT 20,
      contractor_id INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (contractor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Audit log table
  db.exec(`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    user_id INTEGER,
    user_name TEXT,
    action TEXT,
    detail TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Projects table
  db.exec(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contractor_id INTEGER,
    name TEXT NOT NULL,
    reference TEXT,
    address TEXT,
    contract_value REAL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migrations: add columns if they don't exist
  const existingCols = (db.pragma('table_info(invoices)') as any[]).map((c: any) => c.name);
  const migrations: [string, string][] = [
    ['job_code',              'ALTER TABLE invoices ADD COLUMN job_code TEXT'],
    ['area',                  'ALTER TABLE invoices ADD COLUMN area TEXT'],
    ['cis_rate',              'ALTER TABLE invoices ADD COLUMN cis_rate INTEGER NOT NULL DEFAULT 0'],
    ['cis_amount',            'ALTER TABLE invoices ADD COLUMN cis_amount REAL NOT NULL DEFAULT 0'],
    ['job_description',       'ALTER TABLE invoices ADD COLUMN job_description TEXT'],
    // Retention fields
    ['retention_rate',        'ALTER TABLE invoices ADD COLUMN retention_rate REAL DEFAULT 5.0'],
    ['retention_amount',      'ALTER TABLE invoices ADD COLUMN retention_amount REAL DEFAULT 0'],
    ['retention_released',    'ALTER TABLE invoices ADD COLUMN retention_released REAL DEFAULT 0'],
    ['retention_release_date','ALTER TABLE invoices ADD COLUMN retention_release_date TEXT'],
    // Application for payment fields
    ['application_number',    'ALTER TABLE invoices ADD COLUMN application_number INTEGER DEFAULT 1'],
    ['cumulative_value',      'ALTER TABLE invoices ADD COLUMN cumulative_value REAL DEFAULT 0'],
    ['previous_certified',    'ALTER TABLE invoices ADD COLUMN previous_certified REAL DEFAULT 0'],
    ['this_application',      'ALTER TABLE invoices ADD COLUMN this_application REAL DEFAULT 0'],
    ['project_id',            'ALTER TABLE invoices ADD COLUMN project_id INTEGER'],
    ['paid_date',             'ALTER TABLE invoices ADD COLUMN paid_date TEXT'],
    ['paid',                  'ALTER TABLE invoices ADD COLUMN paid INTEGER DEFAULT 0'],
  ];
  for (const [col, sql] of migrations) {
    if (!existingCols.includes(col)) {
      db.exec(sql);
    }
  }

  // Users table migrations
  const userCols = (db.pragma('table_info(users)') as any[]).map((c: any) => c.name);
  if (!userCols.includes('accountant_email')) {
    db.exec('ALTER TABLE users ADD COLUMN accountant_email TEXT');
  }
  if (!userCols.includes('cis_rate')) {
    db.exec('ALTER TABLE users ADD COLUMN cis_rate INTEGER DEFAULT 20');
  }
  if (!userCols.includes('employee_id')) {
    db.exec('ALTER TABLE users ADD COLUMN employee_id INTEGER');
  }
  if (!userCols.includes('logo_path')) {
    db.exec('ALTER TABLE users ADD COLUMN logo_path TEXT');
  }

  // Employees table
  db.exec(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contractor_id INTEGER NOT NULL,
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    hourly_rate REAL DEFAULT 0,
    weekly_hours REAL DEFAULT 40,
    holiday_allowance INTEGER DEFAULT 28,
    holiday_used INTEGER DEFAULT 0,
    start_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contractor_id) REFERENCES users(id)
  )`);

  // Timesheets table
  db.exec(`CREATE TABLE IF NOT EXISTS timesheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    contractor_id INTEGER NOT NULL,
    week_starting TEXT NOT NULL,
    project_id INTEGER,
    mon_hours REAL DEFAULT 0,
    tue_hours REAL DEFAULT 0,
    wed_hours REAL DEFAULT 0,
    thu_hours REAL DEFAULT 0,
    fri_hours REAL DEFAULT 0,
    sat_hours REAL DEFAULT 0,
    sun_hours REAL DEFAULT 0,
    total_hours REAL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    reviewer_comment TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (contractor_id) REFERENCES users(id)
  )`);

  // Holiday requests table
  db.exec(`CREATE TABLE IF NOT EXISTS holiday_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    contractor_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    days_requested REAL NOT NULL,
    type TEXT DEFAULT 'annual' CHECK(type IN ('annual','sick','unpaid','compassionate','other')),
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    reviewer_comment TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (contractor_id) REFERENCES users(id)
  )`);

  // contractor_settings table
  db.exec(`CREATE TABLE IF NOT EXISTS contractor_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contractor_id INTEGER UNIQUE NOT NULL,
    max_holidays_per_day INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // employee_invites table
  db.exec(`CREATE TABLE IF NOT EXISTS employee_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    employee_id INTEGER NOT NULL,
    contractor_id INTEGER NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL
  )`);

  // Notifications table
  db.exec(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Project documents table
  db.exec(`CREATE TABLE IF NOT EXISTS project_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    contractor_id INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    mime_type TEXT,
    category TEXT DEFAULT 'general',
    description TEXT,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`);

  // Variations table
  db.exec(`CREATE TABLE IF NOT EXISTS variations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    invoice_id INTEGER,
    subcontractor_id INTEGER NOT NULL,
    contractor_id INTEGER NOT NULL,
    variation_number TEXT NOT NULL,
    description TEXT NOT NULL,
    value REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TEXT,
    reviewer_comment TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  )`);

  // Subcontractor compliance table
  db.exec(`CREATE TABLE IF NOT EXISTS subcontractor_compliance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subcontractor_id INTEGER NOT NULL,
    contractor_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    expiry_date TEXT,
    notes TEXT,
    status TEXT DEFAULT 'valid' CHECK(status IN ('valid','expired','expiring_soon','missing')),
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subcontractor_id) REFERENCES users(id),
    FOREIGN KEY (contractor_id) REFERENCES users(id)
  )`);

  // Users table: add UTR if missing
  const userColsCheck = (db.pragma('table_info(users)') as any[]).map((c: any) => c.name);
  if (!userColsCheck.includes('utr')) {
    db.exec('ALTER TABLE users ADD COLUMN utr TEXT');
  }

  // Seed contractor_settings for existing contractors
  const contractors = db.prepare(`SELECT id FROM users WHERE role = 'contractor'`).all() as any[];
  for (const c of contractors) {
    const existing = db.prepare('SELECT id FROM contractor_settings WHERE contractor_id = ?').get(c.id);
    if (!existing) {
      db.prepare('INSERT INTO contractor_settings (contractor_id, max_holidays_per_day) VALUES (?, 1)').run(c.id);
    }
  }

  // Disputes table
  db.exec(`CREATE TABLE IF NOT EXISTS disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    raised_by INTEGER NOT NULL,
    contractor_id INTEGER NOT NULL,
    subcontractor_id INTEGER NOT NULL,
    dispute_type TEXT DEFAULT 'payment' CHECK(dispute_type IN ('payment','quality','scope','other')),
    description TEXT NOT NULL,
    amount_disputed REAL,
    status TEXT DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','escalated')),
    pay_less_notice_date TEXT,
    payment_due_date TEXT,
    resolution_notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  )`);

  // Dispute timeline table
  db.exec(`CREATE TABLE IF NOT EXISTS dispute_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dispute_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    detail TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // CIS verifications table
  db.exec(`CREATE TABLE IF NOT EXISTS cis_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subcontractor_id INTEGER NOT NULL,
    contractor_id INTEGER NOT NULL,
    verified_date TEXT NOT NULL,
    hmrc_reference TEXT,
    confirmed_rate INTEGER NOT NULL,
    verified_by TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed sample projects if none exist
  const projectCount = (db.prepare('SELECT COUNT(*) as c FROM projects').get() as any).c;
  if (projectCount === 0) {
    const contractor = db.prepare(`SELECT id FROM users WHERE role = 'contractor' LIMIT 1`).get() as any;
    if (contractor) {
      db.prepare(`INSERT INTO projects (contractor_id, name, reference, address, contract_value, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).
        run(contractor.id, 'City Centre Refurb', 'CCR-2024-01', '14 High Street, Newcastle NE1 1AA', 250000, '2024-01-15', '2024-12-31', 'active');
      db.prepare(`INSERT INTO projects (contractor_id, name, reference, address, contract_value, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).
        run(contractor.id, 'Riverside Development Phase 2', 'RD2-2024-07', 'Riverside Way, Sunderland SR1 3TU', 480000, '2024-07-01', '2025-06-30', 'active');
    }
  }
}

export default getDb;
