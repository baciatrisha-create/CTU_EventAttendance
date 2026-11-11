
FROM php:8.2-apache

RUN a2dismod mpm_event mpm_worker mpm_prefork || true \
    && rm -f /etc/apache2/mods-enabled/mpm_*.load \
              /etc/apache2/mods-enabled/mpm_*.conf \
    && a2enmod mpm_prefork rewrite \
    && docker-php-ext-install mysqli

WORKDIR /var/www/html

COPY . .

RUN chown -R www-data:www-data /var/www/html


CMD ["bash", "-lc", "rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf /etc/apache2/mods-enabled/mpm_worker.load /etc/apache2/mods-enabled/mpm_worker.conf; PORT_NUM=\"${PORT:-8080}\"; sed -i '/^[[:space:]]*Listen[[:space:]]/d' /etc/apache2/ports.conf; printf 'Listen %s\\n' \"$PORT_NUM\" >> /etc/apache2/ports.conf; sed -i \"s|<VirtualHost \\*:80>|<VirtualHost *:${PORT_NUM}>|\" /etc/apache2/sites-available/000-default.conf; echo '=== PORTS.CONF ==='; nl -ba /etc/apache2/ports.conf; echo '=== VIRTUALHOST ==='; grep -n 'VirtualHost' /etc/apache2/sites-available/000-default.conf; apache2-foreground"]
