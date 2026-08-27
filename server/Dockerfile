FROM node:24-slim AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build
EXPOSE 6996
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
