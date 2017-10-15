FROM node:latest
ENV SOCKET_PORT 10202

WORKDIR /app
ADD . /app

RUN npm install

EXPOSE $SOCKET_PORT

CMD ["./wait-for-it.sh", "redis:6379", "--", "node", "index.js"]
