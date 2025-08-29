FROM python:3.12-slim

# Set timezone to Europe/Paris
ENV TZ=Europe/Paris
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install system dependencies for PostgreSQL and building packages
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Poetry dependency files
COPY pyproject.toml poetry.lock ./

# Install Poetry and Python dependencies (uvloop and httptools must be listed in pyproject.toml)
RUN pip install --no-cache-dir poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi

# Copy application source code
COPY . .

# Expose Uvicorn port
EXPOSE 8000

# Run FastAPI with Uvicorn using uvloop and httptools (single worker for async setup)
CMD ["poetry", "run", "uvicorn", "app.main:app",
     "--host", "0.0.0.0", "--port", "8000",
     "--loop", "uvloop", "--http", "httptools",
     "--workers", "2",
     "--timeout-keep-alive", "15",
     "--limit-max-requests", "5000",
     "--limit-max-requests-jitter", "500"]
