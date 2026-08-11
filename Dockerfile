FROM node:24.15.0-slim

# Patch Debian OpenSSL to remediate CVE-2026-31789:
# node:slim links against the Debian system libssl/libcrypto.
RUN apt-get update && apt-get upgrade -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json .

RUN npm ci

COPY . .

EXPOSE 8790

CMD ["node", "src/server.mjs"]