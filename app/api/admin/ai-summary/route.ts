import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const adminPassword = req.headers.get('x-admin-password');
  const validPasswords = [
    process.env.ADMIN_PASSWORD,
    process.env.ASPIRE_ADMIN_PASSWORD,
    process.env.NBIS_ADMIN_PASSWORD,
    process.env.DALIMSS_ADMIN_PASSWORD,
    process.env.KVS_ADMIN_PASSWORD,
    process.env.DPS_ADMIN_PASSWORD,
  ].filter(Boolean);

  if (!adminPassword || !validPasswords.includes(adminPassword)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured on server' }, { status: 500 });
  }

  try {
    const { prompt, model, temperature, max_tokens } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature ?? 1,
        max_tokens: max_tokens ?? 2048,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'OpenAI API error' },
        { status: response.status }
      );
    }

    const content = (data.choices?.[0]?.message?.content || '').replace(/\*\*\*/g, '').trim();
    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
