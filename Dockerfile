# Zkredit - Full Stack Dockerfile
# Combined backend and frontend for single-container deployment

# ============================================================================
# Stage 1: Backend
# ============================================================================
FROM python:3.12-slim as backend

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
COPY backend/api/requirements.txt ./backend/api/
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir -r backend/api/requirements.txt

# Copy backend code
COPY backend/ ./backend/
COPY agents/ ./agents/
COPY hydra/ ./hydra/
COPY midnight/ ./midnight/

# ============================================================================
# Stage 2: Frontend
# ============================================================================
FROM node:20-alpine as frontend

WORKDIR /app

# Copy and install frontend dependencies
COPY frontend/Dashboard/package*.json ./frontend/Dashboard/
WORKDIR /app/frontend/Dashboard
RUN npm ci

# Copy frontend source and build
COPY frontend/Dashboard/ ./
RUN npm run build

# ============================================================================
# Stage 3: Production
# ============================================================================
FROM python:3.12-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy backend from stage 1
COPY --from=backend /app /app

# Copy frontend build from stage 2
COPY --from=frontend /app/frontend/Dashboard/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV PORT=8000
ENV HOST=0.0.0.0

# Create startup script
RUN echo '#!/bin/bash\n\
# Start nginx in background\n\
nginx\n\
# Start backend API\n\
cd /app && uvicorn backend.api.server:app --host 0.0.0.0 --port 8000 &\n\
# Wait for both\n\
wait\n\
' > /start.sh && chmod +x /start.sh

# Expose ports
EXPOSE 80 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health && curl -f http://localhost:80/ || exit 1

# Start both services
CMD ["/start.sh"]

