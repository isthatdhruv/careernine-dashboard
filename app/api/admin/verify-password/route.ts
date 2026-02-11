import { NextRequest, NextResponse } from 'next/server';
import { verifyTenantPassword } from '@/app/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const { password, tenant } = await req.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const valid = verifyTenantPassword(password, tenant || 'main');
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
}
