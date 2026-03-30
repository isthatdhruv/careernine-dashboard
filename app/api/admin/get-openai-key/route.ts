import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
  }
  return NextResponse.json({ apiKey });
}
