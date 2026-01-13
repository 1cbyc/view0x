FROM node:20-alpine

WORKDIR /app

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json yarn.lock ./

# Configure yarn to use npm registry and disable SSL verification temporarily
RUN yarn config set registry https://registry.npmjs.org/ && \
    yarn config set strict-ssl false

# Install dependencies with platform-specific handling
RUN yarn install --network-timeout 100000 --ignore-optional

# Copy all source files
COPY . .

# Build the application
RUN yarn build

EXPOSE 3001

CMD ["yarn", "start"]
