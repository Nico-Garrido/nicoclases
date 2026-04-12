FROM node:20-bookworm

RUN apt-get update && apt-get install -y poppler-utils webp && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["node", "--import", "tsx", "worker/render-worker.ts"]
