# Library 2025 - Hong Kong Reading Week

## Project Overview

This is a **monorepo** for the Hong Kong Reading Week (香港悅讀周) website. It consists of a headless CMS backend and a frontend web application, designed to promote reading activities across Hong Kong.

### Key Information
- **Project Name**: Library 2025 / Hong Kong Reading Week
- **Type**: Event website with content management
- **Language Support**: Trilingual (English, Traditional Chinese 繁體中文, Simplified Chinese 簡體中文)
- **Live URLs**: 
  - Frontend: https://hkrw.readingpromotion.gov.hk/
  - Backend: Runs on server at port 1338

## Technology Stack

### Backend (CMS)
- **Framework**: [Strapi v5.36.0](https://strapi.io/) - Headless CMS
- **Runtime**: Node.js
- **Database**: 
  - Development: SQLite (better-sqlite3)
  - Production: PostgreSQL (pg driver configured)
- **Authentication**: JWT-based with Users & Permissions plugin
- **Media**: Local file upload provider

### Frontend
- **Framework**: [Nuxt 3](https://nuxt.com/) (Vue 3 with TypeScript)
- **Rendering Mode**: SPA (ssr: false)
- **Styling**: SCSS + Element Plus UI library
- **State Management**: Vue Composition API with Signals (@preact/signals)
- **Calendar**: Schedule-X calendar component
- **Slider**: Swiper.js
- **Animation**: @hypernym/nuxt-anime

### Package Management
- **Tool**: pnpm
- **Workspace**: Monorepo managed via `pnpm-workspace.yaml`

### Process Management (Production)
- **Tool**: PM2 (configured in `ecosystem.config.js`)

## Project Structure

```
library-unify-web/
├── apps/
│   ├── backend/              # Strapi CMS
│   │   ├── config/           # Strapi configuration files
│   │   ├── src/
│   │   │   ├── api/          # Content type definitions (APIs)
│   │   │   │   ├── book/         # Book content type
│   │   │   │   ├── category/     # Event categories
│   │   │   │   ├── district/     # Hong Kong districts
│   │   │   │   ├── event/        # Events
│   │   │   │   ├── footer/       # Footer (single type)
│   │   │   │   ├── half-an-hour/ # "Read Together for Half an Hour" events
│   │   │   │   ├── home/         # Homepage (single type)
│   │   │   │   ├── menu/         # Navigation menu (single type)
│   │   │   │   ├── page/         # Generic pages
│   │   │   │   └── popup/        # Popup modal (single type)
│   │   │   ├── components/   # Reusable components (UI, Programs)
│   │   │   └── extensions/   # Strapi extensions
│   │   └── public/uploads/   # Uploaded media files
│   └── hkrw2026/            # Nuxt 3 Frontend
│       ├── components/       # Vue components
│       │   ├── calendar/     # Calendar-related components
│       │   ├── category/     # Category display components
│       │   ├── event/        # Event detail components
│       │   ├── header/       # Header, menu, navigation
│       │   ├── rainbow/      # Rainbow animation effects
│       │   └── ui/           # Generic UI components
│       ├── composables/      # Vue composables (composables/lang.ts for i18n)
│       ├── layouts/          # Nuxt layouts
│       ├── middleware/       # Route middleware
│       ├── pages/            # Page routes
│       ├── plugins/          # Nuxt plugins
│       ├── public/           # Static assets
│       └── utils/            # Utility functions (Chinese conversion helpers)
├── utils/                    # Migration scripts
│   ├── migrate-strapi-data.js           # Simple migration
│   └── migrate-strapi-data-advanced.js  # Advanced migration with media
└── logs/                     # PM2 log files
```

## Content Types (Backend)

### Collection Types
- **event**: Events with programs, categories, media support
- **category**: Event categories with colors, features
- **district**: Hong Kong districts
- **half-an-hour**: Special "Read Together for Half an Hour" events
- **page**: Generic content pages
- **book**: Book listings

### Single Types
- **home**: Homepage configuration with slider and menu
- **menu**: Navigation menu structure
- **footer**: Footer content
- **popup**: Popup modal content

### Components
- **ui.slide**: Slider/carousel items with images/videos
- **ui.menu-item**: Navigation menu items
- **ui.sub-menu**: Sub-menu items
- **programs.program**: Event program details with dates, locations, registration

## Available Scripts

### Root Level (package.json)

```bash
# Development
pnpm dev                    # Start backend in development mode
pnpm dev:backend           # Start Strapi backend only
pnpm dev:frontend          # Start Nuxt frontend only

# Production Build
pnpm build:backend         # Build Strapi admin panel
pnpm build:frontend        # Build Nuxt for production

# Production Start
pnpm prestart:all          # Build both backend and frontend
pnpm start:all             # Start both apps with PM2
pnpm stop:all              # Stop all PM2 processes
pnpm restart:all           # Restart all PM2 processes
pnpm reload:all            # Reload all PM2 processes
pnpm delete:all            # Delete all PM2 processes

# Monitoring
pnpm status:all            # Check PM2 status
pnpm logs:all              # View PM2 logs
pnpm monit                 # Open PM2 monitoring dashboard

# Data Migration
pnpm migrate               # Run simple Strapi data migration
pnpm migrate:advanced      # Run advanced migration with media
pnpm migrate:dry-run       # Simulate migration without changes
```

### Backend (apps/backend/)

```bash
pnpm dev                   # Start Strapi in development mode (with auto-reload)
pnpm start                 # Start Strapi in production mode
pnpm build                 # Build Strapi admin panel
pnpm strapi                # Strapi CLI
```

### Frontend (apps/hkrw2026/)

```bash
pnpm dev                   # Start Nuxt development server (http://localhost:3001)
pnpm build                 # Build for production
pnpm generate              # Generate static site
pnpm preview               # Preview production build
pnpm postinstall           # Prepare Nuxt (runs automatically after install)
```

## Environment Variables

### Backend (.env)
```env
HOST=0.0.0.0
PORT=1338
APP_KEYS="key1,key2"
API_TOKEN_SALT=your_token_salt
ADMIN_JWT_SECRET=your_jwt_secret
TRANSFER_TOKEN_SALT=your_transfer_token_salt
JWT_SECRET=your_jwt_secret
FRONT_URL=http://localhost:3001

# Database (for PostgreSQL)
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=strapi
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=strapi
```

### Frontend (.env)
```env
STRAPI_URL=http://localhost:1338
```

## Development Conventions

### Code Style
- **Frontend**: TypeScript with Vue 3 Composition API
- **Styling**: SCSS with CSS variables for theming
- **Component Naming**: PascalCase for components, camelCase for composables
- **File Structure**: Feature-based organization

### Internationalization (i18n)
The project uses a custom i18n implementation via `useLang` composable:
- Fields are suffixed with language code: `_HK` (Traditional Chinese), `_EN` (English), `_CN` (Simplified Chinese)
- Automatic conversion between Traditional and Simplified Chinese using character mapping
- Language switching via query parameter (`?lang=TC|SC|EN`) or localStorage

### API Integration
- Uses `@nuxtjs/strapi` module for Strapi integration
- Strapi v5 API format with `data` and `meta` wrappers
- Image URLs are processed via `imgUrlConverter` utility to handle both local and external (DigitalOcean Spaces) storage

### Key CSS Variables
```css
--app-padding: 15px;
--body-width: 1280px;
--header-height: 60px;
--app-radius: 12px;
--footer-color: #4eb967;
--app-primary-color: #7544e7;
--menu-bg: rgba(155, 122, 233, 0.8);
```

## Testing Strategy

Currently, the project does not have automated tests configured. Manual testing is performed through:
1. Development server testing
2. Preview environment testing before deployment
3. Production monitoring via PM2 logs

## Deployment

### Production Setup
- **Server**: Ubuntu server with Node.js
- **Process Manager**: PM2 manages both backend and frontend
- **Backend Port**: 1338
- **Frontend Port**: 3001
- **Reverse Proxy**: Nginx (configured externally)

### Deployment Steps
1. Build the backend: `pnpm build:backend`
2. Build the frontend: `pnpm build:frontend`
3. Start with PM2: `pnpm start:all`

### Vercel Configuration
The frontend includes `vercel.json` with security headers:
- Content Security Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security

## Data Migration

Migration utilities are available in the `utils/` folder for migrating content from an old Strapi instance to the new one.

### Migration Content Types
- Districts, Categories, Pages, Events, Half-an-hour events
- Single types: Footer, Home, Menu, Popup

### Migration Features
- Two-phase migration (independent types first, then dependent types)
- Media file download and upload
- Relation mapping between content types
- Component handling
- **Selective import** - Import only specific content types
- **Clean before import** - Remove all existing content before importing

### Migration Commands

```bash
# Basic migration
pnpm migrate:advanced

# Dry run (simulate without making changes)
pnpm migrate:dry-run

# Clean only (remove all content without importing)
pnpm migrate:clean

# Fresh migration (clean before import)
pnpm migrate:fresh

# Import only specific content types
IMPORT_ONLY=district,category,event pnpm migrate:advanced

# Clean before import with specific content types
CLEAN_BEFORE_MIGRATE=true IMPORT_ONLY=event pnpm migrate:advanced

# Full list of available content types for IMPORT_ONLY:
# district, category, page, event, half-an-hour, footer, home, menu, popup

# Import all EXCEPT specific content types
EXCLUDE=half-an-hour,event pnpm migrate:advanced

# Combine with clean before import
CLEAN_BEFORE_MIGRATE=true EXCLUDE=half-an-hour,event pnpm migrate:advanced
```

### Environment Variables for Migration

| Variable | Description | Default |
|----------|-------------|---------|
| `OLD_STRAPI_URL` | Source Strapi URL | https://library-2025-nq3wb.ondigitalocean.app |
| `NEW_STRAPI_URL` | Target Strapi URL | http://localhost:1338 |
| `OLD_API_TOKEN` | API token for source | - |
| `NEW_API_TOKEN` | API token for target | - |
| `DRY_RUN` | Simulate without changes | false |
| `SKIP_MEDIA` | Skip media upload | false |
| `CLEAN_BEFORE_MIGRATE` | Remove content before import | false |
| `IMPORT_ONLY` | Comma-separated list of content types | all types |
| `EXCLUDE` | Comma-separated list of content types to exclude | - |

## Security Considerations

1. **CORS**: Configured in `apps/backend/config/middlewares.js` for specific origins
2. **CSP**: Strict Content Security Policy in `vercel.json`
3. **Secrets**: All JWT secrets and tokens must be changed from defaults in production
4. **File Uploads**: Limited to specific file types, stored in `public/uploads/`
5. **API Access**: Configurable via Strapi Users & Permissions plugin

## Important Files

- `ecosystem.config.js` - PM2 process configuration
- `pnpm-workspace.yaml` - pnpm workspace definition
- `apps/backend/config/admin.js` - Preview configuration for draft content
- `apps/hkrw2026/nuxt.config.ts` - Nuxt configuration
- `apps/hkrw2026/composables/lang.ts` - Internationalization logic
- `apps/hkrw2026/utils/helpers.ts` - Chinese text conversion utilities

## Troubleshooting

### Backend Issues
- **Database locked**: SQLite doesn't support concurrent writes; use PostgreSQL in production
- **Build failures**: Check Node.js version compatibility (Strapi 5 requires Node 18+)

### Frontend Issues
- **API connection errors**: Check `STRAPI_URL` environment variable
- **Image not loading**: Verify `imgUrlConverter` handles the image source correctly

### Migration Issues
- **Connection timeout**: Check network access to old Strapi instance
- **Media upload fails**: Verify disk space and upload provider configuration
