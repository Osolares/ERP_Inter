# Scripts de desarrollo — ERP Intermotores v14.1.3

Estos scripts evitan memorizar comandos y ayudan a levantar el proyecto desde cero.

## Script principal

Desde la raíz del proyecto:

```powershell
.\dev.ps1
```

Por defecto usa:

```text
Base de datos: erp_intermotores_v14
Usuario: postgres
Password temporal: admin
Puerto PostgreSQL: 5432
Backend: http://localhost:8000
Frontend: http://localhost:4200
```

## Qué hace

- Verifica Python.
- Verifica Node.js.
- Verifica npm.
- Verifica PostgreSQL (`psql` y `createdb`).
- Verifica Redis si existe; por ahora Redis es opcional.
- Crea la base de datos si no existe.
- Crea `backend/.env` si no existe.
- Crea `.venv` si no existe.
- Instala dependencias backend.
- Ejecuta migraciones Alembic.
- Instala dependencias frontend si falta `node_modules`.
- Inicia backend y frontend en ventanas separadas.
- Abre navegador con frontend y documentación API.
- Muestra estado del entorno.

## Scripts individuales

```powershell
.\scripts\crear_bd.ps1
.\scripts\migrar.ps1
.\scripts\iniciar_backend.ps1
.\scripts\iniciar_frontend.ps1
```

## Nota de seguridad

La contraseña `admin` es temporal para desarrollo local. En producción nunca debe usarse.
