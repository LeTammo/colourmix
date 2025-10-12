# Build stage
FROM node:22-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY client/package*.json ./client/

# Set working directory
WORKDIR /app/client

# Install dependencies
RUN npm ci

# Set working directory
WORKDIR /app

# Copy shared types first
COPY shared ./shared

# Copy all client files
COPY client ./client/

# Set working directory
WORKDIR /app/client

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/client/dist /usr/share/nginx/html

# Copy nginx configuration (optional - use default if not provided)
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]