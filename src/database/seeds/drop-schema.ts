/**
 * Borra el esquema público por completo.
 *
 * Es destructivo e irreversible, así que no corre sin confirmación explícita:
 *
 *   npm run db:drop                 -> no hace nada, explica cómo confirmar
 *   npm run db:drop -- --force      -> borra
 *   CONFIRM_DROP=yes npm run db:drop -> borra
 *
 * Preferí `npm run db:create` (`script-core.sql`), que además de borrar vuelve a
 * crear el esquema y valida que quedaron las 13 tablas. `db:drop` sirve para
 * dejar la base vacía sin volver a sembrar.
 */
const confirmed =
  process.argv.includes('--force') || process.env.CONFIRM_DROP === 'yes';

if (!confirmed) {
  console.error(
    'db:drop borra TODAS las tablas de la base. Faltó la confirmación.\n' +
      '  npm run db:drop -- --force      (o CONFIRM_DROP=yes npm run db:drop)\n' +
      'Si solo querias resetear el esquema, usá `npm run db:create`.',
  );
  process.exit(1);
}

async function dropSchema(): Promise<void> {
  // Import perezoso a propósito: `data-source.ts` valida `DATABASE_URL` al
  // importarse, y con un import de nivel superior ese error saltaría antes de
  // evaluar la confirmación de arriba. El orden importa en un script destructivo.
  const { AppDataSource } = await import('src/database/data-source');

  await AppDataSource.initialize();

  try {
    await AppDataSource.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await AppDataSource.query('CREATE SCHEMA public;');
    console.log('Esquema public borrado. Corre `npm run db:create` para recrearlo.');
  } finally {
    await AppDataSource.destroy();
  }
}

dropSchema().catch((error) => {
  console.error('No se pudo borrar el esquema:', error.message);
  process.exit(1);
});
