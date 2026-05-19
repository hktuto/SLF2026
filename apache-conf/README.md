# Apache Configuration Setup Guide (Cloudflare Origin CA)

This directory contains Apache virtual host configurations for the Hong Kong Reading Week website using **Cloudflare Origin CA certificates**.

## Architecture

```
User → HTTPS (Cloudflare Edge Cert) → Cloudflare → HTTPS (Origin CA Cert) → Apache → App
```

## Files

| File | Description |
|------|-------------|
| `hkrw2026.readingpromotion.gov.hk.conf` | Frontend (Nuxt.js on port 3001) - **Current test domain** |
| `hkrw2026-admin.readingpromotion.gov.hk.conf` | Backend (Strapi on port 1338) |

> **Note**: Frontend is currently using `hkrw2026.readingpromotion.gov.hk` for testing. Will be renamed to `hkrw.readingpromotion.gov.hk` after confirmation.

## Prerequisites

Install required Apache modules:

```bash
# Enable required modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod ssl
sudo a2enmod deflate
sudo a2enmod remoteip  # For getting real client IP from Cloudflare

# Restart Apache
sudo systemctl restart apache2
```

## Step 1: Generate Cloudflare Origin CA Certificate

### In Cloudflare Dashboard:

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain: `readingpromotion.gov.hk`
3. Go to **SSL/TLS** → **Origin Server**
4. Click **Create Certificate**

### Certificate Options:

| Option | Value |
|--------|-------|
| Private key type | RSA (2048) |
| Certificate Validity | 15 years |
| Hostnames | `hkrw2026.readingpromotion.gov.hk`, `hkrw2026-admin.readingpromotion.gov.hk` |

5. Click **Create**
6. **Save both files**:
   - `origin-cert.pem` - Origin Certificate
   - `origin-key.pem` - Private Key

> ⚠️ **Important**: Private key is shown only once! Save it securely.

## Step 2: Install Certificate on Server

```bash
# Create directory for certificates
sudo mkdir -p /etc/ssl/cloudflare

# Upload/copy the certificate files to server
# Then move them to the correct location:
sudo mv /path/to/origin-cert.pem /etc/ssl/cloudflare/
sudo mv /path/to/origin-key.pem /etc/ssl/cloudflare/

# Set secure permissions
sudo chmod 600 /etc/ssl/cloudflare/origin-key.pem
sudo chmod 644 /etc/ssl/cloudflare/origin-cert.pem

# Verify files
ls -la /etc/ssl/cloudflare/
```

## Step 3: Configure Cloudflare DNS

In Cloudflare Dashboard:

1. Go to **DNS** → **Records**
2. Create/update A records pointing to your new server IP:

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| A | `hkrw2026` | YOUR_SERVER_IP | 🟡 Proxied |
| A | `hkrw2026-admin` | YOUR_SERVER_IP | 🟡 Proxied |

3. Ensure **Proxy Status** is set to **Proxied** (orange cloud icon)

## Step 4: Configure Cloudflare SSL/TLS Mode

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)**

> This ensures Cloudflare validates the Origin CA certificate.

## Step 5: Copy Apache Configurations

```bash
# Copy config files to Apache sites-available
sudo cp apache-conf/hkrw2026.readingpromotion.gov.hk.conf /etc/apache2/sites-available/
sudo cp apache-conf/hkrw2026-admin.readingpromotion.gov.hk.conf /etc/apache2/sites-available/
```

## Step 6: Enable Sites

```bash
# Enable both sites
sudo a2ensite hkrw2026.readingpromotion.gov.hk.conf
sudo a2ensite hkrw2026-admin.readingpromotion.gov.hk.conf

# Disable default site (optional)
sudo a2dissite 000-default.conf

# Test configuration
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2
```

## Step 7: Update ecosystem.config.js

The config has been updated with:

```javascript
// For backend
FRONT_URL: "https://hkrw2026.readingpromotion.gov.hk"

// For frontend  
STRAPI_URL: "https://hkrw2026-admin.readingpromotion.gov.hk"
```

## Step 8: Start Services with PM2

