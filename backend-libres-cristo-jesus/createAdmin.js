const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function createAdmin() {
  const hash = await bcrypt.hash('librespass@26', 10);
  const client = new Client({ connectionString: 'postgresql://postgres:adminPRDC@localhost:5432/libres_cristo_jesus' });
  await client.connect();
  
  // Check if exists
  const existing = await client.query('SELECT * FROM persona WHERE celular = $1', ['useroot']);
  if (existing.rows.length > 0) {
    console.log('Admin user already exists!');
    await client.end();
    return;
  }

  const query = `
    INSERT INTO persona (id, nombres, apellidos, celular, rol, password, fecha_creacion, fecha_modificacion)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
  `;
  const values = ['id_persona_admin_root', 'Admin', 'Administrador', 'useroot', 'ADMIN', hash];
  
  await client.query(query, values);
  console.log('Admin created successfully.');
  await client.end();
}

createAdmin().catch(console.error);
