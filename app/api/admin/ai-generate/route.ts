import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, model, provider, temperature, max_tokens, apiKey } = await req.json();

    if (!prompt || !model || !provider) {
      return NextResponse.json({ error: 'Missing required fields: prompt, model, provider' }, { status: 400 });
    }

    const isOllama = provider === 'ollama';
    const apiUrl = isOllama
      ? 'http://localhost:11434/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(isOllama ? {} : { Authorization: `Bearer ${apiKey}` }),
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature ?? (isOllama ? 0.7 : 1),
        max_tokens: max_tokens ?? (isOllama ? 8192 : 2048),
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error (${response.status}):`, errorText.slice(0, 500));
      return NextResponse.json(
        { error: `AI API returned ${response.status}`, details: errorText.slice(0, 500) },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({ success: true, content });
  } catch (error: any) {
    console.error('AI generate error:', error);
    return NextResponse.json(
      { error: 'Failed to call AI API', details: error.message },
      { status: 500 }
    );
  }
}
