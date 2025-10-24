// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "wheatandstone",
      cwd: "/var/www/ws-app",
      script: "pnpm",
      args: "start -p 3011",
      exec_mode: "fork",   // <-- add this
      instances: 1,        // keep 1, Next.js binds one port
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        // If you want to hard-set these instead of relying on .env.production:
        // NEXTAUTH_URL: "https://wheatandstone.ca",
        // NEXTAUTH_SECRET: "9fe1cf8ad8e845b88db8b2e8ee6ea58e",
        // DATABASE_URL: "file:./prod.db",
      },
    },
  ],
};
