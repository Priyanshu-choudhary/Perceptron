# Stage 1: Build React
FROM node:18 AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Add verification step
RUN npm run build && \
    echo "React build contents:" && \
    ls -la /app/frontend/dist/

# Stage 2: Build Spring Boot
FROM maven:3.9.6-eclipse-temurin-17 AS build-backend
WORKDIR /app/backend
COPY backend/pom.xml ./
COPY backend/src ./src
COPY --from=build-frontend /app/frontend/dist ./src/main/resources/static
# Add verification steps
RUN echo "Contents of static directory after copy:" && \
    ls -la ./src/main/resources/static/ && \
    echo "Building Spring Boot..."
RUN mvn clean package -DskipTests

# Stage 3: Final Runtime Image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build-backend /app/backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]