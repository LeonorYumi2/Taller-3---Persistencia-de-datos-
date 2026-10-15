import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Category, CATEGORIES, CATEGORY_ICONS, Expense } from '@/types/expense';
import { LiquidGlassColors, Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/ExpenseContext';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  expenseToEdit?: Expense | null;
}

// Límite máximo de caracteres para el campo de descripción
const MAX_DESCRIPTION_LENGTH = 400;

// Permite solo letras del alfabeto (incluyendo vocales con tildes y eñes en español), números y espacios básicos
const DESCRIPTION_REGEX = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]*$/;

// Genera la fecha actual en formato AAAA-MM-DD
function getTodayString(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Convierte un objeto Date en formato AAAA-MM-DD
function formatDateToString(d: Date): string {
  const dateObj = new Date(d);
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Validación estricta del campo Monto
function validateAmount(raw: string): { valid: boolean; value?: number; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: 'El monto es obligatorio.' };
  }

  // Permite reemplazar coma por punto para teclados decimales de diversas regiones
  const normalized = trimmed.replace(',', '.');

  // Solo enteros o números con máximo 2 decimales (ej. 15, 15.5, 15.50)
  const amountRegex = /^\d+(\.\d{1,2})?$/;
  if (!amountRegex.test(normalized)) {
    return {
      valid: false,
      error: 'Formato incorrecto. Ingresa un número válido con máximo dos decimales (ej: 15.50).',
    };
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed) || parsed <= 0) {
    return { valid: false, error: 'El monto debe ser un número mayor a 0.' };
  }

  if (parsed > 999999999) {
    return { valid: false, error: 'El monto ingresado excede el límite permitido.' };
  }

  return { valid: true, value: parsed };
}

// Validación estricta y exhaustiva del formato y rango de fecha
function parseAndValidateDate(str: string): { valid: boolean; date?: Date; error?: string } {
  const trimmed = str.trim();
  if (!trimmed) {
    return { valid: false, error: 'La fecha es obligatoria.' };
  }

  const regex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = trimmed.match(regex);
  if (!match) {
    return { valid: false, error: 'Formato inválido. Usa AAAA-MM-DD (ej: 2026-10-15).' };
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) {
    return { valid: false, error: 'El año debe estar entre 1900 y 2100.' };
  }
  if (month < 1 || month > 12) {
    return { valid: false, error: 'El mes debe estar entre 01 y 12.' };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return { valid: false, error: `El día debe estar entre 01 y ${daysInMonth} para el mes seleccionado.` };
  }

  // Fijado a las 12:00:00 para evitar desfases UTC
  const parsedDate = new Date(year, month - 1, day, 12, 0, 0);
  if (isNaN(parsedDate.getTime())) {
    return { valid: false, error: 'La fecha ingresada no es válida.' };
  }

  return { valid: true, date: parsedDate };
}

// Validación estricta del campo Descripción (opcional)
function validateDescription(raw: string): { valid: boolean; error?: string } {
  if (!raw) return { valid: true };

  if (raw.length > MAX_DESCRIPTION_LENGTH) {
    return {
      valid: false,
      error: `La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres (actual: ${raw.length}).`,
    };
  }

  if (!DESCRIPTION_REGEX.test(raw)) {
    return {
      valid: false,
      error: 'La descripción no admite caracteres especiales. Solo letras, números y espacios.',
    };
  }

  return { valid: true };
}

