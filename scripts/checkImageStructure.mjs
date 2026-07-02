import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT id, name, images FROM models WHERE images IS NOT NULL LIMIT 2');

for (const row of rows) {
  const images = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
  console.log(`\nModel: ${row.name} (id=${row.id})`);
  console.log('Images:', JSON.stringify(images, null, 2));
}

await conn.end();
process.exit(0);
