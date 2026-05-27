FROM node:20-slim

# Install dependencies needed by sharp (libvips)
RUN apt-get update && apt-get install -y \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (sharp will use system libvips)
RUN npm ci --omit=dev

# Copy the rest of the app
COPY . .

# Create uploads directory
RUN mkdir -p public/uploads

EXPOSE 8080

CMD ["node", "server.js"]