// Modal para registrar o editar un gasto con control de errores integrado
export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  onClose,
  expenseToEdit,
}) => {
  const { addExpense, updateExpense } = useExpenses();

  // Estados de los campos
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [dateInput, setDateInput] = useState(getTodayString());
  const [facturaUri, setFacturaUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de control de errores visuales
  const [amountError, setAmountError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // Sincroniza campos y limpia errores cuando el modal se abre o cambia el gasto a editar
  useEffect(() => {
    if (visible) {
      if (expenseToEdit) {
        setAmount(expenseToEdit.amount.toString());
        setCategory(expenseToEdit.category);
        setDescription(expenseToEdit.description ?? '');
        setDateInput(formatDateToString(expenseToEdit.date));
        setFacturaUri(expenseToEdit.factura_adjuntar ?? null);
      } else {
        setAmount('');
        setCategory(null);
        setDescription('');
        setDateInput(getTodayString());
        setFacturaUri(null);
      }
      setAmountError(null);
      setCategoryError(null);
      setDateError(null);
      setDescriptionError(null);
    }
  }, [visible, expenseToEdit]);

  const handleClose = () => {
    setAmount('');
    setCategory(null);
    setDescription('');
    setDateInput(getTodayString());
    setFacturaUri(null);
    setAmountError(null);
    setCategoryError(null);
    setDateError(null);
    setDescriptionError(null);
    onClose();
  };

  // Selector de imagen desde la cámara
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso denegado',
          'Se requiere permiso de acceso a la cámara para fotografiar la factura o comprobante.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFacturaUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al abrir la cámara:', error);
      Alert.alert('Error', 'No se pudo capturar la foto.');
    }
  };

  // Selector de imagen desde la galería
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso denegado',
          'Se requiere permiso para acceder a la galería y adjuntar la factura.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFacturaUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar de la galería:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen de la galería.');
    }
  };

  // Validación integral y guardado en SQLite
  const handleSubmit = async () => {
    if (isSubmitting) return;

    // 1. Validación estricta del Monto
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid || amountValidation.value === undefined) {
      setAmountError(amountValidation.error ?? 'Monto inválido');
      Alert.alert('Monto requerido', amountValidation.error ?? 'Ingresa un monto válido.');
      return;
    }

    // 2. Validación estricta de la Categoría
    if (!category) {
      setCategoryError('Debes seleccionar una categoría para clasificar el gasto.');
      Alert.alert('Categoría requerida', 'Por favor selecciona una categoría antes de guardar.');
      return;
    }

    // 3. Validación estricta de la Fecha
    const dateValidation = parseAndValidateDate(dateInput);
    if (!dateValidation.valid || !dateValidation.date) {
      setDateError(dateValidation.error ?? 'Fecha no válida');
      Alert.alert('Fecha inválida', dateValidation.error ?? 'La fecha es obligatoria y debe tener formato AAAA-MM-DD.');
      return;
    }

    // 4. Validación estricta de la Descripción
    const descValidation = validateDescription(description);
    if (!descValidation.valid) {
      setDescriptionError(descValidation.error ?? 'Descripción inválida');
      Alert.alert('Descripción inválida', descValidation.error ?? 'Corrige los caracteres no permitidos en la descripción.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedAmount = amountValidation.value;
      const cleanDescription = description.trim() || undefined;

      if (expenseToEdit) {
        await updateExpense({
          id: expenseToEdit.id,
          amount: parsedAmount,
          category,
          date: dateValidation.date,
          description: cleanDescription,
          factura_adjuntar: facturaUri ?? undefined,
        });
      } else {
        await addExpense({
          amount: parsedAmount,
          category,
          date: dateValidation.date,
          description: cleanDescription,
          factura_adjuntar: facturaUri ?? undefined,
        });
      }
      handleClose();
    } catch (error) {
      console.error('Error al guardar el gasto:', error);
      Alert.alert('Error', 'No se pudo guardar el gasto en la base de datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View entering={FadeIn} style={styles.backdropBlur}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>
        </TouchableOpacity>

        <Animated.View
          entering={SlideInDown.springify()}
          style={styles.modalContent}
        >
          <View style={styles.modalBackground}>
            <BlurView intensity={100} tint="light" style={styles.modalBlur}>
              <View style={styles.handleBar} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
              >
                <Text style={styles.title}>
                  {expenseToEdit ? 'Editar Gasto' : 'Agregar Gasto'}
                </Text>

                {/* Monto (Obligatorio, decimales válidos) */}
                <View style={styles.inputSection}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Monto (USD) *</Text>
                    {amountError ? (
                      <Text style={styles.fieldErrorIndicator}>⚠️ Obligatorio</Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.inputContainer,
                      amountError ? styles.inputErrorBorder : null,
                    ]}
                  >
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.input}
                      value={amount}
                      onChangeText={(text) => {
                        setAmount(text);
                        if (amountError) {
                          const val = validateAmount(text);
                          if (val.valid) setAmountError(null);
                        }
                      }}
                      onBlur={() => {
                        if (amount.trim()) {
                          const val = validateAmount(amount);
                          if (!val.valid) setAmountError(val.error ?? null);
                          else setAmountError(null);
                        }
                      }}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor={LiquidGlassColors.glassTextSecondary}
                    />
                  </View>
                  {amountError ? (
                    <Text style={styles.errorText}>{amountError}</Text>
                  ) : null}
                </View>

                {/* Categoría (Obligatoria, bloquea acción y muestra alerta visual) */}
                <View style={styles.inputSection}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Categoría *</Text>
                    {categoryError ? (
                      <Text style={styles.fieldErrorIndicator}>⚠️ Requerida</Text>
                    ) : null}
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoriesScroll}
                    contentContainerStyle={styles.categoriesContent}
                  >
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => {
                          setCategory(cat);
                          if (categoryError) setCategoryError(null);
                        }}
                        style={[
                          styles.categoryButton,
                          category === cat && styles.categoryButtonActive,
                          categoryError && category !== cat && styles.categoryButtonHighlightNeeded,
                        ]}
                      >
                        {category === cat ? (
                          <LinearGradient
                            colors={[
                              LiquidGlassColors.primary,
                              LiquidGlassColors.secondary,
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.categoryGradient}
                          >
                            <Text style={styles.categoryIcon}>
                              {CATEGORY_ICONS[cat]}
                            </Text>
                            <Text style={styles.categoryTextActive}>{cat}</Text>
                          </LinearGradient>
                        ) : (
                          <>
                            <Text style={styles.categoryIcon}>
                              {CATEGORY_ICONS[cat]}
                            </Text>
                            <Text style={styles.categoryText}>{cat}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Mensaje de advertencia visual para categoría */}
                  {categoryError ? (
                    <View style={styles.categoryWarningBanner}>
                      <Text style={styles.categoryWarningText}>
                        ⚠️ {categoryError}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Fecha (Obligatoria) */}
                <View style={styles.inputSection}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Fecha (Obligatoria) *</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setDateInput(getTodayString());
                        setDateError(null);
                      }}
                      style={styles.todayButton}
                    >
                      <Text style={styles.todayButtonText}>📅 Hoy</Text>
                    </TouchableOpacity>
                  </View>
                  <View
                    style={[
                      styles.inputContainer,
                      dateError ? styles.inputErrorBorder : null,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      value={dateInput}
                      onChangeText={(text) => {
                        setDateInput(text);
                        if (dateError) setDateError(null);
                      }}
                      placeholder="AAAA-MM-DD (ej: 2026-10-15)"
                      placeholderTextColor={LiquidGlassColors.glassTextSecondary}
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                    />
                  </View>
                  {dateError ? (
                    <Text style={styles.errorText}>{dateError}</Text>
                  ) : null}
                </View>

                {/* Factura / Comprobante (Opcional) */}
                <View style={styles.inputSection}>
                  <Text style={styles.label}>Factura / Comprobante (Opcional)</Text>
                  {facturaUri ? (
                    <View style={styles.previewContainer}>
                      <Image
                        source={{ uri: facturaUri }}
                        style={styles.previewImage}
                        contentFit="cover"
                        transition={200}
                      />
                      <View style={styles.previewActions}>
                        <TouchableOpacity
                          style={styles.changeImageButton}
                          onPress={handlePickImage}
                        >
                          <Text style={styles.changeImageText}>🔄 Cambiar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => setFacturaUri(null)}
                        >
                          <Text style={styles.removeImageText}>🗑️ Quitar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePickerRow}>
                      <TouchableOpacity
                        style={styles.imagePickerButton}
                        onPress={handleTakePhoto}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.imagePickerIcon}>📷</Text>
                        <Text style={styles.imagePickerText}>Tomar Foto</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.imagePickerButton}
                        onPress={handlePickImage}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.imagePickerIcon}>🖼️</Text>
                        <Text style={styles.imagePickerText}>Galería</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Descripción (Opcional con contador y filtro de caracteres especiales) */}
                <View style={styles.inputSection}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Descripción (Opcional)</Text>
                    <Text
                      style={[
                        styles.charCounter,
                        description.length >= MAX_DESCRIPTION_LENGTH && styles.charCounterLimit,
                      ]}
                    >
                      {description.length}/{MAX_DESCRIPTION_LENGTH}
                    </Text>
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      styles.descriptionInput,
                      descriptionError ? styles.inputErrorBorder : null,
                    ]}
                    value={description}
                    onChangeText={(text) => {
                      setDescription(text);
                      if (text) {
                        const val = validateDescription(text);
                        if (!val.valid) {
                          setDescriptionError(val.error ?? null);
                        } else {
                          setDescriptionError(null);
                        }
                      } else {
                        setDescriptionError(null);
                      }
                    }}
                    placeholder="Ej: Almuerzo, transporte a la universidad..."
                    placeholderTextColor={LiquidGlassColors.glassTextSecondary}
                    multiline
                    maxLength={MAX_DESCRIPTION_LENGTH}
                  />
                  {descriptionError ? (
                    <Text style={styles.errorText}>{descriptionError}</Text>
                  ) : null}
                </View>

                {/* Botones de acción */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClose}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      isSubmitting && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[LiquidGlassColors.primary, LiquidGlassColors.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.submitGradient}
                    >
                      <Text style={styles.submitButtonText}>
                        {isSubmitting
                          ? 'Guardando...'
                          : expenseToEdit
                          ? 'Guardar Cambios'
                          : 'Agregar'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </BlurView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  backdropBlur: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
  },
  modalBlur: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    maxHeight: '100%',
  },
  scrollContent: {
    paddingBottom: Spacing.five,
  },
  handleBar: {
    width: 40,
    height: Spacing.one,
    backgroundColor: LiquidGlassColors.glassTextSecondary,
    borderRadius: Spacing.half,
    alignSelf: 'center',
    marginBottom: Spacing.three,
    marginTop: Spacing.two,
    opacity: 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: LiquidGlassColors.glassText,
    marginBottom: Spacing.four,
  },
  inputSection: {
    marginBottom: Spacing.three,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: LiquidGlassColors.glassText,
  },
  fieldErrorIndicator: {
    fontSize: 12,
    fontWeight: '600',
    color: LiquidGlassColors.secondary,
  },
  charCounter: {
    fontSize: 12,
    fontWeight: '500',
    color: LiquidGlassColors.glassTextSecondary,
  },
  charCounterLimit: {
    color: LiquidGlassColors.secondary,
    fontWeight: 'bold',
  },
  todayButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: LiquidGlassColors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    paddingHorizontal: Spacing.three,
  },
  inputErrorBorder: {
    borderColor: LiquidGlassColors.secondary,
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    color: LiquidGlassColors.secondary,
    marginTop: Spacing.one,
    fontWeight: '500',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: LiquidGlassColors.primary,
    marginRight: Spacing.one,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: LiquidGlassColors.glassText,
    paddingVertical: Spacing.two,
  },
  descriptionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    paddingHorizontal: Spacing.three,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  categoriesScroll: {
    marginHorizontal: -Spacing.two,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
  },
  categoryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    padding: Spacing.two,
    minWidth: 100,
    alignItems: 'center',
  },
  categoryButtonActive: {
    borderColor: 'transparent',
  },
  categoryButtonHighlightNeeded: {
    borderColor: LiquidGlassColors.glassBorder,
  },
  categoryWarningBanner: {
    marginTop: Spacing.one,
    backgroundColor: LiquidGlassColors.glassBackgroundDark,
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: LiquidGlassColors.secondary,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  categoryWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: LiquidGlassColors.secondary,
  },
  categoryGradient: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    width: '100%',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: Spacing.one,
  },
  categoryText: {
    fontSize: 12,
    color: LiquidGlassColors.glassText,
    textAlign: 'center',
  },
  categoryTextActive: {
    fontSize: 12,
    color: LiquidGlassColors.glassTextLight,
    fontWeight: '600',
    textAlign: 'center',
  },
  imagePickerRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  imagePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  imagePickerIcon: {
    fontSize: 18,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: LiquidGlassColors.glassText,
  },
  previewContainer: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
    padding: Spacing.two,
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: Spacing.one,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  changeImageButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    paddingVertical: Spacing.one,
    alignItems: 'center',
  },
  changeImageText: {
    fontSize: 13,
    fontWeight: '600',
    color: LiquidGlassColors.glassText,
  },
  removeImageButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    paddingVertical: Spacing.one,
    alignItems: 'center',
  },
  removeImageText: {
    fontSize: 13,
    fontWeight: '600',
    color: LiquidGlassColors.secondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: LiquidGlassColors.glassText,
  },
  submitButton: {
    flex: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LiquidGlassColors.glassTextLight,
  },
});
