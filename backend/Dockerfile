FROM node:18

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
RUN yarn install

# Copy all source files
COPY . .

EXPOSE 5000

CMD ["yarn", "start"]
