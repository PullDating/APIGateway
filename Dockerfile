FROM node:18-alpine

WORKDIR /usr/src/app

COPY . .

EXPOSE 3000

CMD ["./start.sh"]
