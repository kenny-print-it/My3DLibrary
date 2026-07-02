import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// Raw query to check thumbnailUrl and heroImage
const [rows] = await conn.execute(
  'SELECT id, name, thumbnailUrl, heroImage, images FROM models LIMIT 10'
);

for (const row of rows) {
  const images = row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : [];
  console.log({
    id: row.id,
    name: row.name,
    thumbnailUrl: row.thumbnailUrl ? row.thumbnailUrl.substring(0, 80) + '...' : null,
    heroImage: row.heroImage ? row.heroImage.substring(0, 80) + '...' : null,
    imageCount: images.length,
    firstImageThumb: images[0]?.thumbnailLink ? images[0].thumbnailLink.substring(0, 80) + '...' : null,
  });
}

// Count models with/without images
const [stats] = await conn.execute(
  `SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN thumbnailUrl IS NOT NULL AND thumbnailUrl != '' THEN 1 ELSE 0 END) as hasThumbnail,
    SUM(CASE WHEN heroImage IS NOT NULL AND heroImage != '' THEN 1 ELSE 0 END) as hasHeroImage,
    SUM(CASE WHEN images IS NULL OR images = '[]' THEN 1 ELSE 0 END) as noImages
  FROM models`
);
console.log('\nStats:', stats[0]);

await conn.end();
process.exit(0);
