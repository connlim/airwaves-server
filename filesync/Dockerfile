FROM node:latest
ENV FILESYNC_PORT 10201

WORKDIR /app
ADD . /app

RUN npm install

EXPOSE $FILESYNC_PORT

CMD ["./wait-for-it.sh", "minio:9000", "--", "./wait-for-it.sh", "redis:6379", "--", "node", "index.js"]
