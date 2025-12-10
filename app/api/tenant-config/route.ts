import { NextRequest, NextResponse } from 'next/server';
import { getTenantConfig, DEFAULT_TENANT_CONFIG } from '../../server/tenant-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const tenant = request.headers.get('x-tenant') || 'default';
  
  console.log('Tenant config request for:', tenant);
  
  try {
    const config = await getTenantConfig(tenant);
    
    if (config) {
      console.log('Tenant config found:', config.id, 'payments enabled:', config.features.enablePayments);
      return NextResponse.json(config);
    } else {
      console.log('No tenant config found for:', tenant, 'falling back to default');
      return NextResponse.json(DEFAULT_TENANT_CONFIG);
    }
  } catch (error) {
    console.error('Error fetching tenant config for:', tenant, error);
    return NextResponse.json(DEFAULT_TENANT_CONFIG);
  }
} 