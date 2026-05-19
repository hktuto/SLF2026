module.exports = {
  apps: [
    {
      name: "slf2026-backend",
      script: "pnpm",
      args: "start:backend",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: 1338,
        APP_KEYS: "toBeModified1,toBeModified2",
        API_TOKEN_SALT: "tobemodified",
        ADMIN_JWT_SECRET: "tobemodified",
        TRANSFER_TOKEN_SALT: "tobemodified",
        JWT_SECRET: "tobemodified",
        FRONT_URL: "https://slf2026.readingpromotion.gov.hk",
      },
    },
    {
      name: "slf2026-frontend",
      script: "./apps/hkrw2026/.output/server/index.mjs",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        STRAPI_URL: "https://slf2026-admin.readingpromotion.gov.hk",
      },
      // Log files
      log_file: "./logs/frontend_combined.log",
      out_file: "./logs/frontend_out.log",
      error_file: "./logs/frontend_error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Merge logs from all instances
      merge_logs: true,
      // Time to wait before forcing a reload
      kill_timeout: 5000,
      // Number of retries on failure
      restart_delay: 3000,
      // Max restarts within 60 seconds before stopping
      max_restarts: 10,
      // Min uptime to be considered stable (ms)
      min_uptime: "10s",
    },
  ],
};
