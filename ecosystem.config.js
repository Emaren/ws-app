// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "ws-app",
      cwd: "/var/www/ws-app",
      script: "pnpm",
      args: "start",                 // Next.js start
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3011",
        NEXTAUTH_URL: "https://wheatandstone.ca",
        NEXTAUTH_SECRET: "9fe1cf8ad8e845b88db8b2e8ee6ea58e",
        DATABASE_URL: "file:./prisma/prod.db",
      },
    },
  ],
};
