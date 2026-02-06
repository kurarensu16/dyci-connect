# --- Build stage ---
FROM node:20-alpine AS build

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# --- Run stage (serve static files with nginx) ---
FROM nginx:1.27-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our SPA config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]