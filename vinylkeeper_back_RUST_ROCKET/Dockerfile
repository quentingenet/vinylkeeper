FROM debian:latest

RUN apt-get update && apt-get install -y \
    openssl \
    libpq5 \
    libgcc1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY vinylkeeper_back /app/
COPY .env.production /app/
COPY /src /app/

RUN chmod +x ./vinylkeeper_back

CMD ["/app/vinylkeeper_back"]







