# Use a slim Node.js image for a smaller footprint
FROM node:20-alpine

# Set the working directory for the application
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci || npm install

# Copy the frontend source code
COPY . .

# Expose the port the Vite dev server will run on
EXPOSE 3000

# The command to run the frontend development server
CMD ["npm", "run", "dev"]
