import {SQLiteDatabase} from 'expo-sqlite'
import {Category, Expense} from '@/types/expense'

// Forma en que una fila llega dese SQLite
// No es igual a Expense: la fecha viene como texto y la descripcion como null

interface ExpenseRow {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string | null;
  factura_adjuntar: string | null;
}

// Convierte una fila de la tabla en un objeto Expense que entiende la app
function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount,
    category: row.category as Category,
    date: new Date(row.date), // texto ISO -> Date
    description: row.description ?? undefined, // null -> undefined
    factura_adjuntar: row.factura_adjuntar ?? undefined,
  };
}

// Devuelve todos los gastos, del mas reciente al mas antiguo 
export async function getAllExpenses(db: SQLiteDatabase): Promise<Expense[]> {
  // getAllAsync ejecuta SELECT y devuelve un arreglo con todas las filas
  const rows = await db.getAllAsync<ExpenseRow>(
    'SELECT id, amount, category, date, description, factura_adjuntar FROM expenses ORDER BY date DESC'
  );
  return rows.map(rowToExpense);
}

// Inserta UN gasto. A diferencia de AsyncStorage, no se reescribe toda la lista
export async function insertExpense(db: SQLiteDatabase, expense: Expense): Promise<void> {
  // Validación estricta de monto obligatorio
  if (typeof expense.amount !== 'number' || isNaN(expense.amount) || expense.amount <= 0) {
    throw new Error('El monto del gasto es obligatorio y debe ser mayor a 0.');
  }

  // Validación de categoría obligatoria
  if (!expense.category) {
    throw new Error('La categoría del gasto es obligatoria.');
  }

  // Validación estricta de la fecha obligatoria antes de guardar en SQLite
  if (!expense.date || isNaN(expense.date.getTime())) {
    throw new Error('La fecha del gasto es obligatoria y debe ser válida.');
  }

  // Los signos ? son parametros: SQLite coloca los valores de forma segura
  await db.runAsync(
    'INSERT INTO expenses (id, amount, category, date, description, factura_adjuntar) VALUES (?, ?, ?, ?, ?, ?)',
    expense.id,
    expense.amount,
    expense.category,
    expense.date.toISOString(),
    expense.description ?? null,
    expense.factura_adjuntar ?? null
  );
}

// Actualiza un gasto existente en SQLite
export async function updateExpense(db: SQLiteDatabase, expense: Expense): Promise<void> {
  // Validación estricta de monto obligatorio
  if (typeof expense.amount !== 'number' || isNaN(expense.amount) || expense.amount <= 0) {
    throw new Error('El monto del gasto es obligatorio y debe ser mayor a 0.');
  }

  // Validación de categoría obligatoria
  if (!expense.category) {
    throw new Error('La categoría del gasto es obligatoria.');
  }

  // Validación estricta de la fecha obligatoria antes de guardar en SQLite
  if (!expense.date || isNaN(expense.date.getTime())) {
    throw new Error('La fecha del gasto es obligatoria y debe ser válida.');
  }

  await db.runAsync(
    'UPDATE expenses SET amount = ?, category = ?, date = ?, description = ?, factura_adjuntar = ? WHERE id = ?',
    expense.amount,
    expense.category,
    expense.date.toISOString(),
    expense.description ?? null,
    expense.factura_adjuntar ?? null,
    expense.id
  );
}

// Elimina un gasto de SQLite por su id
export async function deleteExpense(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM expenses WHERE id = ?', id);
}

