FROM node:20

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
RUN yarn install

# Copy all source files
COPY . .

# Build TypeScript
RUN yarn tsc

EXPOSE 3001

CMD ["yarn", "start"]
