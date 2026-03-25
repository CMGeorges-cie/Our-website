# Frontend Dockerfile for CRA (with CRACO)
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build app
COPY . .
RUN yarn build

# Production image with nginx
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html

# Optional: custom nginx.conf can be added if path rewriting needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
