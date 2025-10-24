# scripts/deploy-prod.sh
set -e
cd /var/www/ws-app
export $(grep -v '^#' .env.production | xargs)
pnpm i --frozen-lockfile
pnpm prisma migrate deploy
NODE_ENV=production pnpm build
pm2 start ecosystem.config.js --only ws-app --update-env
pm2 save
