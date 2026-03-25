# Backend Dockerfile
# Pin Python base image for reproducible builds
FROM python:3.12-slim AS base

WORKDIR /app

# Install OS-level dependencies needed for requirements like cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libffi-dev \
    libssl-dev \
    python3-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies using requirements lock as source
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Copy the app source
COPY . .

# Explicitly run as non-root for security
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

ENV APP_ENV=development
ENV MONGO_URL=mongodb://mongodb:27017
ENV DB_NAME=our_website_dev

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
