import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTenantFromHost } from './app/lib/tenant-config';

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const tenant = await getTenantFromHost(host);

  // Add tenant information to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant', tenant || 'default');

  // Continue with the request
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 