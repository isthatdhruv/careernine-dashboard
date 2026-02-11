import { NextRequest, NextResponse } from 'next/server';

const TENANT_PASSWORD_ENV_KEYS: Record<string, string> = {
  main: 'ADMIN_PASSWORD',
  aspire: 'ASPIRE_ADMIN_PASSWORD',
  nbis: 'NBIS_ADMIN_PASSWORD',
  dalimss: 'DALIMSS_ADMIN_PASSWORD',
  kvs: 'KVS_ADMIN_PASSWORD',
  dps: 'DPS_ADMIN_PASSWORD',
};

function getValidPasswords(): string[] {
  return Object.values(TENANT_PASSWORD_ENV_KEYS)
    .map((key) => process.env[key])
    .filter((val): val is string => Boolean(val));
}

/**
 * Verify admin password from X-Admin-Password header.
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export function verifyAdmin(req: NextRequest): NextResponse | null {
  const password = req.headers.get('x-admin-password');
  const validPasswords = getValidPasswords();

  if (!password || validPasswords.length === 0 || !validPasswords.includes(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

/**
 * Verify a password for a specific tenant.
 * Returns true if the password matches.
 */
export function verifyTenantPassword(password: string, tenant: string): boolean {
  const envKey = TENANT_PASSWORD_ENV_KEYS[tenant] || TENANT_PASSWORD_ENV_KEYS.main;
  const expected = process.env[envKey];
  return Boolean(expected && password === expected);
}
