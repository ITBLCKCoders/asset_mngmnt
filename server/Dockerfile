FROM node:24-slim AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build
EXPOSE 6996
ENV NODE_ENV=production
RUN groupadd --system appgroup && useradd --system --gid appgroup --create-home appuser \
 && chown -R appuser:appgroup /app
USER appuser
CMD ["node", "dist/index.js"]
