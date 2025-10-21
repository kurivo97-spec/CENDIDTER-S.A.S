# CENDIDTER Backend

Esta carpeta contiene una API básica en Node.js que permite crear, actualizar, listar y eliminar empleados para la aplicación de control de turnos de CENDIDTER S.A.S. Los datos se guardan en una base de datos PostgreSQL y se exponen mediante un servidor Express.

## Dependencias

* [Node.js](https://nodejs.org/) y `npm` para instalar y ejecutar el servidor localmente.
* [PostgreSQL](https://www.postgresql.org/) como sistema gestor de base de datos.
* [Render](https://render.com/) u otro proveedor que permita desplegar aplicaciones Node.js y una base de datos gratuita.

## Instalación local

1. Clona este repositorio o copia el contenido de la carpeta `render_backend` en tu entorno local.
2. Ejecuta `npm install` para instalar las dependencias.
3. Crea la tabla necesaria ejecutando el script SQL:
   ```sh
   psql -U <tu_usuario> -d <tu_base_de_datos> -f database.sql
   ```
4. Define las variables de entorno necesarias:
   - `DB_HOST`: servidor de tu base de datos (por ejemplo, `localhost`)
   - `DB_USER`: usuario de la base de datos
   - `DB_PASSWORD`: contraseña del usuario
   - `DB_NAME`: nombre de la base de datos
   - `DB_PORT`: puerto de PostgreSQL (por defecto `5432`)
   - `PORT`: puerto en el que se ejecutará el servidor Express (por defecto `3001`)
5. Ejecuta `npm start` para iniciar el servidor. La API estará disponible en `http://localhost:<PORT>`.

## Uso de la API

* `GET /employees`: devuelve la lista de todos los empleados con sus horarios.
* `POST /employees`: crea un nuevo empleado. El cuerpo de la solicitud debe ser un JSON con las propiedades `area`, `nombre`, `apellido`, `telefono` (opcional) y `horario` (objeto JSON con los turnos semanales).
* `PUT /employees/:id`: actualiza un empleado existente. Requiere las mismas propiedades que el `POST` y el ID del empleado en la ruta.
* `DELETE /employees/:id`: elimina un empleado por su ID.

## Despliegue en Render (Plan gratuito)

Render ofrece instancias gratuitas para aplicaciones web (Node.js) y bases de datos Postgres【739328387125927†L168-L181】. Sigue estos pasos para desplegar esta API:

1. Sube el contenido de `render_backend` a un repositorio (por ejemplo, en GitHub).
2. Inicia sesión en tu cuenta de Render y selecciona **New → Web Service**.
3. Conecta el repositorio que contiene este código y selecciona la rama principal.
4. Configura los comandos:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Crea una base de datos PostgreSQL en Render desde **New → PostgreSQL**. Render te proporcionará variables como `DATABASE_URL`, `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` y `PGPORT`.
6. En la configuración de tu Web Service, añade variables de entorno utilizando esos valores:
   - `DB_HOST` = valor de `PGHOST`
   - `DB_USER` = valor de `PGUSER`
   - `DB_PASSWORD` = valor de `PGPASSWORD`
   - `DB_NAME` = valor de `PGDATABASE`
   - `DB_PORT` = valor de `PGPORT`
7. Antes de desplegar, ejecuta el script `database.sql` desde la consola de psql de la base de datos para crear la tabla `employees`. Render permite conectarse mediante el comando `psql` que muestra en la página de la base de datos.
8. Despliega el servicio. Cuando esté activo, tu API estará disponible en una URL similar a `https://<nombre-del-servicio>.onrender.com`.

## Integración con el frontend

En el frontend (tu página de control de turnos), sustituye las funciones que gestionan los datos en memoria por llamadas `fetch()` a esta API. Por ejemplo:

```javascript
// Obtener todos los empleados
fetch('https://<tu-servicio>.onrender.com/employees')
  .then(res => res.json())
  .then(data => {
    // Mostrar empleados en la interfaz
  });

// Crear un empleado
fetch('https://<tu-servicio>.onrender.com/employees', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    area: 'Servicios Generales',
    nombre: 'Kevin',
    apellido: 'Daniel',
    telefono: '123456789',
    horario: {/* objeto JSON con turnos */}
  })
});

// Actualizar un empleado
fetch('https://<tu-servicio>.onrender.com/employees/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ area, nombre, apellido, telefono, horario })
});

// Eliminar un empleado
fetch('https://<tu-servicio>.onrender.com/employees/1', { method: 'DELETE' });
```

Con esta arquitectura, cualquier cambio realizado desde la interfaz web se guardará en la base de datos y será visible para cualquier persona que acceda al enlace de la aplicación.