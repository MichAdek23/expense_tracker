import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { Transaction, CATEGORIES } from '../types';

interface AnalyticsProps {
  transactions: Transaction[];
  currency: 'NGN' | 'USD';
  exchangeRate: number;
}

export const Analytics = ({
  transactions,
  currency,
  exchangeRate,
}: AnalyticsProps) => {
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

  // Totals in NGN
  const incomeNGN = currentMonthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expensesNGN = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Savings rate (percentages are independent of currency!)
  const savingsNGN = incomeNGN - expensesNGN;
  const savingsRate = incomeNGN > 0 ? (savingsNGN / incomeNGN) * 100 : 0;

  // Category distributions in NGN
  const categoryTotals: Record<string, number> = {};
  currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  const sortedCategories = Object.keys(categoryTotals)
    .map((key) => ({
      category: key,
      amount: categoryTotals[key],
      config: CATEGORIES[key] || CATEGORIES.Others,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Day-of-week spending trends in NGN
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daySpending = [0, 0, 0, 0, 0, 0, 0];

  currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      try {
        const dayIndex = new Date(t.date).getDay();
        if (!isNaN(dayIndex)) {
          daySpending[dayIndex] += t.amount;
        }
      } catch {
        // Ignore date parsing issues
      }
    });

  const maxDaySpending = Math.max(...daySpending, 1);

  // Insights
  const expenseCount = currentMonthTransactions.filter((t) => t.type === 'expense').length;
  const avgExpenseNGN = expenseCount > 0 ? expensesNGN / expenseCount : 0;

  const highestTransactionNGN = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((max, t) => (t.amount > max ? t.amount : max), 0);

  // Formatting helpers
  const formatVal = (amount: number) => {
    if (currency === 'USD') {
      const val = amount / exchangeRate;
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₦${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatShortVal = (amount: number) => {
    if (currency === 'USD') {
      const val = amount / exchangeRate;
      return `$${val.toFixed(0)}`;
    }
    return `₦${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 110 }}
    >
      {/* Savings Rate Card */}
      <View style={styles.savingsCard}>
        {/* Left Side: Big circular progress indicator wrapping the percentage text */}
        <View style={styles.savingsCircleColumn}>
          <Svg width={90} height={90} viewBox="0 0 90 90">
            <G rotation="-90" origin="45, 45">
              <Circle
                cx="45"
                cy="45"
                r={38}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={6}
                fill="transparent"
              />
              <Circle
                cx="45"
                cy="45"
                r={38}
                stroke="#00A884"
                strokeWidth={6}
                strokeDasharray="238.76"
                strokeDashoffset={238.76 - (Math.max(0, Math.min(savingsRate, 100)) / 100) * 238.76}
                strokeLinecap="round"
                fill="transparent"
              />
            </G>
          </Svg>
          <View style={styles.savingsCircleTextWrapper}>
            <Text style={styles.savingsCirclePercentageText}>
              {savingsRate >= 0 ? `${savingsRate.toFixed(0)}%` : '0%'}
            </Text>
            <Text style={styles.savingsCircleLabelText}>saved</Text>
          </View>
        </View>

        {/* Right Side: Text descriptions */}
        <View style={styles.savingsDetailsColumn}>
          <View style={styles.savingsHeaderRow}>
            <Text style={styles.savingsTitle}>Savings Rate</Text>
            <Feather name="percent" size={14} color="#00A884" />
          </View>
          <Text style={styles.savingsSub}>
            You saved <Text style={styles.greenText}>{formatShortVal(Math.max(0, savingsNGN))}</Text> of your{' '}
            <Text style={styles.whiteBold}>{formatShortVal(incomeNGN)}</Text> income this month.
          </Text>
        </View>
      </View>

      {/* Spending Trend Bar Chart (Custom Flex-based) */}
      <View style={styles.sectionCard}>
        <Text style={styles.chartTitle}>Spending by Day of Week</Text>
        <View style={styles.barChartContainer}>
          {daysOfWeek.map((day, index) => {
            const amount = daySpending[index];
            const heightPercent = (amount / maxDaySpending) * 100;

            return (
              <View key={day} style={styles.chartCol}>
                <View style={styles.barWrapper}>
                  {amount > 0 && (
                    <Text style={styles.barTooltip}>{formatShortVal(amount)}</Text>
                  )}
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max(4, heightPercent)}%`,
                        backgroundColor: amount > 0 ? '#FF6B6B' : 'rgba(255,255,255,0.05)',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Top Categories Distribution */}
      <View style={styles.recentSection}>
        <View style={styles.recentSectionHeader}>
          <Text style={styles.sectionTitle}>Top Expense Sources</Text>
        </View>
        {sortedCategories.length > 0 ? (
          sortedCategories.map((item, index) => {
            const percentage = expensesNGN > 0 ? (item.amount / expensesNGN) * 100 : 0;
            const isLast = index === sortedCategories.length - 1;
            return (
              <View key={item.category}>
                <View style={styles.recentRow}>
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
                          stroke={item.config.color}
                          strokeWidth={3}
                          strokeDasharray="125.6"
                          strokeDashoffset={125.6 - (Math.min(percentage, 100) / 100) * 125.6}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </G>
                    </Svg>
                    <View style={[styles.innerCircleBadge, { backgroundColor: `${item.config.color}15` }]}>
                      <Feather name={item.config.icon as any} size={15} color={item.config.color} />
                    </View>
                  </View>
                  <View style={styles.recentDetails}>
                    <View style={styles.categoryBarMetaCompact}>
                      <Text style={styles.recentTitle} numberOfLines={1}>
                        {item.config.name}
                      </Text>
                      <Text style={styles.recentAmount}>
                        {formatVal(item.amount)}
                      </Text>
                    </View>
                    <View style={styles.categorySubRow}>
                      <Text style={styles.recentSubText}>
                        Rank #{index + 1} • {percentage.toFixed(0)}% of expenses
                      </Text>
                    </View>
                  </View>
                </View>
                {!isLast && <View style={styles.recentSeparator} />}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyRecent}>
            <Text style={styles.emptyRecentText}>No spending data to compute sources</Text>
          </View>
        )}
      </View>

      {/* Financial Insights */}
      <View style={styles.insightsContainer}>
        <Text style={styles.sectionHeaderTitle}>Key Month Insights</Text>
        
        <View style={styles.insightRow}>
          <View style={styles.insightCard}>
            <Feather name="trending-down" size={18} color="#FFD93D" style={styles.insightIcon} />
            <Text style={styles.insightVal}>{formatVal(avgExpenseNGN)}</Text>
            <Text style={styles.insightLabel}>Average Expense</Text>
          </View>
          
          <View style={styles.insightCard}>
            <Feather name="award" size={18} color="#4D96FF" style={styles.insightIcon} />
            <Text style={styles.insightVal}>{formatVal(highestTransactionNGN)}</Text>
            <Text style={styles.insightLabel}>Peak Single Spent</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  savingsCard: {
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    marginTop: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  savingsCircleColumn: {
    position: 'relative',
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsCircleTextWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsCirclePercentageText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  savingsCircleLabelText: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  savingsDetailsColumn: {
    flex: 1,
    marginLeft: 20,
  },
  savingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  savingsTitle: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: 8,
  },
  savingsSub: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  greenText: {
    color: '#00A884',
    fontWeight: '600',
  },
  whiteBold: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderWidth: 1,
    borderColor: 'rgba(134, 150, 160, 0.15)', // WhatsApp border grey
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 160,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingHorizontal: 8,
  },
  chartCol: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 110,
    width: 16,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  barTooltip: {
    position: 'absolute',
    top: -24,
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '600',
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    textAlign: 'center',
    minWidth: 36,
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 8,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  recentDetails: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  recentSubText: {
    fontSize: 10,
    color: '#6B7280',
  },
  recentAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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
  categoryBarMetaCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  categorySubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  insightsContainer: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightCard: {
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderWidth: 1,
    borderColor: 'rgba(134, 150, 160, 0.15)', // WhatsApp border grey
    borderRadius: 16,
    padding: 14,
    flex: 1,
    marginRight: 8,
  },
  insightIcon: {
    marginBottom: 8,
  },
  insightVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  insightLabel: {
    color: '#6B7280',
    fontSize: 11,
  },
});
