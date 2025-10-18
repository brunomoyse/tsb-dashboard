FROM node:24.10-slim AS builder

# Set working directory
WORKDIR /usr/src/app

# Set environment variables
# @TODO: Use .env file
ENV DASHBOARD_BASE_URL="https://tokyo.brunomoyse.be/admin"
ENV API_BASE_URL="https://tokyo.brunomoyse.be/api/v1"
ENV S3_BUCKET_URL="https://d1sq9yypil8nox.cloudfront.net"
ENV GRAPHQL_WS_URL="wss://tokyo.brunomoyse.be/api/v1/graphql"

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Nuxt application
RUN npm run build

# Stage 2: Production
FROM node:24.10-alpine3.22

# Set working directory
WORKDIR /usr/src/app

# Set environment variables
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server

# Copy only the built output and necessary files
COPY --from=builder /usr/src/app/.output ./.output
COPY --from=builder /usr/src/app/package*.json ./

# Install only production dependencies
RUN npm ci --production

# Clean npm cache to reduce image size
RUN npm cache clean --force

# Expose the port that the application will run on
EXPOSE 3000

# Command to run the Nuxt server
CMD ["node", ".output/server/index.mjs"]
