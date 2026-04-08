import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'admin@clayo.co.uk';
const ADMIN_PASSWORD = 'Clayo@Admin2024';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = Buffer.from(JSON.stringify({ admin: true, email })).toString('base64');

    const response = NextResponse.json({ success: true });
    response.cookies.set('clayo_admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
