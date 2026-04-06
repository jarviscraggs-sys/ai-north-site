import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages, role } = await req.json();

  const systemPrompts: Record<string, string> = {
    contractor: `You are ClearClaim Assistant, a helpful AI for contractors using the ClearClaim construction management platform. You help contractors with:
- Managing subcontractor invoices (approving, querying, rejecting)
- Understanding CIS deductions and how to set rates
- Using the retention tracking features
- Setting up and managing projects
- Reading and exporting CIS monthly returns
- Managing employee timesheets and holiday requests
- Using the compliance tracker for subcontractor documents
- Understanding the cash flow forecast
- Raising and managing disputes
- Importing invoices in bulk
- Inviting subcontractors and employees
Always be concise, helpful and specific to ClearClaim features. If asked something outside ClearClaim, politely redirect to platform-related help.`,

    subcontractor: `You are ClearClaim Assistant, a helpful AI for subcontractors using the ClearClaim platform. You help subcontractors with:
- Submitting Applications for Payment (invoices)
- Understanding how to add job lines and descriptions
- What CIS deductions mean and how they affect your payment
- Tracking invoice status (pending, approved, queried, rejected)
- Responding to queries from your contractor
- Downloading payment certificates
- Understanding retention and when it gets released
- Submitting variations and change orders
- Using your monthly CIS and VAT return reports
- Downloading your earnings history
Always be concise, friendly and specific to ClearClaim features.`,

    employee: `You are ClearClaim Assistant, a helpful AI for employees using the ClearClaim platform. You help employees with:
- Submitting weekly timesheets (how to log hours, what overtime means)
- Requesting holiday and annual leave
- Understanding the team holiday calendar and why some dates are blocked
- Checking your holiday allowance and days remaining
- Viewing your submitted timesheets and their approval status
- Understanding what happens after you submit a timesheet
- Using the settings page to update your profile
Always be friendly, simple and specific to ClearClaim features.`,
  };

  const systemPrompt = systemPrompts[role] || systemPrompts.contractor;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      content:
        "Hi! I'm the ClearClaim Assistant. The AI isn't fully configured yet — but I'm here to help. For platform questions, try the documentation or contact your administrator.",
    });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10),
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return NextResponse.json({ content });
  } catch (e) {
    console.error('Chat API error:', e);
    return NextResponse.json({
      content: "I'm having trouble connecting right now. Please try again in a moment.",
    });
  }
}
