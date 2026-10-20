FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM python:3.13-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt ./backend/requirements.txt
RUN python -m pip install --no-cache-dir -r backend/requirements.txt

COPY backend/__init__.py backend/config.py backend/main.py ./backend/
COPY --from=frontend-build /app/dist ./dist

EXPOSE 10000
CMD ["sh", "-c", "exec python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
