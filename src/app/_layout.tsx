import { Stack } from 'expo-router';
import {SQLiteProvider} from 'expo-sqlite';

import { ExpenseProvider } from '@/context/ExpenseContext';
import {DATABASE_NAME, initDatabase} from '@/database/database';

//SQLite Provider abre la base de datos y la comparte con toda la app
//Va por fuera de ExponseProvider, porque ExpenseProvider necesita la base
// onInit corre antes de mostar los hijos, asi la tabla ya existe cuando se usa
export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit= {initDatabase}>
    <ExpenseProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </ExpenseProvider>
    </SQLiteProvider>
  );
}
