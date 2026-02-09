// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "ws-app",
      cwd: "/var/www/wheatandstone/ws-app",
      script: "pnpm",
      args: "start",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env_file: ".env.production",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3011",
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN || process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        DATABASE_URL: process.env.DATABASE_URL,
      },
    },
  ],
};
