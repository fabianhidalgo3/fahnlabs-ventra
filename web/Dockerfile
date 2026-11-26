# Ventra web panel (Angular) served by nginx, with /api and /uploads proxied to the API.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ng-tailadmin/browser /usr/share/nginx/html
EXPOSE 80
