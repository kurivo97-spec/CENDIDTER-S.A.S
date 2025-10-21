-- SQL script to create the employees table for the CENDIDTER scheduling application

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  -- Área a la que pertenece el trabajador (por ejemplo: 'Servicios Generales', 'Mantenimiento', 'Sistemas')
  area TEXT NOT NULL,
  -- Nombres del trabajador
  nombre TEXT NOT NULL,
  -- Apellidos del trabajador
  apellido TEXT NOT NULL,
  -- Número de teléfono (opcional)
  telefono TEXT,
  -- Horario en formato JSONB, que contiene los turnos semanales. Por ejemplo:
  -- {
  --   "lunes": { "primeraJornada": { "inicio": "08:00", "fin": "12:00" }, "segundaJornada": { "inicio": "14:00", "fin": "18:00" } },
  --   "martes": { ... },
  --   ...
  -- }
  horario JSONB NOT NULL
);