FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js ./
COPY database ./database
COPY data ./data
COPY job ./job
COPY legal ./legal
COPY middleware ./middleware
COPY migrations ./migrations
COPY models ./models
COPY routes ./routes
COPY utils ./utils
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p uploads
EXPOSE 8001
CMD ["node", "server.js"]
