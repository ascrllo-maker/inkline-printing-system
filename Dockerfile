# Multi-stage build for optimized Docker image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install --production=false
RUN cd client && npm install

# Copy source files
COPY . .

# Build React application
RUN cd client && npm run build

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy server files
COPY server ./server

# Copy built React app from builder stage
COPY --from=builder /app/client/dist ./client/dist

# Create uploads directory (ephemeral storage for Cloud Run)
RUN mkdir -p uploads/files uploads/ids

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server/index.js"]

