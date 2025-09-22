#!/bin/bash

# Build the image
echo "Building Docker image..."
docker build -t webremote-app .

# Tag the image
echo "Tagging image..."
docker tag webremote-app priyanshu1284/webremote-app:latest

# Push to Docker Hub
echo "Pushing to Docker Hub..."
docker push priyanshu1284/webremote-app:latest

echo "Deployment to Docker Hub complete!"