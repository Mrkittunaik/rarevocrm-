FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY public ./public
ENV PORT=4000 DATA_DIR=/app/data
VOLUME ["/app/data"]
EXPOSE 4000
CMD ["node", "server/server.js"]
