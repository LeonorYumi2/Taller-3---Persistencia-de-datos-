import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Expense, CATEGORY_ICONS } from '@/types/expense';
import { GlassCard } from './GlassCard';
import { LiquidGlassColors, Spacing } from '@/constants/theme';

interface ExpenseItemProps {
  expense: Expense;
  index: number; // Para entrada escalonada
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}

// Fila de gasto individual con botones de edición y eliminación estilo Liquid Glass
export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  expense,
  index,
  onEdit,
  onDelete,
}) => {
  const formattedDate = new Date(expense.date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(expense.amount);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      style={styles.container}
    >
      <GlassCard>
        <View style={styles.cardLayout}>
          {/* Fila principal: Icono, categoría, monto y fecha */}
          <View style={styles.content}>
            <View style={styles.leftSection}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[LiquidGlassColors.primary, LiquidGlassColors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Text style={styles.icon}>{CATEGORY_ICONS[expense.category]}</Text>
                </LinearGradient>
              </View>
              <View style={styles.infoContainer}>
                <Text style={styles.category}>{expense.category}</Text>
                {expense.description ? (
                  <Text style={styles.description} numberOfLines={1}>
                    {expense.description}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.rightSection}>
              <Text style={styles.amount}>{formattedAmount}</Text>
              <Text style={styles.date}>{formattedDate}</Text>
            </View>
          </View>

          {/* Fila inferior: Indicador de comprobante y botones CRUD (Editar / Eliminar) */}
          <View style={styles.footerRow}>
            <View style={styles.badgeContainer}>
              {expense.factura_adjuntar ? (
                <View style={styles.facturaBadge}>
                  <Text style={styles.facturaBadgeText}>🧾 Con factura</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.actionsContainer}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onEdit(expense)}
                  activeOpacity={0.7}
                  accessibilityLabel="Editar gasto"
                >
                  <Text style={styles.actionIcon}>✏️</Text>
                  <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => onDelete(expense)}
                  activeOpacity={0.7}
                  accessibilityLabel="Eliminar gasto"
                >
                  <Text style={styles.actionIcon}>🗑️</Text>
                  <Text style={[styles.actionText, styles.deleteText]}>Eliminar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.two,
  },
  cardLayout: {
    gap: Spacing.two,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.two,
  },
  iconContainer: {
    marginRight: Spacing.two,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
  },
  infoContainer: {
    flex: 1,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
    color: LiquidGlassColors.glassText,
    marginBottom: Spacing.half,
  },
  description: {
    fontSize: 13,
    color: LiquidGlassColors.glassTextSecondary,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LiquidGlassColors.primary,
    marginBottom: Spacing.half,
  },
  date: {
    fontSize: 12,
    color: LiquidGlassColors.glassTextSecondary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LiquidGlassColors.glassBorder,
  },
  badgeContainer: {
    flex: 1,
  },
  facturaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
  },
  facturaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: LiquidGlassColors.glassTextSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    gap: Spacing.half,
  },
  deleteButton: {
    backgroundColor: LiquidGlassColors.glassBackgroundDark,
  },
  actionIcon: {
    fontSize: 12,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: LiquidGlassColors.glassText,
  },
  deleteText: {
    color: LiquidGlassColors.secondary,
  },
});
