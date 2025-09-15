# 1) build client
FROM node:20-alpine AS client
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# 2) server runtime
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production
COPY server/server.js ./server/server.js
COPY --from=client /client/dist ./client/dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server/server.js"]
