import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MonthlyHeader } from '@/components/MonthlyHeader';
import { ExpenseItem } from '@/components/ExpenseItem';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { useExpenses } from '@/context/ExpenseContext';
import { LiquidGlassColors, Spacing } from '@/constants/theme';
import { Expense } from '@/types/expense';

// Pantalla principal: total mensual, ordenamiento, listado interactivo y creación/edición de gastos
export default function HomeScreen() {
  const { getCurrentMonthExpenses, isLoading, deleteExpense } = useExpenses();
  const [modalVisible, setModalVisible] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [sortByHighestAmount, setSortByHighestAmount] = useState(false);

  const rawExpenses = getCurrentMonthExpenses();

  // Filtrado y ordenamiento de gastos:
  // Si sortByHighestAmount está activo: b.amount - a.amount (mayor a menor)
  // Caso contrario: fecha más reciente primero
  const expenses = useMemo(() => {
    const list = [...rawExpenses];
    if (sortByHighestAmount) {
      return list.sort((a, b) => b.amount - a.amount);
    }
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [rawExpenses, sortByHighestAmount]);

  const handleAddNew = () => {
    setExpenseToEdit(null);
    setModalVisible(true);
  };

  const handleEdit = (expense: Expense) => {
    setExpenseToEdit(expense);
    setModalVisible(true);
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      'Eliminar gasto',
      `¿Deseas eliminar el gasto de $${expense.amount.toFixed(2)} en "${expense.category}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expense.id);
            } catch (error) {
              console.error('Error al eliminar gasto:', error);
              Alert.alert('Error', 'No se pudo eliminar el gasto.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#FFF5F9', '#FFE8F0', '#FFF9FC']}
        style={styles.gradient}
      >
        {/* Círculos de color difuminados para el efecto Liquid Glass */}
        <View pointerEvents="none" style={[styles.orb, styles.orbPink]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbOrange]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbPurple]} />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <Text style={styles.appTitle}>Gastos Poliestudiante</Text>

            <MonthlyHeader />

            {/* Barra de filtrado / ordenamiento con estilo Liquid Glass */}
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Ordenar:</Text>
              <View style={styles.sortOptions}>
                <TouchableOpacity
                  style={[
                    styles.sortPill,
                    !sortByHighestAmount && styles.sortPillActive,
                  ]}
                  onPress={() => setSortByHighestAmount(false)}
                  activeOpacity={0.8}
                >
                  {!sortByHighestAmount ? (
                    <LinearGradient
                      colors={[
                        LiquidGlassColors.primary,
                        LiquidGlassColors.secondary,
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sortGradient}
                    >
                      <Text style={styles.sortTextActive}>📅 Recientes</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.sortText}>📅 Recientes</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sortPill,
                    sortByHighestAmount && styles.sortPillActive,
                  ]}
                  onPress={() => setSortByHighestAmount(true)}
                  activeOpacity={0.8}
                >
                  {sortByHighestAmount ? (
                    <LinearGradient
                      colors={[
                        LiquidGlassColors.primary,
                        LiquidGlassColors.secondary,
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sortGradient}
                    >
                      <Text style={styles.sortTextActive}>💎 Mayor valor</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.sortText}>💎 Mayor valor</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={LiquidGlassColors.primary} />
              </View>
            ) : expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>💸</Text>
                <Text style={styles.emptyTitle}>No hay gastos registrados</Text>
                <Text style={styles.emptyText}>
                  Presiona el botón + para registrar tu primer gasto
                </Text>
              </View>
            ) : (
              <FlatList
                data={expenses}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <ExpenseItem
                    expense={item}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* Botón flotante para agregar nuevo gasto */}
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddNew}
            activeOpacity={0.8}
            accessibilityLabel="Agregar gasto"
          >
            <LinearGradient
              colors={[LiquidGlassColors.primary, LiquidGlassColors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Text style={styles.fabIcon}>+</Text>
            </LinearGradient>
          </TouchableOpacity>

          <AddExpenseModal
            visible={modalVisible}
            onClose={() => {
              setModalVisible(false);
              setExpenseToEdit(null);
            }}
            expenseToEdit={expenseToEdit}
          />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPink: {
    width: 220,
    height: 220,
    top: 60,
    left: -60,
    backgroundColor: 'rgba(255, 107, 157, 0.55)',
  },
  orbOrange: {
    width: 180,
    height: 180,
    top: 260,
    right: -50,
    backgroundColor: 'rgba(255, 159, 94, 0.5)',
  },
  orbPurple: {
    width: 200,
    height: 200,
    bottom: 120,
    left: 20,
    backgroundColor: 'rgba(168, 120, 220, 0.4)',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: LiquidGlassColors.glassText,
    marginBottom: Spacing.three,
    textAlign: 'center',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: LiquidGlassColors.glassTextSecondary,
  },
  sortOptions: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  sortPill: {
    borderRadius: Spacing.two,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  sortPillActive: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  sortGradient: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
    color: LiquidGlassColors.glassTextSecondary,
  },
  sortTextActive: {
    fontSize: 12,
    fontWeight: 'bold',
    color: LiquidGlassColors.glassTextLight,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.three,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: LiquidGlassColors.glassText,
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: LiquidGlassColors.glassTextSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.four,
    right: Spacing.four,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: LiquidGlassColors.shadowDark,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 32,
    color: LiquidGlassColors.glassTextLight,
    fontWeight: '300',
  },
});
