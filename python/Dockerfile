# Use an official Python runtime as a parent image
FROM python:3.11-slim-bookworm

# Set the working directory in the container
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies required for building Python packages
# libpq-dev is needed for psycopg (PostgreSQL driver)
# curl is needed for healthcheck
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
# Use minimal requirements for faster builds (Slither only, no Mythril/Semgrep)
COPY ./requirements-minimal.txt ./requirements.txt

# Install the Python dependencies
# --no-cache-dir reduces image size
# Use --no-deps flag for faster installation (dependencies are already specified)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Make startup script executable
RUN chmod +x start.sh

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run the application
# Use startup script for better error handling
CMD ["./start.sh"]
