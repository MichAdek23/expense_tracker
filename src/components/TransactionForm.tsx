import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Transaction, TransactionType, CATEGORIES } from '../types';

interface TransactionFormProps {
  visible: boolean;
  currency: 'NGN' | 'USD';
  exchangeRate: number;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'> & { id?: string }) => void;
  editingTransaction?: Transaction | null;
}

export const TransactionForm = ({
  visible,
  currency,
  exchangeRate,
  onClose,
  onSave,
  editingTransaction,
}: TransactionFormProps) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getLocalDateString = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    setError(null);
  }, [title, amount, date, type, category]);

  // Custom Date Picker states & calendar logic
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handleOpenDatePicker = () => {
    let activeDate = new Date();
    if (date) {
      const parts = date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const parsed = new Date(y, m, d);
        if (!isNaN(parsed.getTime())) {
          activeDate = parsed;
        }
      }
    }
    setTempDate(activeDate);
    setCalendarYear(activeDate.getFullYear());
    setCalendarMonth(activeDate.getMonth());
    setShowDatePicker(true);
  };

  const handleSelectDay = (day: number) => {
    const selected = new Date(calendarYear, calendarMonth, day);
    setTempDate(selected);
  };

  const confirmCustomDate = () => {
    const y = tempDate.getFullYear();
    const m = String(tempDate.getMonth() + 1).padStart(2, '0');
    const d = String(tempDate.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${d}`);
    setShowDatePicker(false);
  };

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const getDaysGrid = () => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
    
    const grid = [];
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(d);
    }
    return grid;
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const parsed = new Date(y, m, d);
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Pre-fill when editing
  useEffect(() => {
    if (editingTransaction) {
      setTitle(editingTransaction.title);
      
      // Calculate display amount (stored in NGN, display in current preference)
      const displayAmount = currency === 'USD' 
        ? editingTransaction.amount / exchangeRate 
        : editingTransaction.amount;
      
      setAmount(displayAmount.toFixed(2));
      setType(editingTransaction.type);
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setNote(editingTransaction.note || '');
    } else {
      resetForm();
    }
  }, [editingTransaction, visible]);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setType('expense');
    setCategory('Food');
    setDate(getLocalDateString());
    setNote('');
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError('Please enter a description');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      setError('Please enter a valid date in YYYY-MM-DD format');
      return;
    }

    // Convert saved amount back to base NGN if input is USD
    const baseAmount = currency === 'USD' ? parsedAmount * exchangeRate : parsedAmount;

    onSave({
      id: editingTransaction?.id,
      title: title.trim(),
      amount: baseAmount,
      type,
      category,
      date,
      time: editingTransaction?.time || (() => {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        return `${hrs}:${mins}`;
      })(),
      note: note.trim() || undefined,
    });

    resetForm();
    onClose();
  };

  const setToday = () => {
    setDate(getLocalDateString());
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setDate(getLocalDateString(yesterday));
  };

  // Filter categories by type (expense categories vs income categories)
  const availableCategories = Object.keys(CATEGORIES).filter((catKey) => {
    if (type === 'income') {
      return ['Salary', 'Investments', 'Gifts', 'Others'].includes(catKey);
    } else {
      return !['Salary', 'Investments', 'Gifts'].includes(catKey);
    }
  });

  // Adjust default category if it doesn't match type
  useEffect(() => {
    if (type === 'income' && !['Salary', 'Investments', 'Gifts', 'Others'].includes(category)) {
      setCategory('Salary');
    } else if (type === 'expense' && ['Salary', 'Investments', 'Gifts'].includes(category)) {
      setCategory('Food');
    }
  }, [type]);

  const currencySymbol = currency === 'NGN' ? '₦' : '$';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {error && (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={16} color="#FF6B6B" />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}
              {/* Type Switcher */}
              <View style={styles.typeContainer}>
                <TouchableOpacity
                  style={[
                    styles.typeTab,
                    type === 'expense' && styles.activeExpenseTab,
                  ]}
                  onPress={() => setType('expense')}
                >
                  <Text
                    style={[
                      styles.typeText,
                      type === 'expense' && styles.activeTypeText,
                    ]}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeTab,
                    type === 'income' && styles.activeIncomeTab,
                  ]}
                  onPress={() => setType('income')}
                >
                  <Text
                    style={[
                      styles.typeText,
                      type === 'income' && styles.activeTypeText,
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <View style={styles.amountInputWrapper}>
                <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                <TextInput
                  style={[
                    styles.amountInput,
                    type === 'expense' ? styles.expenseColor : styles.incomeColor,
                  ]}
                  placeholder="0.00"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus={!editingTransaction}
                />
              </View>

              {/* Input Form Group */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Grocery Store"
                  placeholderTextColor="#4B5563"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Category Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {availableCategories.map((catKey) => {
                    const config = CATEGORIES[catKey];
                    const isSelected = category === catKey;
                    return (
                      <TouchableOpacity
                        key={catKey}
                        style={[
                          styles.categoryItem,
                          isSelected && {
                            backgroundColor: config.bgLight,
                            borderColor: config.color,
                          },
                        ]}
                        onPress={() => setCategory(catKey)}
                      >
                        <View
                          style={[
                            styles.categoryIconCircle,
                            { backgroundColor: isSelected ? config.color : 'rgba(255,255,255,0.05)' },
                          ]}
                        >
                          <Feather
                            name={config.icon as any}
                            size={16}
                            color={isSelected ? '#090D16' : config.color}
                          />
                        </View>
                        <Text
                          style={[
                            styles.categoryItemText,
                            isSelected && { color: '#FFF', fontWeight: '600' },
                          ]}
                        >
                          {config.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Date Input */}
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Date</Text>
                  <View style={styles.dateQuickButtons}>
                    <TouchableOpacity onPress={setToday} style={styles.dateQuickBtn}>
                      <Text style={styles.dateQuickBtnText}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={setYesterday} style={styles.dateQuickBtn}>
                      <Text style={styles.dateQuickBtnText}>Yesterday</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.dateSelector}
                  onPress={handleOpenDatePicker}
                >
                  <Text style={styles.dateSelectorText}>
                    {formatDisplayDate(date)}
                  </Text>
                  <Feather name="calendar" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Custom Branded Calendar Date Picker Modal Popup */}
              <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.calendarModalOverlay}>
                  <View style={styles.calendarCard}>
                    {/* Header */}
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity onPress={prevMonth} style={styles.calendarArrowBtn}>
                        <Feather name="chevron-left" size={20} color="#00A884" />
                      </TouchableOpacity>
                      <Text style={styles.calendarMonthYear}>
                        {MONTH_NAMES[calendarMonth]} {calendarYear}
                      </Text>
                      <TouchableOpacity onPress={nextMonth} style={styles.calendarArrowBtn}>
                        <Feather name="chevron-right" size={20} color="#00A884" />
                      </TouchableOpacity>
                    </View>

                    {/* Weekday labels */}
                    <View style={styles.weekdaysRow}>
                      {WEEKDAYS.map((day) => (
                        <Text key={day} style={styles.weekdayText}>
                          {day}
                        </Text>
                      ))}
                    </View>

                    {/* Days grid */}
                    <View style={styles.daysGrid}>
                      {getDaysGrid().map((day, idx) => {
                        if (day === null) {
                          return <View key={`empty-${idx}`} style={styles.emptyDayCell} />;
                        }

                        const isSelected = 
                          tempDate.getFullYear() === calendarYear &&
                          tempDate.getMonth() === calendarMonth &&
                          tempDate.getDate() === day;

                        const today = new Date();
                        const isToday = 
                          today.getFullYear() === calendarYear &&
                          today.getMonth() === calendarMonth &&
                          today.getDate() === day;

                        return (
                          <TouchableOpacity
                            key={`day-${day}`}
                            style={[
                              styles.dayCell,
                              isSelected && styles.selectedDayCell,
                              isToday && !isSelected && styles.todayDayCell,
                            ]}
                            onPress={() => handleSelectDay(day)}
                          >
                            <Text
                              style={[
                                styles.dayText,
                                isSelected && styles.selectedDayText,
                                isToday && !isSelected && styles.todayDayText,
                              ]}
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Actions */}
                    <View style={styles.calendarActions}>
                      <TouchableOpacity
                        style={[styles.calendarActionBtn, styles.calendarCancelBtn]}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.calendarCancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.calendarActionBtn, styles.calendarConfirmBtn]}
                        onPress={confirmCustomDate}
                      >
                        <Text style={styles.calendarConfirmBtnText}>Confirm</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>

              {/* Notes */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add some details..."
                  placeholderTextColor="#4B5563"
                  multiline
                  numberOfLines={3}
                  value={note}
                  onChangeText={setNote}
                />
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  type === 'expense' ? styles.saveExpenseBtn : styles.saveIncomeBtn,
                ]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>
                  {editingTransaction ? 'Update Transaction' : 'Save Transaction'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
    maxHeight: '85%',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 24,
  },
  typeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeExpenseTab: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  activeIncomeTab: {
    backgroundColor: 'rgba(0, 168, 132, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 132, 0.3)',
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeTypeText: {
    color: '#FFFFFF',
  },
  amountInputWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  currencySymbol: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 44,
    fontWeight: '700',
    minWidth: 150,
    textAlign: 'left',
    padding: 0,
  },
  expenseColor: {
    color: '#FF6B6B',
  },
  incomeColor: {
    color: '#00A884',
  },
  formGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  dateQuickButtons: {
    flexDirection: 'row',
  },
  dateQuickBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  dateQuickBtnText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  inputIconWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 48,
    paddingVertical: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    paddingVertical: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
  },
  categoryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryItemText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  saveExpenseBtn: {
    backgroundColor: '#FF6B6B',
  },
  saveIncomeBtn: {
    backgroundColor: '#00A884',
  },
  saveButtonText: {
    color: '#0B141A',
    fontSize: 16,
    fontWeight: '700',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dateSelectorText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarMonthYear: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekdayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayCell: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  emptyDayCell: {
    width: 38,
    height: 38,
    marginVertical: 2,
  },
  selectedDayCell: {
    backgroundColor: '#00A884',
  },
  todayDayCell: {
    borderWidth: 1,
    borderColor: '#00A884',
  },
  dayText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#0B141A',
    fontWeight: '700',
  },
  todayDayText: {
    color: '#00A884',
    fontWeight: '700',
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 16,
  },
  calendarActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 12,
  },
  calendarCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  calendarConfirmBtn: {
    backgroundColor: '#00A884',
  },
  calendarCancelBtnText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarConfirmBtnText: {
    color: '#0B141A',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorBannerText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
});
