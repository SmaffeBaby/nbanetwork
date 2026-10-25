FROM mcr.microsoft.com/playwright:v1.64.0-noble
WORKDIR /app
COPY contracts-importer/package*.json ./
RUN npm ci --omit=dev
COPY contracts-importer/worker.js ./
COPY backend/services/contracts/teams.js ./teams.js
RUN mkdir -p /data/snapshots && chown -R pwuser:pwuser /app /data
USER pwuser
ENV CONTRACT_DATA_DIR=/data
CMD ["node", "worker.js"]
