import { db } from './firebase-admin';

export interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  title: string;
  features: {
    enablePayments: boolean;
    enableCalendly: boolean;
  };
  settings: {
    calendlyUrl?: string;
    supportEmail: string;
  };
}

// Default tenant configuration
export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  id: 'default',
  name: 'Career Navigator 360',
  subdomain: 'default',
  title: 'Career Navigator 360',
  features: {
    enablePayments: false, // Payments disabled across all tenants
    enableCalendly: false, // Calendly disabled across all tenants
  },
  settings: {
    calendlyUrl: 'https://calendly.com/prasad-khake-career-9/30min',
    supportEmail: 'support@career-9.com',
  },
};

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

export async function getTenantFromHost(host: string): Promise<string | null> {
  // Extract subdomain from host
  const parts = host.split('.');
  if (parts.length > 2) {
    return parts[0];
  }
  return null;
} 