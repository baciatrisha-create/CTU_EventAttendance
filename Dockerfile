
FROM php:8.2-apache

RUN a2dismod mpm_event mpm_worker mpm_prefork || true \
    && rm -f /etc/apache2/mods-enabled/mpm_*.load \
              /etc/apache2/mods-enabled/mpm_*.conf \
    && a2enmod mpm_prefork rewrite \
    && docker-php-ext-install mysqli

WORKDIR /var/www/html

COPY . .

RUN chown -R www-data:www-data /var/www/html

CMD ["bash", "-lc", "rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf /etc/apache2/mods-enabled/mpm_worker.load /etc/apache2/mods-enabled/mpm_worker.conf; echo '=== CHECK ENABLED MPM ==='; ls -l /etc/apache2/mods-enabled/mpm_* 2>/dev/null || true; sed -i 's/Listen 80/Listen ${PORT:-8080}/' /etc/apache2/ports.conf; sed -i 's/:80>/:${PORT:-8080}>/' /etc/apache2/sites-available/000-default.conf; apache2-foreground"]