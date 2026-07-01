# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies (ffmpeg for audio processing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Install gunicorn for production server
RUN pip install --no-cache-dir gunicorn

# Copy the rest of the application
COPY . .

# Create output directory for generated files
RUN mkdir -p output && chmod 777 output

# Expose port 5000
EXPOSE 5000

# Command to run the application
CMD ["gunicorn", "--threads", "4", "--bind", "0.0.0.0:5000", "app:app"]
