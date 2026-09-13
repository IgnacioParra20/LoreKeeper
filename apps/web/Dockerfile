FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN npm run build:packages && npm run build -w @lorekeeper/web

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

