module.exports = {
  apps: [
    {
      name: "wheatandstone",
      cwd: "/var/www/ws-app",
      script: "pnpm",
      args: "start -p 3011",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",                 // ensures .env.production is used
        // If you prefer to override explicitly instead of relying on .env.production,
        // uncomment the three lines below:
        // NEXTAUTH_URL: "https://wheatandstone.ca",
        // NEXTAUTH_SECRET: "9fe1cf8ad8e845b88db8b2e8ee6ea58e",
        // DATABASE_URL: "file:./prod.db",
      },
    },
  ],
};
