FROM debian:latest

RUN apt-get update && apt-get install -y \
    openssl \
    libpq5 \
    libgcc1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY vinylkeeper_back /app/

COPY stuff_vk/.env.development /app/

RUN chmod +x /app/vinylkeeper_back

CMD ["/app/vinylkeeper_back"]


