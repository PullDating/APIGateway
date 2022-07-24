FROM node:18-alpine

WORKDIR /usr/src/app

COPY ["package.json", "package-lock.json", "tsconfig.json", ".env", "./"]

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]