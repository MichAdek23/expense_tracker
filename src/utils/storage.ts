import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, CategoryBudget } from '../types';

const STORAGE_KEYS = {
  TRANSACTIONS: '@expense_tracker_transactions',
  BUDGETS: '@expense_tracker_budgets',
  SAVINGS_GOAL: '@expense_tracker_savings_goal',
  CURRENCY: '@expense_tracker_currency',
  BALANCE_HIDDEN: '@expense_tracker_balance_hidden',
};

export const saveTransactions = async (transactions: Transaction[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (error) {
    console.error('Error saving transactions', error);
  }
};

export const loadTransactions = async (): Promise<Transaction[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading transactions', error);
    return [];
  }
};

export const saveBudgets = async (budgets: CategoryBudget[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  } catch (error) {
    console.error('Error saving budgets', error);
  }
};

export const loadBudgets = async (): Promise<CategoryBudget[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BUDGETS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading budgets', error);
    return [];
  }
};

export const saveSavingsGoal = async (goal: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SAVINGS_GOAL, goal.toString());
  } catch (error) {
    console.error('Error saving savings goal', error);
  }
};

export const loadSavingsGoal = async (): Promise<number> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SAVINGS_GOAL);
    return data ? parseFloat(data) : 0;
  } catch (error) {
    console.error('Error loading savings goal', error);
    return 0;
  }
};

export const saveCurrencyPreference = async (currency: 'NGN' | 'USD'): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENCY, currency);
  } catch (error) {
    console.error('Error saving currency preference', error);
  }
};

export const loadCurrencyPreference = async (): Promise<'NGN' | 'USD'> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENCY);
    return (data as 'NGN' | 'USD') || 'NGN';
  } catch (error) {
    console.error('Error loading currency preference', error);
    return 'NGN';
  }
};

export const saveBalanceHiddenPreference = async (hidden: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.BALANCE_HIDDEN, hidden ? 'true' : 'false');
  } catch (error) {
    console.error('Error saving balance hidden preference', error);
  }
};

export const loadBalanceHiddenPreference = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BALANCE_HIDDEN);
    return data === 'true';
  } catch (error) {
    console.error('Error loading balance hidden preference', error);
    return false;
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TRANSACTIONS,
      STORAGE_KEYS.BUDGETS,
      STORAGE_KEYS.SAVINGS_GOAL,
      STORAGE_KEYS.CURRENCY,
      STORAGE_KEYS.BALANCE_HIDDEN,
    ]);
  } catch (error) {
    console.error('Error clearing data', error);
  }
};
