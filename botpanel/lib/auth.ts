import { cookies } from 'next/headers';
import getDb from './db';

export interface SessionData {
  businessId: number;
  email: string;
  businessName: string;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('botpanel_session');
  
  if (!sessionCookie?.value) return null;
  
  try {
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf8');
    const session = JSON.parse(decoded) as SessionData;
    
    // Verify business still exists
    const db = getDb();
    const business = db.prepare('SELECT id FROM businesses WHERE id = ?').get(session.businessId);
    if (!business) return null;
    
    return session;
  } catch {
    return null;
  }
}

export function createSessionToken(data: SessionData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}
