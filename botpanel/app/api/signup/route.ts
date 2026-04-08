import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { createSessionToken } from '@/lib/auth';

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  hair_beauty: 'Hair & Beauty',
  restaurant_takeaway: 'Restaurant & Takeaway',
  tradesman_contractor: 'Tradesman & Contractor',
  estate_agent: 'Estate Agent',
  gym_pt: 'Gym & PT',
  professional_services: 'Professional Services',
  other: 'Other',
};

function generateSystemPrompt(data: {
  businessName: string;
  businessType: string;
  phone: string;
  address: string;
  website?: string;
  services: string;
  openingHours: Record<string, { open: boolean; from: string; to: string }>;
}): string {
  const typeLabel = BUSINESS_TYPE_LABELS[data.businessType] || data.businessType;

  const hoursText = Object.entries(data.openingHours)
    .map(([day, h]) => (h.open ? `${day}: ${h.from}–${h.to}` : `${day}: Closed`))
    .join(', ');

  return `You are a helpful AI assistant for ${data.businessName}, a ${typeLabel} business.

Your job is to help customers by:
- Answering questions about services and prices
- Helping customers book appointments or enquiries
- Providing business information

Business details:
- Name: ${data.businessName}
- Type: ${typeLabel}
- Phone: ${data.phone}
- Address: ${data.address}${data.website ? `\n- Website: ${data.website}` : ''}

Opening hours: ${hoursText}

Services and prices:
${data.services || 'Please ask about our services.'}

When a customer wants to book, collect their name, phone number, desired service, and preferred date/time. Be friendly, professional, and concise. Always confirm bookings by repeating the details back.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      businessName,
      businessType,
      yourName,
      email,
      password,
      confirmPassword,
      phone,
      address,
      website,
      services,
      openingHours,
      demoCode,
    } = body;

    // Validation
    if (!businessName || !businessType || !yourName || !email || !password || !phone || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const db = getDb();

    // Check email uniqueness
    const existing = db.prepare('SELECT id FROM businesses WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate system prompt
    const systemPrompt = generateSystemPrompt({
      businessName,
      businessType,
      phone,
      address,
      website,
      services,
      openingHours,
    });

    // Insert business
    const result = db.prepare(`
      INSERT INTO businesses (name, type, phone, email, address, password_hash, system_prompt, website, owner_name, demo_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      businessName,
      businessType,
      phone,
      email,
      address,
      passwordHash,
      systemPrompt,
      website || null,
      yourName,
      demoCode || null,
    );

    const businessId = result.lastInsertRowid as number;

    // Create session
    const token = createSessionToken({
      businessId,
      email,
      businessName,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('botpanel_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Signup error:', err);
    // Handle column missing errors gracefully
    if (err instanceof Error && err.message.includes('has no column named')) {
      return NextResponse.json(
        { error: 'Database schema out of date. Please contact support.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
