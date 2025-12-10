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
    adminPassword?: string;
  };
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  id: 'default',
  name: 'Career Navigator 360',
  subdomain: 'default',
  title: 'Career Navigator 360',
  features: {
    enablePayments: false,
    enableCalendly: false,
  },
  settings: {
    calendlyUrl: 'https://calendly.com/prasad-khake-career-9/30min',
    supportEmail: 'support@career-9.com',
  },
};

export function getTenantFromHost(host: string): string | null {
  const parts = host.split('.');
  if (parts.length > 2) {
    return parts[0];
  }
  return null;
}



