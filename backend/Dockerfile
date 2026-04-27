# Use Python 3.10 slim for a small, fast image
FROM python:3.10-slim

# 1. Install Java (for the Judge) and SSL certs (for MongoDB)
RUN apt-get update && \
    apt-get install -y default-jdk ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 2. Set working directory
WORKDIR /app

# 3. Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy all project files
COPY . .

# 5. Render uses a dynamic $PORT, so we must use the variable
CMD uvicorn main:app --host 0.0.0.0 --port $PORT