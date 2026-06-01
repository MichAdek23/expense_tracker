import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Modal,
  ScrollView,
  Dimensions,
  BackHandler,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { jsPDF } from 'jspdf';

// Polyfills for jsPDF in React Native environment
if (typeof global.btoa === 'undefined') {
  global.btoa = (input: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let str = input;
    let output = '';
    for (
      let block = 0, charCode, i = 0, map = chars;
      str.charAt(i | 0) || (map = '=', i % 1);
      output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
    ) {
      charCode = str.charCodeAt((i += 3 / 4));
      if (charCode > 0xff) {
        throw new Error(
          "'btoa' failed: The string to be encoded contains characters outside of the Latin1 range."
        );
      }
      block = (block << 8) | charCode;
    }
    return output;
  };
}

if (typeof global.navigator === 'undefined') {
  global.navigator = { userAgent: 'react-native' } as any;
} else if (typeof global.navigator.userAgent === 'undefined') {
  (global.navigator as any).userAgent = 'react-native';
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, CategoryBudget } from './src/types';
import * as storage from './src/utils/storage';

// Import Views
import { Dashboard } from './src/components/Dashboard';
import { TransactionList } from './src/components/TransactionList';
import { BudgetManager, BudgetManagerRef } from './src/components/BudgetManager';
import { Analytics } from './src/components/Analytics';
import { TransactionForm } from './src/components/TransactionForm';
import { SplashScreen } from './src/components/SplashScreen';

