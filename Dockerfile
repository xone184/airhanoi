FROM php:8.2-apache

# Cài đặt extension MySQLi và PDO
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Kích hoạt mod_rewrite cho Apache (nếu cần URL rewrite)
RUN a2enmod rewrite headers

# Configure Apache to allow .htaccess overrides
RUN sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf


# Copy toàn bộ source code vào image
COPY . /var/www/html/

# Copy custom Apache config
COPY 000-default.conf /etc/apache2/sites-available/000-default.conf


# Thiết lập quyền cho thư mục uploads (nếu có)
RUN chown -R www-data:www-data /var/www/html/uploads \
    && chmod -R 755 /var/www/html/uploads

# Cấu hình Apache DocumentRoot (nếu cần đổi, mặc định là /var/www/html)
# ENV APACHE_DOCUMENT_ROOT /var/www/html

# Expose port 80
EXPOSE 80