```bash
# Build both applications
pnpm prestart:all

# Start with PM2
pnpm start:all

# Check status
pnpm status:all
```

## Step 9: Configure PM2 Auto-Start on Boot

```bash
# Generate startup script
pm2 startup systemd

# Copy and run the command that PM2 outputs, for example:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Save current PM2 processes
pm2 save

# Check startup status
sudo systemctl status pm2-$(whoami)
```

---

## 🔀 Renaming to Production Domain (After Testing)

After confirming everything works, follow these steps to rename `hkrw2026` → `hkrw`:

### 1. Update Cloudflare Origin CA Certificate

In Cloudflare Dashboard → **SSL/TLS** → **Origin Server**:
1. Create a new certificate with updated hostnames:
   - `hkrw.readingpromotion.gov.hk`
   - `hkrw2026-admin.readingpromotion.gov.hk`
2. Save the new certificate files to `/etc/ssl/cloudflare/`

### 2. Update Apache Configuration

```bash
# Create new config file for production domain
sudo cp /etc/apache2/sites-available/hkrw2026.readingpromotion.gov.hk.conf \
        /etc/apache2/sites-available/hkrw.readingpromotion.gov.hk.conf

# Update ServerName in the new config
sudo sed -i 's/hkrw2026.readingpromotion.gov.hk/hkrw.readingpromotion.gov.hk/g' \
    /etc/apache2/sites-available/hkrw.readingpromotion.gov.hk.conf

# Disable test site, enable production site
sudo a2dissite hkrw2026.readingpromotion.gov.hk.conf
sudo a2ensite hkrw.readingpromotion.gov.hk.conf

# Reload Apache
sudo systemctl reload apache2
```

### 3. Update Backend CORS

In `/etc/apache2/sites-available/hkrw2026-admin.readingpromotion.gov.hk.conf`, update:

```apache
Header always set Access-Control-Allow-Origin "https://hkrw.readingpromotion.gov.hk"
```

Then reload Apache:
```bash
sudo systemctl reload apache2
```

### 4. Update ecosystem.config.js

```javascript
FRONT_URL: "https://hkrw.readingpromotion.gov.hk"
```

### 5. Update Cloudflare DNS

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| A | `hkrw` | YOUR_SERVER_IP | 🟡 Proxied |
| A | `hkrw2026` | YOUR_SERVER_IP | 🟡 Proxied (can keep for fallback) |

### 6. Restart Services

```bash
pnpm restart:all
```

---

## Certificate Renewal

Cloudflare Origin CA certificates are valid for **15 years**, so you don't need auto-renewal like Let's Encrypt. Just remember:

- Mark the expiry date in your calendar
- The certificate is only valid when traffic goes through Cloudflare
- Direct access to the origin IP will show certificate warnings (expected)

## Troubleshooting

### Check Apache status
```bash
sudo systemctl status apache2
sudo apache2ctl configtest
```

### Check Apache error logs
```bash
sudo tail -f /var/log/apache2/hkrw-frontend-ssl-error.log
sudo tail -f /var/log/apache2/hkrw-backend-ssl-error.log
```

### Verify certificate
```bash
# Check certificate info
sudo openssl x509 -in /etc/ssl/cloudflare/origin-cert.pem -text -noout | grep -A2 "Subject Alternative Name"
```

### Check Cloudflare connectivity
```bash
# From your local machine
curl -I https://hkrw2026.readingpromotion.gov.hk

# Should show Cloudflare headers:
# CF-RAY: xxx
# Server: cloudflare
```

### Common Issues

| Issue | Solution |
|-------|----------|
| 521 Web Server is Down | Apache not running or firewall blocking Cloudflare IPs |
| 525 SSL Handshake Failed | Wrong certificate, not set to Full (strict) mode, or cert not installed |
| 526 Invalid SSL Certificate | Cloudflare not set to Full (strict) mode |

## Security Notes

- Origin CA certificates are only trusted by Cloudflare - they won't work for direct access
- Keep your private key secure (chmod 600)
- The certificate is valid for 15 years
- Always use **Full (strict)** mode in Cloudflare
