const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Create an Express application
const app = express();

// Enable CORS so the frontend running on a different origin can call this API
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Configure the PostgreSQL connection pool using environment variables.
// Render will inject the appropriate variables when you provision a Postgres database.
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  // When deploying to Render, SSL is required but the certificate is self‑signed.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('CENDIDTER backend is running');
});

// GET /employees - list all employees with schedules
app.get('/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// POST /employees - add a new employee
app.post('/employees', async (req, res) => {
  const { area, nombre, apellido, telefono, horario } = req.body;
  if (!area || !nombre || !apellido || !horario) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  try {
    const insert =
      'INSERT INTO employees(area, nombre, apellido, telefono, horario) VALUES($1, $2, $3, $4, $5) RETURNING *';
    const values = [area, nombre, apellido, telefono || null, horario];
    const result = await pool.query(insert, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ error: 'Error al añadir empleado' });
  }
});

// PUT /employees/:id - update an existing employee
app.put('/employees/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { area, nombre, apellido, telefono, horario } = req.body;
  if (!area || !nombre || !apellido || !horario) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  try {
    const update =
      'UPDATE employees SET area=$1, nombre=$2, apellido=$3, telefono=$4, horario=$5 WHERE id=$6';
    const values = [area, nombre, apellido, telefono || null, horario, id];
    await pool.query(update, values);
    res.json({ message: 'Empleado actualizado' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Error al actualizar empleado' });
  }
});

// DELETE /employees/:id - remove an employee
app.delete('/employees/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await pool.query('DELETE FROM employees WHERE id=$1', [id]);
    res.json({ message: 'Empleado eliminado' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Error al eliminar empleado' });
  }
});

// Start the server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`CENDIDTER backend listening on port ${port}`);
});