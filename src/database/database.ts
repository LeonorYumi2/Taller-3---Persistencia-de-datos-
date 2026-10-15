import { SQLiteDatabase } from 'expo-sqlite';

//Nombre del archivo de base de datos que se crea dentro del telefono 
export const DATABASE_NAME = 'gastos.db';

//Se ejecuta una vez cada vez que se abre la base (lo llama SQLiteProvider)
//Aqui se crean las tablas si todavia no existen 

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  // execAsync permite ejecutar varias sentencias SQL seguidas
  // WAL es un modo de escritura que SQLite recomienda: lecturas y escrituras
  // pueden ocurrir al mismo tiempo sin bloquearse
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS expenses (
      id               TEXT PRIMARY KEY NOT NULL,      -- el mismo id string que ya usaba la app
      amount           REAL NOT NULL,                  -- REAL = numero con decimales
      category         TEXT NOT NULL,                  
      date             TEXT NOT NULL,                  -- fecha en formato ISO 8601
      description      TEXT,                           -- puede ser NULL porque es opcional
      factura_adjuntar TEXT                            -- URI local de la imagen comprobante (opcional)
    );
  `);

  // Migración defensiva: agregar factura_adjuntar si la tabla ya existía previamente
  try {
    await db.execAsync(`ALTER TABLE expenses ADD COLUMN factura_adjuntar TEXT;`);
  } catch {
    // La columna ya existe, continuar normalmente
  }

  // Migración defensiva: corregir columna categority si existía de versiones previas
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(expenses);`);
    const cols = tableInfo.map((c) => c.name);
    if (cols.includes('categority') && !cols.includes('category')) {
      await db.execAsync(`ALTER TABLE expenses RENAME COLUMN categority TO category;`);
    }
  } catch {
    // Continuar normalmente
  }
}