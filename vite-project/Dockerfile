# Базовый образ с Node.js
FROM node:20-alpine AS builder

# Рабочая директория
WORKDIR /app

# Копируем package.json и package-lock.json из фронтенда
COPY vite-project/package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем только фронтенд
COPY vite-project/. .

# Собираем Vite проект
RUN npm run build

# Используем nginx для отдачи готового фронтенда
FROM nginx:alpine

# Создаем директорию для кеша API
RUN mkdir -p /var/cache/nginx && chown -R nginx:nginx /var/cache/nginx

# Копируем билд в папку nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем nginx конфиг
COPY backend/nginx.conf /etc/nginx/conf.d/default.conf

COPY backend/headers.conf /etc/nginx/headers.conf

# Открываем порт 80
EXPOSE 80

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]