import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { Transaction, CATEGORIES, CategoryBudget } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  currency: 'NGN' | 'USD';
  exchangeRate: number;
  isBalanceHidden: boolean;
  onToggleBalanceHidden: () => void;
  onViewAllTransactions: () => void;
  onViewAllBudgets: () => void;
  onAddTransactionPress: () => void;
}

export const Dashboard = ({
  transactions,
  budgets,
  currency,
  exchangeRate,
  isBalanceHidden,
  onToggleBalanceHidden,
  onViewAllTransactions,
  onViewAllBudgets,
  onAddTransactionPress,
}: DashboardProps) => {
  const [selectedChartCategory, setSelectedChartCategory] = useState<string | null>(null);
  const [breakdownModalVisible, setBreakdownModalVisible] = useState(false);
  const [revealedTxId, setRevealedTxId] = useState<string | null>(null);

  // Double-click card flip states
  const [isFlipped, setIsFlipped] = useState(false);
  const [lastPress, setLastPress] = useState(0);

  const getLocalDateString = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = getLocalDateString();
  const todayTransactions = transactions.filter((t) => t.date === todayStr);

  const todayIncomeNGN = todayTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const todayExpenseNGN = todayTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const getLocalMonthString = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const currentMonthStr = getLocalMonthString(); // YYYY-MM

  // Filter current month transactions
  const currentMonthTransactions = transactions.filter((t) =>
    t.date.startsWith(currentMonthStr)
  );

  // Calculations (stored base is always NGN)
  const totalIncomeNGN = currentMonthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenseNGN = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalanceNGN = totalIncomeNGN - totalExpenseNGN;

  // Helper formats
  const formatVal = (amount: number) => {
    if (currency === 'USD') {
      const val = amount / exchangeRate;
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `₦${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const formatShortVal = (amount: number) => {
    if (currency === 'USD') {
      return `$${(amount / exchangeRate).toFixed(0)}`;
    }
    return `₦${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  const maskText = (visibleText: string) => {
    return isBalanceHidden ? (currency === 'NGN' ? '₦******' : '$******') : visibleText;
  };

  const formatAndMask = (amount: number) => {
    return maskText(formatVal(amount));
  };

  // Category breakdowns for expenses
  const categoryTotals: Record<string, number> = {};
  let totalExpensesForChart = 0;

  currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      totalExpensesForChart += t.amount;
    });

  // Prepare chart data
  const chartData = Object.keys(categoryTotals).map((catKey) => {
    const amount = categoryTotals[catKey];
    const percentage = totalExpensesForChart > 0 ? (amount / totalExpensesForChart) * 100 : 0;
    return {
      category: catKey,
      amount,
      percentage,
      color: CATEGORIES[catKey]?.color || CATEGORIES.Others.color,
      icon: CATEGORIES[catKey]?.icon || CATEGORIES.Others.icon,
      name: CATEGORIES[catKey]?.name || CATEGORIES.Others.name,
      bgLight: CATEGORIES[catKey]?.bgLight || CATEGORIES.Others.bgLight,
    };
  }).sort((a, b) => b.amount - a.amount);

  // Recent 3 transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Budget status alerts
  const budgetAlerts = budgets
    .map((b) => {
      const spent = currentMonthTransactions
        .filter((t) => t.type === 'expense' && t.category === b.category)
        .reduce((sum, t) => sum + t.amount, 0);
      const percent = b.limit > 0 ? (spent / b.limit) * 100 : 0;
      return {
        category: b.category,
        limit: b.limit,
        spent,
        percent,
      };
    })
    .filter((a) => a.percent >= 80);

  // Interactive center text selector
  const getCenterText = () => {
    if (selectedChartCategory) {
      const data = chartData.find((d) => d.category === selectedChartCategory);
      return {
        label: data ? data.name.toUpperCase() : '',
        value: data ? formatShortVal(data.amount) : '',
        sub: data ? `${data.percentage.toFixed(0)}% of spent` : '',
      };
    }
    return {
      label: 'TOTAL SPENT',
      value: formatShortVal(totalExpenseNGN),
      sub: `${currentMonthTransactions.filter((t) => t.type === 'expense').length} payments`,
    };
  };

  const centerInfo = getCenterText();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 110 }}
    >
      {/* Balance Hero Card */}
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => {
          const now = Date.now();
          const DOUBLE_PRESS_DELAY = 300;
          if (now - lastPress < DOUBLE_PRESS_DELAY) {
            setIsFlipped(!isFlipped);
          }
          setLastPress(now);
        }}
        style={styles.heroCard}
      >
        {isFlipped ? (
          <View style={{ width: '100%' }}>
            <View style={styles.heroHeaderRow}>
              <Text style={styles.heroSubtitle}>Today's Summary</Text>
              <View style={styles.hideBtn}>
                <Feather name="calendar" size={18} color="rgba(255, 255, 255, 0.4)" />
              </View>
            </View>

            <Text style={styles.heroTitle}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
            
            <Text style={styles.heroDate}>
              Double click card to view total balance
            </Text>

            <View style={styles.inOutRow}>
              <View style={styles.inOutCol}>
                <View style={styles.inOutHeader}>
                  <View style={[styles.arrowCircle, styles.incomeArrow]}>
                    <Feather name="arrow-up" size={14} color="#00A884" />
                  </View>
                  <Text style={styles.inOutLabel}>Received Today</Text>
                </View>
                <Text style={[styles.inOutValue, { color: '#00A884' }]}>
                  {formatVal(todayIncomeNGN)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.inOutCol}>
                <View style={styles.inOutHeader}>
                  <View style={[styles.arrowCircle, styles.expenseArrow]}>
                    <Feather name="arrow-down" size={14} color="#FF6B6B" />
                  </View>
                  <Text style={styles.inOutLabel}>Spent Today</Text>
                </View>
                <Text style={[styles.inOutValue, { color: '#FF6B6B' }]}>
                  {formatVal(todayExpenseNGN)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ width: '100%' }}>
            <View style={styles.heroHeaderRow}>
              <Text style={styles.heroSubtitle}>Total Balance</Text>
              <TouchableOpacity
                onPress={() => {
                  onToggleBalanceHidden();
                }}
                style={styles.hideBtn}
              >
                <Feather
                  name={isBalanceHidden ? 'eye-off' : 'eye'}
                  size={18}
                  color="rgba(255, 255, 255, 0.4)"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.heroTitle}>
              {totalBalanceNGN < 0 ? '-' : ''}{formatAndMask(Math.abs(totalBalanceNGN))}
            </Text>
            
            <Text style={styles.heroDate}>
              Current Month: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>

            <View style={styles.inOutRow}>
              <View style={styles.inOutCol}>
                <View style={styles.inOutHeader}>
                  <View style={[styles.arrowCircle, styles.incomeArrow]}>
                    <Feather name="arrow-up-right" size={14} color="#00A884" />
                  </View>
                  <Text style={styles.inOutLabel}>Income</Text>
                </View>
                <Text style={styles.inOutValue}>
                  {isBalanceHidden ? '******' : `+${formatVal(totalIncomeNGN)}`}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.inOutCol}>
                <View style={styles.inOutHeader}>
                  <View style={[styles.arrowCircle, styles.expenseArrow]}>
                    <Feather name="arrow-down-left" size={14} color="#FF6B6B" />
                  </View>
                  <Text style={styles.inOutLabel}>Expenses</Text>
                </View>
                <Text style={styles.inOutValue}>
                  {isBalanceHidden ? '******' : `-${formatVal(totalExpenseNGN)}`}
                </Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={onAddTransactionPress}>
          <Feather name="plus" size={18} color="#090D16" />
          <Text style={styles.actionButtonText}>Add Transaction</Text>
        </TouchableOpacity>
      </View>

      {/* Budget Alerts Section */}
      {budgetAlerts.length > 0 && (
        <View style={styles.alertsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Budget Warnings</Text>
            <TouchableOpacity onPress={onViewAllBudgets}>
              <Text style={styles.seeAllText}>Manage</Text>
            </TouchableOpacity>
          </View>
          {budgetAlerts.slice(0, 2).map((alert) => {
            const config = CATEGORIES[alert.category] || CATEGORIES.Others;
            const isOver = alert.spent > alert.limit;
            return (
              <View key={alert.category} style={styles.alertCard}>
                <Feather
                  name="alert-triangle"
                  size={18}
                  color={isOver ? '#FF6B6B' : '#FFD93D'}
                />
                <Text style={styles.alertText}>
                  {config.name} is at{' '}
                  <Text style={styles.whiteBold}>{alert.percent.toFixed(0)}%</Text> of limit.{' '}
                  ({isOver ? 'Over' : 'Remaining'}: {formatVal(Math.abs(alert.limit - alert.spent))})
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* SVG Chart Section */}
      <TouchableOpacity 
        style={styles.chartSection} 
        onPress={() => setBreakdownModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.chartHeaderRow}>
          <Text style={styles.sectionTitle}>Monthly Expense Breakdown</Text>
          <Feather name="chevron-right" size={16} color="#00A884" />
        </View>

        {chartData.length > 0 ? (
          <View style={styles.centeredChartWrapper}>
            <View style={styles.donutWrapperCompact}>
              <Svg width={110} height={110} viewBox="0 0 110 110">
                <G rotation="-90" origin="55, 55">
                  <Circle
                    cx="55"
                    cy="55"
                    r={45}
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth={7}
                    fill="transparent"
                  />
                  {(() => {
                    const r = 45;
                    const sw = 7;
                    const circ = 2 * Math.PI * r;
                    let acc = 0;

                    return chartData.map((item) => {
                      const segmentLength = (item.percentage / 100) * circ;
                      const gap = chartData.length > 1 ? 2 : 0;
                      const strokeLength = Math.max(0, segmentLength - gap);
                      const strokeDasharray = `${strokeLength} ${circ}`;
                      const strokeDashoffset = -acc;
                      acc += segmentLength;

                      return (
                        <Circle
                          key={item.category}
                          cx="55"
                          cy="55"
                          r={r}
                          stroke={item.color}
                          strokeWidth={sw}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          fill="transparent"
                          strokeLinecap="butt"
                        />
                      );
                    });
                  })()}
                </G>
              </Svg>
              <View style={styles.chartCenterOverlayCompact}>
                <Text style={styles.centerLabelCompact} numberOfLines={1}>
                  SPENT
                </Text>
                <Text style={styles.centerValueCompact} numberOfLines={1}>
                  {isBalanceHidden ? '******' : formatShortVal(totalExpenseNGN)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Feather name="pie-chart" size={32} color="#4B5563" />
            <Text style={styles.emptyChartText}>No expense data for this month</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Recent Transactions List */}
      <View style={styles.recentSection}>
        <View style={styles.recentSectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={onViewAllTransactions}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length > 0 ? (
          recentTransactions.map((item, index) => {
            const config = CATEGORIES[item.category] || CATEGORIES.Others;
            const isExpense = item.type === 'expense';
            const isLast = index === recentTransactions.length - 1;
            return (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.recentRow}
                  activeOpacity={0.7}
                  onPress={() => setRevealedTxId(revealedTxId === item.id ? null : item.id)}
                >
                  <View style={styles.recentIconBox}>
                    <Feather name={config.icon as any} size={16} color={config.color} />
                  </View>
                  <View style={styles.recentDetails}>
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.recentDate}>
                      {(() => {
                        const d = new Date(item.date);
                        const day = d.getDate();
                        const month = d.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
                        const year = d.getFullYear();
                        const time = item.time || '12:00';
                        return `${time} ${day} ${month} ${year}`;
                      })()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.recentAmount,
                      isExpense ? styles.expenseColor : styles.incomeColor,
                    ]}
                  >
                    {isBalanceHidden && revealedTxId !== item.id
                      ? '******'
                      : `${isExpense ? '-' : '+'}${formatVal(item.amount)}`}
                  </Text>
                </TouchableOpacity>
                {!isLast && <View style={styles.recentSeparator} />}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyRecent}>
            <Text style={styles.emptyRecentText}>No transactions recorded yet</Text>
          </View>
        )}
      </View>

      {/* Expanded Premium Breakdown Detail Modal */}
      <Modal
        visible={breakdownModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBreakdownModalVisible(false)}
      >
        <View style={styles.breakdownModalOverlay}>
          <View style={styles.breakdownModalContent}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownHeaderTitle}>Expense Analysis</Text>
              <TouchableOpacity onPress={() => setBreakdownModalVisible(false)} style={styles.breakdownCloseButton}>
                <Feather name="x" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={styles.breakdownModalScrollContent}
            >
              {chartData.length > 0 ? (
                <View style={styles.centeredChartWrapper}>
                  <View style={styles.donutWrapper}>
                    <Svg width={180} height={180} viewBox="0 0 180 180">
                      <G rotation="-90" origin="90, 90">
                        <Circle
                          cx="90"
                          cy="90"
                          r={70}
                          stroke="rgba(255,255,255,0.03)"
                          strokeWidth={10}
                          fill="transparent"
                        />
                        {(() => {
                          const chartRadius = 70;
                          const baseStrokeWidth = 10;
                          const activeStrokeWidth = 15;
                          const chartCircumference = 2 * Math.PI * chartRadius;
                          let currentAccumulated = 0;

                          return chartData.map((item) => {
                            const segmentLength = (item.percentage / 100) * chartCircumference;
                            const gap = chartData.length > 1 ? 4 : 0;
                            const strokeLength = Math.max(0, segmentLength - gap);
                            const strokeDasharray = `${strokeLength} ${chartCircumference}`;
                            const strokeDashoffset = -currentAccumulated;
                            currentAccumulated += segmentLength;

                            const isSegmentActive = selectedChartCategory === item.category;
                            const isAnySelected = selectedChartCategory !== null;
                            const segmentOpacity = !isAnySelected ? 1.0 : (isSegmentActive ? 1.0 : 0.35);
                            const segmentStrokeWidth = isSegmentActive ? activeStrokeWidth : baseStrokeWidth;

                            return (
                              <G 
                                key={item.category}
                                onPress={() => setSelectedChartCategory(isSegmentActive ? null : item.category)}
                              >
                                <Circle
                                  cx="90"
                                  cy="90"
                                  r={chartRadius}
                                  stroke={item.color}
                                  strokeWidth={segmentStrokeWidth}
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  fill="transparent"
                                  strokeLinecap="butt"
                                  opacity={segmentOpacity}
                                />
                              </G>
                            );
                          });
                        })()}
                      </G>
                    </Svg>
                    <View style={styles.chartCenterOverlay}>
                      <Text style={styles.centerLabel} numberOfLines={1}>
                        {centerInfo.label}
                      </Text>
                      <Text 
                        style={[
                          styles.centerValue,
                          { fontSize: isBalanceHidden ? 15 : centerInfo.value.length > 8 ? 13 : 16 }
                        ]}
                        numberOfLines={1}
                      >
                        {isBalanceHidden ? '******' : centerInfo.value}
                      </Text>
                      <Text style={styles.centerSub} numberOfLines={1}>
                        {centerInfo.sub}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailSectionHeader}>
                    <Text style={styles.detailSectionTitle}>Category Breakdown</Text>
                    <Text style={styles.detailSectionSub}>Tap categories to highlight on chart</Text>
                  </View>
                  <View style={styles.customLegendList}>
                    {chartData.map((item, index) => {
                      const isActive = selectedChartCategory === item.category;
                      const isAnySelected = selectedChartCategory !== null;
                      const isLast = index === chartData.length - 1;
                      return (
                        <View key={item.category}>
                          <TouchableOpacity
                            style={[
                              styles.legendRow,
                              isActive && styles.legendRowActive,
                              isAnySelected && !isActive && { opacity: 0.5 },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => setSelectedChartCategory(isActive ? null : item.category)}
                          >
                            <View style={styles.progressCircleWrapper}>
                              <Svg width={48} height={48} viewBox="0 0 48 48">
                                <G rotation="-90" origin="24, 24">
                                  <Circle
                                    cx="24"
                                    cy="24"
                                    r={20}
                                    stroke="rgba(255, 255, 255, 0.05)"
                                    strokeWidth={3}
                                    fill="transparent"
                                  />
                                  <Circle
                                    cx="24"
                                    cy="24"
                                    r={20}
                                    stroke={item.color}
                                    strokeWidth={3}
                                    strokeDasharray="125.6"
                                    strokeDashoffset={125.6 - (Math.min(item.percentage, 100) / 100) * 125.6}
                                    strokeLinecap="round"
                                    fill="transparent"
                                  />
                                </G>
                              </Svg>
                              <View style={[styles.innerCircleBadge, { backgroundColor: item.bgLight }]}>
                                <Feather name={item.icon as any} size={15} color={item.color} />
                              </View>
                            </View>
                            <View style={styles.legendMainInfo}>
                              <Text style={styles.legendCategoryName}>{item.name}</Text>
                            </View>
                            <View style={styles.legendRightInfo}>
                              <Text style={[styles.legendPercentText, { color: item.color }]}>
                                {item.percentage.toFixed(0)}%
                              </Text>
                            </View>
                          </TouchableOpacity>
                          {!isLast && <View style={styles.legendRowSeparator} />}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyChart}>
                  <Feather name="pie-chart" size={36} color="#4B5563" />
                  <Text style={styles.emptyChartText}>No expense data for this month</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroCard: {
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    marginTop: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hideBtn: {
    padding: 4,
  },
  heroSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroDate: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 24,
  },
  inOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 18,
  },
  inOutCol: {
    flex: 1,
  },
  inOutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  arrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  incomeArrow: {
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
  },
  expenseArrow: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  inOutLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  inOutValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 16,
  },
  quickActions: {
    marginTop: 16,
    marginBottom: 20,
    marginHorizontal: 16,
  },
  actionButton: {
    backgroundColor: '#00A884',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#00A884',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButtonText: {
    color: '#0B141A',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  alertsSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 217, 61, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 217, 61, 0.12)',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },
  alertText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginLeft: 10,
    flex: 1,
    lineHeight: 16,
  },
  whiteBold: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chartSection: {
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  centeredChartWrapper: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  donutWrapper: {
    position: 'relative',
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartCenterOverlay: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#202C33', // Match WhatsApp card background
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  centerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  centerValue: {
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  centerSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  customLegendList: {
    width: '100%',
    marginTop: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  legendRowActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  legendRowSeparator: {
    height: 1,
    backgroundColor: 'rgba(134, 150, 160, 0.15)', // WhatsApp border grey
  },
  legendIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  legendMainInfo: {
    flex: 1,
  },
  legendCategoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  legendCategoryAmount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  legendRightInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  legendPercentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  legendProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  legendProgressIndicator: {
    height: '100%',
    borderRadius: 2,
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyChartText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 8,
  },
  recentSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  seeAllText: {
    color: '#00A884',
    fontSize: 13,
    fontWeight: '600',
  },
  recentCardGroup: {
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderWidth: 1,
    borderColor: 'rgba(134, 150, 160, 0.15)', // WhatsApp border grey
    borderRadius: 20,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  recentSeparator: {
    height: 1,
    backgroundColor: 'rgba(134, 150, 160, 0.15)', // WhatsApp border grey
    marginHorizontal: 0,
  },
  recentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recentDetails: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  recentDate: {
    fontSize: 10,
    color: '#6B7280',
  },
  recentAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  expenseColor: {
    color: '#FF6B6B',
  },
  incomeColor: {
    color: '#00A884',
  },
  emptyRecent: {
    alignItems: 'center',
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderWidth: 1,
    borderColor: 'rgba(134, 150, 160, 0.15)', // WhatsApp border grey
    borderRadius: 16,
    paddingVertical: 20,
    marginHorizontal: 16,
  },
  emptyRecentText: {
    color: '#6B7280',
    fontSize: 12,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expandBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00A884',
    marginRight: 4,
  },
  compactChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  compactChartContainer: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  compactLegendContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  compactLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  compactLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  compactLegendText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  compactLegendSubtext: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 1,
  },
  detailPageContainer: {
    flex: 1,
    backgroundColor: '#0B141A', // WhatsApp Dark BG
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#00A884',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detailScrollContent: {
    padding: 20,
  },
  detailSectionHeader: {
    width: '100%',
    marginBottom: 16,
    marginTop: 8,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  detailSectionSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  donutWrapperCompact: {
    position: 'relative',
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  chartCenterOverlayCompact: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#202C33', // Match WhatsApp card background
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  centerLabelCompact: {
    fontSize: 7,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  centerValueCompact: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  breakdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  breakdownModalContent: {
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '85%',
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  breakdownHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  breakdownCloseButton: {
    padding: 4,
  },
  breakdownModalScrollContent: {
    padding: 20,
  },
  progressCircleWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  innerCircleBadge: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
