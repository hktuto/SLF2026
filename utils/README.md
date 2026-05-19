# Strapi Data Migration Utils

This folder contains scripts to migrate content from the old Strapi instance to the new one.

## Prerequisites

1. Make sure your new Strapi backend is running locally or is accessible
2. Get API tokens if the Strapi instances require authentication

## Configuration

Set environment variables to configure the migration:

| Variable | Default | Description |
|----------|---------|-------------|
| `OLD_STRAPI_URL` | `https://library-2025-nq3wb.ondigitalocean.app` | URL of the old Strapi instance |
| `NEW_STRAPI_URL` | `http://localhost:1338` | URL of the new Strapi instance |
| `OLD_API_TOKEN` | - | API token for old Strapi (if required) |
| `NEW_API_TOKEN` | - | API token for new Strapi (if required) |
| `SKIP_MEDIA` | `false` | Set to `true` to skip media file migration |
| `DRY_RUN` | `false` | Set to `true` to simulate without making changes |
| `CLEAN_BEFORE_MIGRATE` | `true` | Set to `false` to skip cleaning new Strapi before migration |

## Scripts

### Simple Migration (`migrate-strapi-data.js`)

Basic migration that transfers content data without media files.

```bash
# Run from root directory
pnpm migrate

# Or with custom URLs
OLD_STRAPI_URL=https://old-site.com NEW_STRAPI_URL=http://localhost:1338 pnpm migrate
```

### Advanced Migration (`migrate-strapi-data-advanced.js`)

Advanced migration that includes:
- Media file download and upload
- Relation mapping between content types
- Component handling
- Two-phase migration (independent types first, then dependent types)

```bash
# Run from root directory
pnpm migrate:advanced

# Dry run (simulate without making changes)
pnpm migrate:dry-run

# Skip media migration
SKIP_MEDIA=true pnpm migrate:advanced

# Skip cleaning (append to existing data)
CLEAN_BEFORE_MIGRATE=false pnpm migrate:advanced

# With API tokens
OLD_API_TOKEN=xxx NEW_API_TOKEN=yyy pnpm migrate:advanced

# Full example with all options
CLEAN_BEFORE_MIGRATE=true SKIP_MEDIA=false DRY_RUN=false pnpm migrate:advanced
```

## Content Types Migrated

### Collection Types
- `category` - Categories with relations to events
- `district` - Districts
- `event` - Events with relations to categories
- `half-an-hour` - Half an Hour events with district relations
- `page` - Pages

### Single Types
- `footer` - Footer content
- `home` - Home page
- `menu` - Menu configuration
- `popup` - Popup content

## Migration Order

The migration runs in two phases to handle relations correctly:

1. **Phase 1 - Independent Types**: district, category, page, footer, popup
2. **Phase 2 - Dependent Types**: event, half-an-hour, home, menu

This ensures that when migrating events (which have category relations), the categories already exist in the new Strapi.

## Troubleshooting

### Connection Issues
- Make sure the old Strapi URL is accessible
- Ensure the new Strapi is running before starting migration
- Check firewall/network settings

### Authentication
If your Strapi instances require authentication:
1. Generate API tokens in both Strapi admin panels
2. Set `OLD_API_TOKEN` and `NEW_API_TOKEN` environment variables

### Media Migration Failures
- Set `SKIP_MEDIA=true` to skip media and migrate only content
- Check disk space for temporary media downloads
- Verify that the new Strapi has the upload provider configured

### Relation Issues
- Make sure all content types exist in the new Strapi with the same schema
- Run the migration in the correct order (don't skip phases)

## Manual Steps After Migration

1. **Review migrated content** in the new Strapi admin panel
2. **Check media files** are properly linked
3. **Verify relations** between content types
4. **Publish content** if using draft/publish (migrated content may be in draft state)
5. **Update permissions** for public/API access if needed
