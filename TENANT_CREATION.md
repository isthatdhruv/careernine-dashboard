# Tenant Creation Guide

This guide explains how to create a new tenant in the Career Navigator 360 application.

## Quick Start

Create a tenant with all details and password in one command:

```bash
node scripts/create-tenant.js <subdomain> [name] [enablePayments] [enableCalendly] [calendlyUrl] [supportEmail] [adminPassword]
```

**Example:**
```bash
node scripts/create-tenant.js mytenant "My Company" true true "https://calendly.com/your-link/30min" "support@mycompany.com" MyPassword123
```

## Prerequisites

1. **Environment Setup**: Ensure you have a `.env.local` file in the project root with the following Firebase Admin credentials:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

2. **Dependencies**: Make sure all npm packages are installed:
   ```bash
   npm install
   ```

## Creating a Tenant

### Basic Command

Use the `create-tenant.js` script to create a new tenant:

```bash
node scripts/create-tenant.js <subdomain> [name] [enablePayments] [enableCalendly] [calendlyUrl] [supportEmail] [adminPassword]
```

### Parameters

| Parameter | Required | Description | Default |
|-----------|----------|-------------|---------|
| `subdomain` | ✅ Yes | Unique subdomain identifier (lowercase letters, numbers, and hyphens only) | - |
| `name` | No | Display name for the tenant | "Career Navigator 360" |
| `enablePayments` | No | Enable payment features (`true` or `false`) | `false` |
| `enableCalendly` | No | Enable Calendly integration (`true` or `false`) | `false` |
| `calendlyUrl` | No | Calendly scheduling URL (only used if `enableCalendly` is `true`) | - |
| `supportEmail` | No | Support email address | "support@career-9.com" |
| `adminPassword` | No | Admin password for accessing the admin dashboard | - |

### Examples

#### Example 1: Basic Tenant (No Payments, No Calendly)
```bash
node scripts/create-tenant.js mytenant
```

#### Example 2: Tenant with Payments Enabled
```bash
node scripts/create-tenant.js mytenant "My Company Name" true false
```

#### Example 3: Full-Featured Tenant (Payments + Calendly)
```bash
node scripts/create-tenant.js mytenant "My Company Name" true true "https://calendly.com/your-link/30min" "support@mycompany.com"
```

#### Example 4: Tenant with Custom Name and Support Email
```bash
node scripts/create-tenant.js mytenant "Acme Corp" false false "" "help@acme.com"
```

#### Example 5: Complete Tenant Setup with Password (Recommended)
```bash
node scripts/create-tenant.js mytenant "My Company Name" true true "https://calendly.com/your-link/30min" "support@mycompany.com" "MySecurePassword123"
```

This creates the tenant and sets the admin password in one command!

## Verification

After creating a tenant, verify it was created successfully:

### List All Tenants
```bash
node scripts/list-tenants.js
```

This will display all tenants with their configuration details including:
- ID/Subdomain
- Name
- Payment status
- Calendly status
- Creation date

## Setting Tenant Admin Password

You can set the admin password in two ways:

### Option 1: Set Password During Tenant Creation (Recommended)

Include the password as the last parameter when creating the tenant:

```bash
node scripts/create-tenant.js <subdomain> [name] [enablePayments] [enableCalendly] [calendlyUrl] [supportEmail] <adminPassword>
```

**Example:**
```bash
node scripts/create-tenant.js mytenant "My Company" true false "" "support@mycompany.com" MySecurePassword123
```

### Option 2: Set Password After Tenant Creation

If you didn't set a password during creation, or want to update it later:

### Command

