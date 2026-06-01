FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ARG VITE_AUTH_API_URL=http://localhost:8001
ARG VITE_USER_API_URL=http://localhost:8002
ARG VITE_SHIFT_API_URL=http://localhost:8003
ARG VITE_COMPLIANCE_API_URL=http://localhost:8004
ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL
ENV VITE_USER_API_URL=$VITE_USER_API_URL
ENV VITE_SHIFT_API_URL=$VITE_SHIFT_API_URL
ENV VITE_COMPLIANCE_API_URL=$VITE_COMPLIANCE_API_URL
RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
