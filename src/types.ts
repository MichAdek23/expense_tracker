export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (local device time)
  note?: string;
}

export interface CategoryBudget {
  category: string;
  limit: number;
}

export interface MonthlyGoal {
  savingsGoal: number;
  month: string; // YYYY-MM
}

export interface FilterParams {
  search: string;
  type: 'all' | 'income' | 'expense';
  category: string;
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
}

export interface CategoryConfig {
  name: string;
  icon: string; // Feather icon name
  color: string; // Hex color
  bgLight: string; // Translucent color for background highlight
}

export const CATEGORIES: Record<string, CategoryConfig> = {
  // Expense Categories
  Food: {
    name: 'Food',
    icon: 'shopping-cart',
    color: '#FFB085',
    bgLight: 'rgba(255, 176, 133, 0.12)',
  },
  Shopping: {
    name: 'Shopping',
    icon: 'tag',
    color: '#82CDFF',
    bgLight: 'rgba(130, 205, 255, 0.12)',
  },
  Utilities: {
    name: 'Utilities',
    icon: 'zap',
    color: '#FFB1D8',
    bgLight: 'rgba(255, 177, 216, 0.12)',
  },
  Rent: {
    name: 'Housing',
    icon: 'home',
    color: '#9E77ED',
    bgLight: 'rgba(158, 119, 237, 0.12)',
  },
  Entertainment: {
    name: 'Leisure',
    icon: 'play',
    color: '#FFA3A3',
    bgLight: 'rgba(255, 163, 163, 0.12)',
  },
  Transport: {
    name: 'Travel',
    icon: 'navigation',
    color: '#65E0BA',
    bgLight: 'rgba(101, 224, 186, 0.12)',
  },
  Health: {
    name: 'Health',
    icon: 'heart',
    color: '#FF7D7D',
    bgLight: 'rgba(255, 125, 125, 0.12)',
  },
  Education: {
    name: 'Education',
    icon: 'book',
    color: '#BDB2FF',
    bgLight: 'rgba(189, 178, 255, 0.12)',
  },
  
  // Income Categories
  Salary: {
    name: 'Salary',
    icon: 'dollar-sign',
    color: '#2ECC71',
    bgLight: 'rgba(46, 204, 113, 0.12)',
  },
  Investments: {
    name: 'Investments',
    icon: 'trending-up',
    color: '#1ABC9C',
    bgLight: 'rgba(26, 188, 156, 0.12)',
  },
  Gifts: {
    name: 'Gifts',
    icon: 'star',
    color: '#F1C40F',
    bgLight: 'rgba(241, 196, 15, 0.12)',
  },
  
  // Other
  Others: {
    name: 'Misc',
    icon: 'more-horizontal',
    color: '#9CA3AF',
    bgLight: 'rgba(156, 163, 175, 0.12)',
  },
};