```bash
node scripts/set-tenant-password.js <subdomain> <password>
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `subdomain` | ✅ Yes | The subdomain of the tenant |
| `password` | ✅ Yes | The admin password for the tenant |

### Examples

#### Set Password for a Tenant
```bash
node scripts/set-tenant-password.js mytenant MySecurePassword123
```

#### Set Password for Aspire Tenant
```bash
node scripts/set-tenant-password.js aspire C-9-Aspire2025
```

#### Update an Existing Password
```bash
node scripts/set-tenant-password.js mytenant NewPassword456
```

### How It Works

1. **Password Storage**: The password is stored in Firestore under `settings.adminPassword` in the tenant's configuration document
2. **Dashboard Authentication**: The admin dashboard automatically fetches the tenant configuration and uses the password from Firestore
3. **Fallback Support**: For backward compatibility, the dashboard falls back to hardcoded passwords if no password is set in Firestore for existing tenants

### Important Notes

1. **Password Security**: Choose a strong, secure password for production tenants
2. **Immediate Effect**: Once set, the password takes effect immediately - no code changes needed
3. **Access**: Use this password to access the admin dashboard at `/admin/dashboard` for the specific tenant
4. **Updating Passwords**: You can run the script again with a new password to update an existing tenant's password
5. **No Code Changes Required**: Unlike the old hardcoded approach, you don't need to modify any code files

### Legacy Hardcoded Passwords (Fallback Only)

The following passwords are still hardcoded as fallbacks for existing tenants (only used if no password is set in Firestore):
- **Main domain**: `admin2024`
- **Aspire**: `C-9-Aspire2025`
- **NBIS**: `NBIS-Career-9@2025`
- **DALIMSS**: `Career-9@2025`
- **KVS**: `Career-9@2025`

**Note**: For new tenants, always set the password using the script. The hardcoded passwords are only for backward compatibility.

## Tenant Configuration Structure

Each tenant is stored in Firestore with the following structure:

```javascript
{
  id: "subdomain",
  name: "Display Name",
  subdomain: "subdomain",
  features: {
    enablePayments: true/false,
    enableCalendly: true/false
  },
  settings: {
    supportEmail: "support@example.com",
    calendlyUrl: "https://calendly.com/...", // optional
    adminPassword: "..." // optional, set using set-tenant-password.js script - dashboard reads from Firestore
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Important Notes

1. **Subdomain Validation**: 
   - Must contain only lowercase letters, numbers, and hyphens
   - Example: `my-tenant-123` ✅
   - Example: `My_Tenant` ❌ (uppercase and underscores not allowed)

2. **Uniqueness**: The script will check if a tenant with the same subdomain already exists and prevent duplicates.

3. **Default Tenant**: The `default` tenant is typically used for the main application instance.

4. **Payment-Free Tenants**: Some tenants (like `aspire`) have payments disabled, allowing instant registration without payment flow.

## Troubleshooting

### Error: "Invalid subdomain"
- Ensure the subdomain uses only lowercase letters, numbers, and hyphens
- No spaces, uppercase letters, or special characters

### Error: "Tenant with subdomain 'X' already exists"
- The subdomain is already in use
- Use `node scripts/list-tenants.js` to see existing tenants
- Choose a different subdomain

### Error: "Missing Firebase Admin credentials"
- Verify your `.env.local` file exists and contains all required Firebase credentials
- Check that the file is in the project root directory

## Deleting a Tenant

You can delete a tenant using the `delete-tenant.js` script. The script supports both interactive and command-line modes.

### Interactive Mode (Recommended)

Run the script without arguments to see a list of all tenants and select one to delete:

```bash
node scripts/delete-tenant.js
```

The script will:
1. List all available tenants
2. Ask you to select a tenant (by number or subdomain)
3. Check for associated users
4. Optionally reassign users to another tenant
5. Ask for confirmation before deleting

### Command-Line Mode

Delete a tenant directly by providing the subdomain:

```bash
node scripts/delete-tenant.js <subdomain>
```

**Example:**
```bash
node scripts/delete-tenant.js mytenant
```

### Reassigning Users

If a tenant has associated users, you can reassign them to another tenant during deletion:

```bash
node scripts/delete-tenant.js <subdomain> --reassign <target-tenant>
```

**Example:**
```bash
node scripts/delete-tenant.js old-tenant --reassign default
```

This will:
1. Reassign all users from `old-tenant` to `default`
2. Delete the `old-tenant` configuration

### Important Notes

1. **User Data**: Deleting a tenant does NOT delete associated user accounts. Users will still exist but may reference a non-existent tenant.
2. **Reassignment**: It's recommended to reassign users to another tenant (like `default`) before deletion.
3. **Irreversible**: Tenant deletion is permanent and cannot be undone.
4. **Confirmation**: The script always asks for confirmation before deleting.

## Related Scripts

- **List Tenants**: `node scripts/list-tenants.js`
- **Set Tenant Password**: `node scripts/set-tenant-password.js <subdomain> <password>`
- **Delete Tenant**: `node scripts/delete-tenant.js [subdomain] [--reassign <target>]`
- **Test Tenant Setup**: `node scripts/test-tenant.js` (creates test tenants for development)

