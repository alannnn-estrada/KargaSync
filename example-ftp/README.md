# example-ftp

Contenedor Docker simple para un servidor FTP usando la imagen `fauria/vsftpd`.

Credenciales por defecto:

- Usuario: `ftpuser`
- Contraseña: `ftp_pass`

Montaje de datos:

- La carpeta `./data` dentro de `example-ftp` se monta como `/home/vsftpd` en el contenedor.

Cómo usar:

1. Abrir una terminal en `example-ftp`.

```bash
cd example-ftp
docker compose up -d
```

2. Conéctate por FTP a `localhost:21` con las credenciales anteriores.

Nota sobre modo pasivo:

Los puertos pasivos expuestos son `30000-30009`. Si necesitas acceder desde otra máquina, ajusta `PASV_ADDRESS` en `docker-compose.yml` al IP público/hostname.
