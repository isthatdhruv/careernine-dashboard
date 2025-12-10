import type { TenantConfig } from './tenant-shared';
import { DEFAULT_TENANT_CONFIG } from './tenant-shared';

export type { TenantConfig };
export { DEFAULT_TENANT_CONFIG } from './tenant-shared';
export { getTenantFromHost } from './tenant-shared';

export async function getTenantConfig(subdomain: string): Promise<TenantConfig> {
  try {
    const response = await fetch('/api/tenant-config', {
      headers: {
        'x-tenant': subdomain,
      },
    });
    const config = await response.json() as TenantConfig;
    return config;
  } catch (error) {
    console.error('Error fetching tenant config:', error);
    return DEFAULT_TENANT_CONFIG;
  }
}