type TabType = 'dashboard' | 'transactions' | 'budgets' | 'analytics' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  useEffect(() => {
    setIsSearchVisible(false);
  }, [activeTab]);

  const scrollViewRef = useRef<ScrollView>(null);
  const budgetManagerRef = useRef<BudgetManagerRef>(null);
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const TABS: TabType[] = ['dashboard', 'transactions', 'budgets', 'analytics', 'settings'];

  const handleSelectTab = (tabKey: TabType) => {
    setActiveTab(tabKey);
    const index = TABS.indexOf(tabKey);
    if (index !== -1) {
      scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    }
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / SCREEN_WIDTH);
    if (index >= 0 && index < TABS.length) {
      const tabKey = TABS[index];
      if (activeTab !== tabKey) {
        setActiveTab(tabKey);
      }
    }
  };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Splash Screen States
  const [isAppReady, setIsAppReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Settings preferences
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [exchangeRate, setExchangeRate] = useState<number>(1400);
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);

  // Custom Modal & Toast Notification states
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load data on start
  useEffect(() => {
    const initData = async () => {
      const startTime = Date.now();
      try {
        // Clear demo data once on startup if it hasn't been cleared yet
        const isDemoCleared = await AsyncStorage.getItem('@cashly_demo_cleared_v3');
        if (!isDemoCleared) {
          await storage.clearAllData();
          await AsyncStorage.setItem('@cashly_demo_cleared_v3', 'true');
        }

        const loadedTransactions = await storage.loadTransactions();
        const loadedBudgets = await storage.loadBudgets();
        const loadedCurrency = await storage.loadCurrencyPreference();
        const loadedBalanceHidden = await storage.loadBalanceHiddenPreference();

        setCurrency(loadedCurrency);
        setIsBalanceHidden(loadedBalanceHidden);
        setTransactions(loadedTransactions);
        setBudgets(loadedBudgets);

        // Fetch latest exchange rate
        await fetchExchangeRate();
      } catch (error) {
        console.error('Error during data initialization:', error);
      } finally {
        // Ensure splash screen displays for at least 2.2 seconds to allow entry animations to play
        const elapsedTime = Date.now() - startTime;
        const minimumDelay = 2200;
        const remainingTime = Math.max(0, minimumDelay - elapsedTime);
        
        setTimeout(() => {
          setIsAppReady(true);
        }, remainingTime);
      }
    };
    initData();
  }, []);

  // Handle Android back button double press to exit
  useEffect(() => {
    let lastBackPressed = 0;

    const handleBackPress = () => {
      // Ignore back button when splash screen is active
      if (showSplash) {
        return true;
      }

      // If not on Dashboard tab, navigate there first
      if (activeTab !== 'dashboard') {
        handleSelectTab('dashboard');
        return true;
      }

      // Enforce double tap back button to exit
      const now = Date.now();
      if (now - lastBackPressed < 2000) {
        BackHandler.exitApp();
        return true;
      }

      lastBackPressed = now;
      showToast('Press back again to exit');
      return true;
    };

    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => {
        subscription.remove();
      };
    }
  }, [activeTab, showSplash]);

  const fetchExchangeRate = async () => {
    try {
      // open.er-api.com is a free, zero-key public API for exchange rates
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await response.json();
      if (data && data.rates && data.rates.NGN) {
        setExchangeRate(data.rates.NGN);
        console.log('Real-time exchange rate updated successfully:', data.rates.NGN);
      } else {
        setExchangeRate(1400);
      }
    } catch (error) {
      console.log('Using fallback exchange rate (1400) due to offline/network status:', error);
      setExchangeRate(1400);
    }
  };

  // Toggle handlers
  const handleToggleCurrency = async () => {
    const newCurrency = currency === 'NGN' ? 'USD' : 'NGN';
    setCurrency(newCurrency);
    await storage.saveCurrencyPreference(newCurrency);
  };

  const handleToggleBalanceHidden = async () => {
    const newHidden = !isBalanceHidden;
    setIsBalanceHidden(newHidden);
    await storage.saveBalanceHiddenPreference(newHidden);
  };

  // Action Handlers
  const handleSaveTransaction = async (
    transactionData: Omit<Transaction, 'id'> & { id?: string }
  ) => {
    let updatedTransactions: Transaction[];

    if (transactionData.id) {
      // Editing
      updatedTransactions = transactions.map((t) =>
        t.id === transactionData.id ? (transactionData as Transaction) : t
      );
      showToast('Transaction updated!');
    } else {
      // Creating new
      const newTransaction: Transaction = {
        ...transactionData,
        id: `tx-${Math.random().toString(36).substring(2, 9)}`,
      };
      updatedTransactions = [newTransaction, ...transactions];
      showToast('Transaction added!');
    }

    setTransactions(updatedTransactions);
    await storage.saveTransactions(updatedTransactions);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = async (id: string) => {
    const updatedTransactions = transactions.filter((t) => t.id !== id);
    setTransactions(updatedTransactions);
    await storage.saveTransactions(updatedTransactions);
  };

  const handleSaveBudget = async (category: string, limit: number) => {
    let updatedBudgets = [...budgets];
    const index = budgets.findIndex((b) => b.category === category);

    if (index > -1) {
      if (limit === 0) {
        // Delete budget if set to 0
        updatedBudgets = budgets.filter((b) => b.category !== category);
      } else {
        updatedBudgets[index].limit = limit;
      }
    } else if (limit > 0) {
      updatedBudgets.push({ category, limit });
    }

    setBudgets(updatedBudgets);
    await storage.saveBudgets(updatedBudgets);
    showToast('Budget limit updated!');
  };

  const handleEditPress = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormVisible(true);
  };

  const handleAddPress = () => {
    setEditingTransaction(null);
    setFormVisible(true);
  };  // Export Data to File
  const handleExportData = async () => {
    try {
      const dataToExport = {
        transactions,
        budgets,
        exportedAt: new Date().toISOString(),
      };
      const jsonString = JSON.stringify(dataToExport, null, 2);

      if (Platform.OS === 'web') {
        const element = document.createElement('a');
        const file = new Blob([jsonString], { type: 'application/json' });
        element.href = URL.createObjectURL(file);
        element.download = 'cashly_export.json';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        showToast('Data exported and downloaded!');
      } else {
        await Clipboard.setStringAsync(jsonString);
        showToast('Financial data copied to clipboard!');
      }
    } catch (error) {
      console.error('Export error', error);
      showToast('Failed to export your data.', 'error');
    }
  };

  // Export Financial Data as PDF
  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Top Brand Header Card
      doc.setFillColor(9, 13, 22);
      doc.rect(0, 0, 210, 35, 'F');

      // Cashly Header Logo & Title
      doc.setTextColor(0, 168, 132); // #00A884 WhatsApp Green
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('CASHLY', 15, 22);

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Financial Statements & Expense Report', 15, 29);

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 140, 22);

      // Section 1: Financial Summary Cards
      let y = 48;
      doc.setTextColor(9, 13, 22);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MONTHLY SUMMARY', 15, y);

      const getLocalMonthString = (d: Date = new Date()) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      };
      const currentMonthStr = getLocalMonthString();
      const currentMonthTransactions = transactions.filter((t) =>
        t.date.startsWith(currentMonthStr)
      );

      const totalIncomeNGN = currentMonthTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenseNGN = currentMonthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const netSavingsNGN = totalIncomeNGN - totalExpenseNGN;

      const formatVal = (amount: number) => {
        if (currency === 'USD') {
          const val = amount / exchangeRate;
          return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `₦${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      y += 8;
      // Box 1: Income
      doc.setFillColor(240, 248, 245);
      doc.rect(15, y, 56, 20, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(16, 185, 129);
      doc.text('TOTAL INCOME', 19, y + 6);
      doc.setTextColor(9, 13, 22);
      doc.setFontSize(10);
      doc.text(formatVal(totalIncomeNGN), 19, y + 14);

      // Box 2: Expenses
      doc.setFillColor(255, 240, 240);
      doc.rect(77, y, 56, 20, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 107, 107);
      doc.text('TOTAL EXPENSES', 81, y + 6);
      doc.setTextColor(9, 13, 22);
      doc.setFontSize(10);
      doc.text(formatVal(totalExpenseNGN), 81, y + 14);

      // Box 3: Net Balance
      doc.setFillColor(245, 247, 250);
      doc.rect(139, y, 56, 20, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text('NET BALANCE', 143, y + 6);
      doc.setTextColor(9, 13, 22);
      doc.setFontSize(10);
      doc.text(formatVal(netSavingsNGN), 143, y + 14);

      // Section 2: Budgets Overview
      y += 32;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(9, 13, 22);
      doc.text('BUDGET ALLOCATIONS', 15, y);

      y += 6;
      doc.setFillColor(235, 240, 245);
      doc.rect(15, y, 180, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      doc.text('CATEGORY', 18, y + 5);
      doc.text('MONTHLY BUDGET', 70, y + 5);
      doc.text('TOTAL SPENT', 120, y + 5);
      doc.text('STATUS', 170, y + 5);

      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(9, 13, 22);

      if (budgets.length === 0) {
        doc.text('No active budgets configured.', 18, y + 5);
        y += 10;
      } else {
        budgets.forEach((b) => {
          if (y > 270) {
            doc.addPage();
            y = 15;
            doc.setFillColor(235, 240, 245);
            doc.rect(15, y, 180, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(75, 85, 99);
            doc.text('CATEGORY', 18, y + 5);
            doc.text('MONTHLY BUDGET', 70, y + 5);
            doc.text('TOTAL SPENT', 120, y + 5);
            doc.text('STATUS', 170, y + 5);
            
            y += 7;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(9, 13, 22);
          }

          const spent = currentMonthTransactions
            .filter((t) => t.type === 'expense' && t.category === b.category)
            .reduce((sum, t) => sum + t.amount, 0);

          const isOver = spent > b.limit;
          const statusText = isOver ? 'OVER BUDGET' : `${((spent / b.limit) * 100).toFixed(0)}% USED`;

          doc.text(b.category.toUpperCase(), 18, y + 5);
          doc.text(formatVal(b.limit), 70, y + 5);
          doc.text(formatVal(spent), 120, y + 5);
          
          if (isOver) {
            doc.setTextColor(239, 68, 68);
          } else {
            doc.setTextColor(16, 185, 129);
          }
          doc.setFont('helvetica', 'bold');
          doc.text(statusText, 170, y + 5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(9, 13, 22);
          
          doc.setDrawColor(240, 240, 240);
          doc.line(15, y + 7, 195, y + 7);
          y += 8;
        });
      }

      // Section 3: Transactions Log
      y += 8;
      if (y > 250) {
        doc.addPage();
        y = 15;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(9, 13, 22);
      doc.text('TRANSACTION LOG', 15, y);

      y += 6;
      doc.setFillColor(9, 13, 22);
      doc.rect(15, y, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('DATE', 18, y + 5.5);
      doc.text('DESCRIPTION', 45, y + 5.5);
      doc.text('CATEGORY', 105, y + 5.5);
      doc.text('TYPE', 145, y + 5.5);
      doc.text('AMOUNT', 170, y + 5.5);

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(9, 13, 22);

      const sortedTxs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (sortedTxs.length === 0) {
        doc.text('No transactions recorded yet.', 18, y + 5);
      } else {
        sortedTxs.forEach((tx) => {
          if (y > 270) {
            doc.addPage();
            y = 15;
            doc.setFillColor(9, 13, 22);
            doc.rect(15, y, 180, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            doc.text('DATE', 18, y + 5.5);
            doc.text('DESCRIPTION', 45, y + 5.5);
            doc.text('CATEGORY', 105, y + 5.5);
            doc.text('TYPE', 145, y + 5.5);
            doc.text('AMOUNT', 170, y + 5.5);
            
            y += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(9, 13, 22);
          }

          const formattedDate = new Date(tx.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          const txType = tx.type === 'income' ? 'INCOME' : 'EXPENSE';
          const displayAmount = (tx.type === 'expense' ? '-' : '+') + formatVal(tx.amount);

          doc.text(formattedDate, 18, y + 5);
          
          let desc = tx.title;
          if (desc.length > 28) {
            desc = desc.substring(0, 26) + '...';
          }
          doc.text(desc, 45, y + 5);
          doc.text(tx.category.toUpperCase(), 105, y + 5);
          
          if (tx.type === 'income') {
            doc.setTextColor(16, 185, 129);
          } else {
            doc.setTextColor(239, 68, 68);
          }
          doc.text(txType, 145, y + 5);
          doc.text(displayAmount, 170, y + 5);
          doc.setTextColor(9, 13, 22);

          doc.setDrawColor(245, 245, 245);
          doc.line(15, y + 7, 195, y + 7);
          y += 8;
        });
      }

      // Output & Save / Share
      if (Platform.OS === 'web') {
        doc.save('cashly_financial_report.pdf');
        showToast('PDF report downloaded successfully!');
      } else {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const fileUri = FileSystem.documentDirectory + 'cashly_financial_report.pdf';
        
        await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Cashly Financial Report',
          });
        } else {
          showToast('PDF generated and saved locally!');
        }
      }
    } catch (error) {
      console.error('PDF export error', error);
      showToast('Failed to export PDF report.', 'error');
    }
  };

  // Clear data
  const handleClearData = () => {
    setClearConfirmVisible(true);
  };

  // Render Page Content
  const renderContent = () => {
    return (
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEnabled={scrollEnabled}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ width: SCREEN_WIDTH }}>
          <Dashboard
            transactions={transactions}
            budgets={budgets}
            currency={currency}
            exchangeRate={exchangeRate}
            isBalanceHidden={isBalanceHidden}
            onToggleBalanceHidden={handleToggleBalanceHidden}
            onViewAllTransactions={() => handleSelectTab('transactions')}
            onViewAllBudgets={() => handleSelectTab('budgets')}
            onAddTransactionPress={handleAddPress}
          />
        </View>
        <View style={{ width: SCREEN_WIDTH }}>
          <TransactionList
            transactions={transactions}
            currency={currency}
            exchangeRate={exchangeRate}
            onEdit={handleEditPress}
            onDelete={handleDeleteTransaction}
            isBalanceHidden={isBalanceHidden}
            setParentScrollEnabled={setScrollEnabled}
            isSearchVisible={isSearchVisible}
          />
        </View>
        <View style={{ width: SCREEN_WIDTH }}>
          <BudgetManager
            ref={budgetManagerRef}
            budgets={budgets}
            transactions={transactions}
            currency={currency}
            exchangeRate={exchangeRate}
            onSaveBudget={handleSaveBudget}
            onShowToast={showToast}
          />
        </View>
        <View style={{ width: SCREEN_WIDTH }}>
          <Analytics
            transactions={transactions}
            currency={currency}
            exchangeRate={exchangeRate}
          />
        </View>
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.settingsScroll}
            contentContainerStyle={{ paddingBottom: 110 }}
          >
            <View style={styles.settingsHeaderCard}>
              <View style={styles.logoCircle}>
                <Feather name="activity" size={32} color="#00A884" />
              </View>
              <Text style={styles.appTitle}>Cashly</Text>
              <Text style={styles.appVersion}>v1.0.0 (Expo SDK 54)</Text>
            </View>

            <Text style={styles.settingsSectionTitle}>Exchange Rate Info</Text>
            <View style={styles.settingsSection}>
              <View style={styles.settingsRow}>
                <View style={styles.settingBtnLeft}>
                  <View style={[styles.settingIconCircle, { backgroundColor: 'rgba(0, 168, 132, 0.1)' }]}>
                    <Feather name="globe" size={18} color="#00A884" />
                  </View>
                  <View>
                    <Text style={styles.settingBtnTitle}>USD Exchange Rate</Text>
                    <Text style={styles.settingBtnSub}>Used for currency conversions</Text>
                  </View>
                </View>
                <Text style={styles.exchangeRateValueText}>
                  ₦{exchangeRate.toFixed(2)}
                </Text>
              </View>
            </View>

            <Text style={styles.settingsSectionTitle}>Data Backup & Settings</Text>
            <View style={styles.settingsSection}>
              <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7} onPress={handleExportPDF}>
                <View style={styles.settingBtnLeft}>
                  <View style={[styles.settingIconCircle, { backgroundColor: 'rgba(255, 176, 133, 0.1)' }]}>
                    <Feather name="file-text" size={18} color="#FFB085" />
                  </View>
                  <View>
                    <Text style={styles.settingBtnTitle}>Export PDF Report</Text>
                    <Text style={styles.settingBtnSub}>Generate a detailed financial PDF statement</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color="#8696A0" />
              </TouchableOpacity>
              
              <View style={styles.settingsSeparator} />

              <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7} onPress={handleClearData}>
                <View style={styles.settingBtnLeft}>
                  <View style={[styles.settingIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Feather name="trash-2" size={18} color="#FF6B6B" />
                  </View>
                  <View>
                    <Text style={[styles.settingBtnTitle, styles.dangerText]}>Clear All Data</Text>
                    <Text style={styles.settingBtnSub}>Permanently delete all custom inputs</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color="#8696A0" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Feather name="info" size={14} color="#6B7280" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Your financial data is saved locally on this device using AsyncStorage. We do not store or transmit any personal info.
              </Text>
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    );
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'transactions': return 'Transactions Log';
      case 'budgets': return 'Category Budgets';
      case 'analytics': return 'Spending Analytics';
      case 'settings': return 'Settings';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        {activeTab === 'budgets' && (
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => budgetManagerRef.current?.openAddBudgetModal()}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={20} color="#0B141A" />
          </TouchableOpacity>
        )}
        {activeTab === 'transactions' && (
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => setIsSearchVisible(!isSearchVisible)}
            activeOpacity={0.7}
          >
            <Feather name={isSearchVisible ? "chevron-up" : "search"} size={20} color="#0B141A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Body */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Custom Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {([
          { key: 'dashboard', icon: 'grid', label: 'Home' },
          { key: 'transactions', icon: 'list', label: 'Logs' },
          { key: 'budgets', icon: 'pie-chart', label: 'Budgets' },
          { key: 'analytics', icon: 'bar-chart-2', label: 'Stats' },
          { key: 'settings', icon: 'settings', label: 'Setup' },
        ] as const).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleSelectTab(tab.key)}
            >
              <Feather
                name={tab.icon as any}
                size={20}
                color={isActive ? '#00A884' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Add / Edit Transaction Sheet Modal */}
      <TransactionForm
        visible={formVisible}
        currency={currency}
        exchangeRate={exchangeRate}
        onClose={() => {
          setFormVisible(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
      />

      {/* Custom Clear All Data Confirmation Modal */}
      <Modal
        visible={clearConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setClearConfirmVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconWrapper}>
              <Feather name="trash-2" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.dialogTitle}>Clear All Data?</Text>
            <Text style={styles.dialogMessage}>
              Are you absolutely sure you want to delete all transactions and budgets? This action cannot be undone.
            </Text>
            <View style={styles.dialogButtonsRow}>
              <TouchableOpacity
                style={[styles.dialogBtn, styles.dialogCancelBtn]}
                onPress={() => setClearConfirmVisible(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, styles.dialogDeleteBtn]}
                onPress={async () => {
                  setClearConfirmVisible(false);
                  await storage.clearAllData();
                  setTransactions([]);
                  setBudgets([]);
                  showToast('All financial data has been cleared.');
                }}
              >
                <Text style={styles.dialogDeleteText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Toast Notification Banner */}
      {toast && (
        <View style={[
          styles.toastContainer,
          toast.type === 'error' ? styles.toastError : styles.toastSuccess
        ]}>
          <Feather 
            name={toast.type === 'error' ? 'alert-circle' : 'check-circle'} 
            size={18} 
            color={toast.type === 'error' ? '#FF6B6B' : '#00A884'} 
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Animated Full Screen Splash Overlay */}
      {showSplash && (
        <SplashScreen
          isReady={isAppReady}
          onAnimationComplete={() => setShowSplash(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B141A', // WhatsApp Dark Background
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyToggleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
  },
  currencyToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00A884',
  },
  headerAddBtn: {
    backgroundColor: '#00A884',
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00A884',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    height: 68,
    backgroundColor: 'rgba(32, 44, 51, 0.9)', // WhatsApp translucent tab bar
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#00A884',
  },
  settingsScroll: {
    paddingHorizontal: 0,
  },
  settingsHeaderCard: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 132, 0.2)',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  appVersion: {
    color: '#6B7280',
    fontSize: 12,
  },
  settingsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00A884',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  settingsSection: {
    backgroundColor: 'transparent',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsSeparator: {
    height: 1,
    backgroundColor: 'rgba(134, 150, 160, 0.15)', // WhatsApp border grey
    marginHorizontal: 0,
  },
  exchangeRateValueText: {
    color: '#00A884',
    fontSize: 14,
    fontWeight: '700',
  },
  whiteBold: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  settingBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingBtnTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  settingBtnSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  dangerText: {
    color: '#FF6B6B',
  },
  infoRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    color: '#6B7280',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  toastContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 80,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 9999,
  },
  toastSuccess: {
    borderColor: 'rgba(0, 168, 132, 0.3)',
  },
  toastError: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  dialogIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 24,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  dialogBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 8,
  },
  dialogDeleteBtn: {
    backgroundColor: '#FF6B6B',
    marginLeft: 8,
  },
  dialogCancelText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  dialogDeleteText: {
    color: '#0B141A',
    fontSize: 14,
    fontWeight: '700',
  },
});
