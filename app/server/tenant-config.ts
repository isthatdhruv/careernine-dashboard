import { db } from '../lib/firebase-admin';
import type { TenantConfig } from '../lib/tenant-shared';

export type { TenantConfig };
export { DEFAULT_TENANT_CONFIG, getTenantFromHost } from '../lib/tenant-shared';

export async function getTenantConfig(subdomain: string): Promise<TenantConfig | null> {
  try {
    const tenantDoc = await db.collection('tenants').doc(subdomain).get();
    if (!tenantDoc.exists) {
      return null;
    }
    return tenantDoc.data() as TenantConfig;
  } catch (error) {
    console.error('Error fetching tenant config:', error);
    return null;
  }
}
