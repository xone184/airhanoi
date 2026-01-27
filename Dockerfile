# ============================================
# STAGE 1: Build React Frontend
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# ============================================
# STAGE 2: Setup PHP Apache Server
# ============================================
FROM php:8.2-apache

# Cài đặt extension MySQLi và PDO
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Kích hoạt mod_rewrite cho Apache
RUN a2enmod rewrite
# Kích hoạt mod_headers cho CORS
RUN a2enmod headers

# Configure Apache to allow .htaccess overrides
RUN sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

# Copy custom Apache config
COPY 000-default.conf /etc/apache2/sites-available/000-default.conf

# Copy PHP API files
COPY api/ /var/www/html/api/
COPY uploads/ /var/www/html/uploads/

# Copy built React frontend from Stage 1
COPY --from=frontend-builder /app/dist/ /var/www/html/

# Thiết lập quyền cho thư mục uploads
RUN chown -R www-data:www-data /var/www/html/uploads \
    && chmod -R 755 /var/www/html/uploads

# Expose port 80
EXPOSE 80
