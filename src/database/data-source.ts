import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { ENTITIES } from 'src/database/entities';

/**
 * DataSource para los scripts sueltos (`npm run db:seed`, `npm run db:drop`).
 *
 * La app no usa este archivo: `AppModule` configura TypeORM con `forRootAsync`.
 * Este existe para que los scripts corran con `ts-node` sin levantar Nest, pero
 * comparte `ENTITIES` a propósito: si las entidades y el seed se desenlazas, el
 * seed puede escribir columnas que el script nunca creó.
 *
 * `synchronize` va apagado igual que en la app. El esquema lo crea
 * `script-core.sql`; correr los seeds contra una base sin ese script debe fallar
 * con un error de Postgres claro, no crear tablas por sorpresa.
 */
config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'Falta DATABASE_URL. Copia .env.example a .env y define la variable antes ' +
      'de correr los scripts de base de datos.',
  );
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: ENTITIES,
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
