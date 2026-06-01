import React, { useState, useImperativeHandle, forwardRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { G, Circle } from 'react-native-svg';
import { CategoryBudget, CATEGORIES, Transaction } from '../types';

export interface BudgetManagerRef {
  openAddBudgetModal: () => void;
}

interface BudgetManagerProps {
  budgets: CategoryBudget[];
  transactions: Transaction[];
  currency: 'NGN' | 'USD';
  exchangeRate: number;
  onSaveBudget: (category: string, limit: number) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const BudgetManager = forwardRef<BudgetManagerRef, BudgetManagerProps>(({
  budgets,
  transactions,
  currency,
  exchangeRate,
  onSaveBudget,
  onShowToast,
}, ref) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');

  // Add budget modal states
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newLimitInput, setNewLimitInput] = useState('');

  // Long press actions modal states
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [selectedActionCategory, setSelectedActionCategory] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    openAddBudgetModal: () => {
      setSelectedCategory(null);
      setNewLimitInput('');
      setIsAddModalVisible(true);
    }
  }));

  const getLocalMonthString = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const currentMonthStr = getLocalMonthString(); // YYYY-MM

  const getSpentAmountForCategory = (category: string) => {
    return transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.category === category &&
          t.date.startsWith(currentMonthStr)
      )
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleEditPress = (category: string, currentLimit: number) => {
    setEditingCategory(category);
    setLimitInput(currentLimit ? Math.round(currentLimit).toString() : '');
  };

  const handleSavePress = (category: string) => {
    const parsedLimit = parseFloat(limitInput);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      onShowToast('Please enter a valid budget limit.', 'error');
      return;
    }
    
    onSaveBudget(category, parsedLimit);
    setEditingCategory(null);
    setLimitInput('');
    onShowToast('Budget limit updated.', 'success');
  };

  const handleCreateBudget = () => {
    if (!selectedCategory) {
      onShowToast('Please select a category.', 'error');
      return;
    }
    const parsedLimit = parseFloat(newLimitInput);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      onShowToast('Please enter a valid budget limit.', 'error');
      return;
    }

    onSaveBudget(selectedCategory, parsedLimit);
    setIsAddModalVisible(false);
    setSelectedCategory(null);
    setNewLimitInput('');
    onShowToast(`Budget for ${selectedCategory} created successfully!`, 'success');
  };

  const triggerEdit = () => {
    if (selectedActionCategory) {
      const budget = budgets.find((b) => b.category === selectedActionCategory);
      if (budget) {
        handleEditPress(selectedActionCategory, budget.limit);
      }
    }
    setIsActionModalVisible(false);
  };

  const triggerDelete = () => {
    if (selectedActionCategory) {
      onSaveBudget(selectedActionCategory, 0);
      const config = CATEGORIES[selectedActionCategory] || CATEGORIES.Others;
      onShowToast(`Budget for ${config.name} removed.`, 'success');
    }
    setIsActionModalVisible(false);
  };

  const formatDisplayVal = (amount: number) => {
    if (currency === 'USD') {
      const val = amount / exchangeRate;
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `₦${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Only show expense categories for budgeting
  const expenseCategoryKeys = Object.keys(CATEGORIES).filter(
    (key) => !['Salary', 'Investments', 'Gifts'].includes(key)
  );

  // Available categories that don't have a budget set yet
  const availableCategories = expenseCategoryKeys.filter(
    (catKey) => !budgets.some((b) => b.category === catKey)
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <View style={{ marginTop: 16 }} />

        {/* Allocations listed directly on the page and separated by lines */}
        {budgets.length > 0 ? (
          budgets.map((budget, index) => {
            const catKey = budget.category;
            const categoryConfig = CATEGORIES[catKey] || CATEGORIES.Others;
            const limit = budget.limit;
            const spent = getSpentAmountForCategory(catKey);
            
            const isEditing = editingCategory === catKey;
            
            // Calculate percentage
            const percent = limit > 0 ? (spent / limit) * 100 : 0;
            const percentFormatted = percent.toFixed(0);

            // Get progress bar color
            let progressColor = '#00A884'; // WhatsApp Green
            if (percent >= 100) {
              progressColor = '#FF6B6B'; // Red
            } else if (percent >= 80) {
              progressColor = '#FFD93D'; // Amber
            }

            const isLast = index === budgets.length - 1;
            const circumference = 125.6; // 2 * pi * r (r=20)
            const dashoffset = circumference - (Math.min(percent, 100) / 100) * circumference;

            return (
              <View key={catKey}>
                <TouchableOpacity 
                  style={styles.budgetRow}
                  activeOpacity={0.7}
                  onLongPress={() => {
                    if (!isEditing) {
                      setSelectedActionCategory(catKey);
                      setIsActionModalVisible(true);
                    }
                  }}
                >
                  {/* Left: Circular progress wrapper */}
                  <View style={styles.progressCircleWrapper}>
                    <Svg width={48} height={48} viewBox="0 0 48 48">
                      <G rotation="-90" origin="24, 24">
                        <Circle
                          cx="24"
                          cy="24"
                          r={20}
                          stroke="rgba(255, 255, 255, 0.05)"
                          strokeWidth={3.5}
                          fill="transparent"
                        />
                        <Circle
                          cx="24"
                          cy="24"
                          r={20}
                          stroke={progressColor}
                          strokeWidth={3.5}
                          strokeDasharray={`${circumference}`}
                          strokeDashoffset={dashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </G>
                    </Svg>
                    <View style={[styles.innerCircleBadge, { backgroundColor: categoryConfig.bgLight }]}>
                      <Feather name={categoryConfig.icon as any} size={15} color={categoryConfig.color} />
                    </View>
                  </View>

                  {/* Middle: Details or Inline Editing */}
                  {isEditing ? (
                    <View style={styles.editRowInline}>
                      <TextInput
                        style={styles.limitInput}
                        keyboardType="numeric"
                        value={limitInput}
                        onChangeText={setLimitInput}
                        placeholder="Limit"
                        placeholderTextColor="#4B5563"
                        autoFocus
                      />
                      <TouchableOpacity
                        onPress={() => handleSavePress(catKey)}
                        style={[styles.actionBtn, styles.saveBtn]}
                      >
                        <Feather name="check" size={14} color="#0B141A" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setEditingCategory(null)}
                        style={[styles.actionBtn, styles.cancelBtn]}
                      >
                        <Feather name="x" size={14} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.rowDetails}>
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {categoryConfig.name}
                      </Text>
                      <Text style={styles.spentText} numberOfLines={1}>
                        {formatDisplayVal(spent)} <Text style={styles.limitLabelText}>of {formatDisplayVal(limit)}</Text>
                      </Text>
                    </View>
                  )}

                  {/* Right: Percentage used or warning badge */}
                  {!isEditing && (
                    <View style={styles.rowRight}>
                      {percent >= 100 ? (
                        <View style={styles.alertBadge}>
                          <Feather name="alert-triangle" size={10} color="#FF6B6B" />
                          <Text style={styles.alertText}>{percentFormatted}%</Text>
                        </View>
                      ) : percent >= 80 ? (
                        <View style={[styles.alertBadge, { backgroundColor: 'rgba(255, 217, 61, 0.08)', borderColor: 'rgba(255, 217, 61, 0.15)' }]}>
                          <Feather name="alert-circle" size={10} color="#FFD93D" />
                          <Text style={[styles.alertText, { color: '#FFD93D' }]}>{percentFormatted}%</Text>
                        </View>
                      ) : (
                        <Text style={[styles.percentLabelText, { color: progressColor }]}>
                          {percentFormatted}%
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
                {!isLast && <View style={styles.budgetSeparator} />}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Feather name="shield-off" size={48} color="#4B5563" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>No active budget allocations.</Text>
            <Text style={styles.emptySubText}>Tap "Add Budget" to configure your first limit.</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Budget Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Budget Allocation</Text>
                <TouchableOpacity onPress={() => setIsAddModalVisible(false)} style={styles.closeBtn}>
                  <Feather name="x" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScroll}
              >
                <Text style={styles.modalLabel}>Select Category</Text>
                
                {availableCategories.length > 0 ? (
                  <View style={styles.categoryGrid}>
                    {availableCategories.map((catKey) => {
                      const config = CATEGORIES[catKey];
                      const isSelected = selectedCategory === catKey;
                      return (
                        <TouchableOpacity
                          key={catKey}
                          style={[
                            styles.modalCategoryItem,
                            isSelected && { borderColor: config.color, backgroundColor: 'rgba(255,255,255,0.02)' }
                          ]}
                          onPress={() => setSelectedCategory(catKey)}
                        >
                          <View style={[styles.modalIconCircle, { backgroundColor: isSelected ? config.color : config.bgLight }]}>
                            <Feather name={config.icon as any} size={14} color={isSelected ? '#0B141A' : config.color} />
                          </View>
                          <Text style={[styles.modalCategoryName, isSelected && { color: config.color, fontWeight: '700' }]}>
                            {config.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.noCategoriesText}>
                    All expense categories have configured budgets.
                  </Text>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Monthly Limit (₦)</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currencyPrefix}>₦</Text>
                    <TextInput
                      style={styles.modalInput}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor="#4B5563"
                      value={newLimitInput}
                      onChangeText={setNewLimitInput}
                    />
                  </View>
                </View>

                {availableCategories.length > 0 && (
                  <TouchableOpacity
                    style={styles.createBtn}
                    onPress={handleCreateBudget}
                  >
                    <Text style={styles.createBtnText}>Create Budget</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Long Press Actions Modal */}
      <Modal
        visible={isActionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsActionModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.dialogOverlay}
          activeOpacity={1}
          onPress={() => setIsActionModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Manage Budget</Text>
            <Text style={styles.dialogMessage}>
              Choose an action for "{selectedActionCategory ? (CATEGORIES[selectedActionCategory]?.name || selectedActionCategory) : ''}" allocation:
            </Text>

            <TouchableOpacity 
              style={[styles.dialogOptionBtn, { backgroundColor: 'rgba(0, 168, 132, 0.1)' }]} 
              onPress={triggerEdit}
            >
              <Feather name="edit-2" size={16} color="#00A884" style={{ marginRight: 10 }} />
              <Text style={[styles.dialogOptionText, { color: '#00A884' }]}>Edit Budget Limit</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dialogOptionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', marginTop: 12 }]} 
              onPress={triggerDelete}
            >
              <Feather name="trash-2" size={16} color="#FF6B6B" style={{ marginRight: 10 }} />
              <Text style={[styles.dialogOptionText, { color: '#FF6B6B' }]}>Delete Budget</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dialogOptionBtn, { backgroundColor: 'rgba(255, 255, 255, 0.03)', marginTop: 12 }]} 
              onPress={() => setIsActionModalVisible(false)}
            >
              <Text style={[styles.dialogOptionText, { color: '#9CA3AF' }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#00A884',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  budgetCardGroup: {
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderWidth: 1,
    borderColor: 'rgba(134, 150, 160, 0.15)', // WhatsApp border grey
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  budgetSeparator: {
    height: 1,
    backgroundColor: 'rgba(134, 150, 160, 0.15)', // WhatsApp border grey
    marginHorizontal: 0,
  },
  progressCircleWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircleBadge: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowDetails: {
    flex: 1,
    marginLeft: 14,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  spentText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  limitLabelText: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  rowRight: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  percentLabelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  editRowInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 14,
  },
  limitInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#FFFFFF',
    paddingHorizontal: 10,
    height: 36,
    fontSize: 14,
    marginRight: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  saveBtn: {
    backgroundColor: '#00A884',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  alertText: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderWidth: 1,
    borderColor: 'rgba(134, 150, 160, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    marginHorizontal: 16,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },

  // Modal Styles
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 24,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  modalCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  modalIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  modalCategoryName: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  noCategoriesText: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  currencyPrefix: {
    fontSize: 18,
    color: '#FFFFFF',
    marginRight: 8,
    fontWeight: '700',
  },
  modalInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    height: '100%',
    padding: 0,
  },
  createBtn: {
    backgroundColor: '#00A884',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnText: {
    color: '#0B141A',
    fontSize: 15,
    fontWeight: '700',
  },

  // Long press options card
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  dialogOptionBtn: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
