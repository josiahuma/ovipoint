// app/api/send-sms/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing "to" or "message"' },
        { status: 400 }
      );
    }

    const apiKey = process.env.TXTLOCAL_API_KEY;
    const sender = process.env.TXTLOCAL_SENDER || 'MOTA';

    if (!apiKey) {
      console.error('TXTLOCAL_API_KEY not set');
      return NextResponse.json(
        { error: 'SMS service not configured' },
        { status: 500 }
      );
    }

    // TxtLocal expects POST form data
    const params = new URLSearchParams();
    params.append('apikey', apiKey);
    params.append('numbers', to.replace(/\s+/g, ''));
    params.append('sender', sender);
    params.append('message', message);

    const response = await fetch(
      'https://api.txtlocal.com/send/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    const data = await response.json();

    if (data.status !== 'success') {
      console.error('TxtLocal error:', data);
      return NextResponse.json(
        { error: 'Failed to send SMS', details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('SMS send error', err);
    return NextResponse.json(
      { error: 'Internal SMS error' },
      { status: 500 }
    );
  }
}
