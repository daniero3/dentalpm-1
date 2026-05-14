FROM node:20-alpine

WORKDIR /app

# Installer dépendances backend
COPY package*.json ./
RUN npm ci

# Installer et builder le frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY . .
RUN cd frontend && npm run build

EXPOSE 8001

CMD ["node", "server.js"]
