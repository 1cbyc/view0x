# Use a slim Node.js image for a smaller footprint
FROM node:20-alpine

# Set the working directory for the application
WORKDIR /app

# Copy the root package.json and yarn.lock to leverage Docker layer caching.
# These define the workspace and all its dependencies.
COPY package.json .
COPY yarn.lock .

# Copy the package.json for each workspace. This is necessary for yarn workspaces
# to correctly identify all projects before installing dependencies.
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install all dependencies for all workspaces.
# --frozen-lockfile ensures we use the exact versions from the lock file.
RUN yarn install --frozen-lockfile

# Copy the frontend source code into its workspace directory
COPY frontend/ ./frontend/

# Set the working directory to the frontend app's folder
WORKDIR /app/frontend

# Expose the port the Vite dev server will run on
EXPOSE 3000

# The command to run the frontend development server
CMD ["yarn", "dev"]
