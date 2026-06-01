import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  TextInput,
  TouchableOpacity,
  Modal,
  PanResponder,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Transaction, CATEGORIES, FilterParams } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  currency: 'NGN' | 'USD';
  exchangeRate: number;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  isBalanceHidden: boolean;
  setParentScrollEnabled?: (enabled: boolean) => void;
  isSearchVisible?: boolean;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  onSwipeActive?: (active: boolean) => void;
}

const SwipeableRow = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  isFirst,
  isLast,
  onSwipeActive,
}: SwipeableRowProps) => {
  const translateX = useRef(new Animated.Value(0)).current;

  // Store callbacks in refs to avoid stale closures in PanResponder
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  const onSwipeActiveRef = useRef(onSwipeActive);

  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;
  onSwipeActiveRef.current = onSwipeActive;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        onSwipeActiveRef.current?.(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        onSwipeActiveRef.current?.(false);
        if (gestureState.dx < -120) {
          Animated.spring(translateX, {
            toValue: 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }).start();
          onSwipeLeftRef.current();
        } else if (gestureState.dx > 120) {
          Animated.spring(translateX, {
            toValue: 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }).start();
          onSwipeRightRef.current();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        onSwipeActiveRef.current?.(false);
        Animated.spring(translateX, {
          toValue: 0,
          friction: 5,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <View
      onTouchStart={() => onSwipeActiveRef.current?.(true)}
      onTouchEnd={() => onSwipeActiveRef.current?.(false)}
      onTouchCancel={() => onSwipeActiveRef.current?.(false)}
      style={{ overflow: 'hidden', backgroundColor: 'transparent' }}
    >
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: 'rgba(77, 150, 255, 0.15)',
              width: '50%',
              height: '100%',
              justifyContent: 'center',
              paddingLeft: 20,
            }}
          >
            <Feather name="edit-2" size={18} color="#4D96FF" />
          </View>
          <View
            style={{
              backgroundColor: 'rgba(255, 107, 107, 0.15)',
              width: '50%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'flex-end',
              paddingRight: 20,
            }}
          >
            <Feather name="trash-2" size={18} color="#FF6B6B" />
          </View>
        </View>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

export const TransactionList = ({
  transactions,
  currency,
  exchangeRate,
  onEdit,
  onDelete,
  isBalanceHidden,
  setParentScrollEnabled,
  isSearchVisible = false,
}: TransactionListProps) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [sortBy, setSortBy] = useState<FilterParams['sortBy']>('date-desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Animated values for collapsible search/filters panel
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [overflowVal, setOverflowVal] = useState<'hidden' | 'visible'>('hidden');

  useEffect(() => {
    if (isSearchVisible) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start(() => {
        setOverflowVal('visible');
      });
    } else {
      setOverflowVal('hidden');
      setShowSortDropdown(false);
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isSearchVisible]);

  // Custom delete popup states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [txToDelete, setTxToDelete] = useState<{ id: string; title: string } | null>(null);

  // Custom details modal states
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const handleRowPress = (item: Transaction) => {
    setSelectedTx(item);
    setDetailsModalVisible(true);
  };

  const formatAmount = (amount: number) => {
    if (currency === 'USD') {
      const val = amount / exchangeRate;
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₦${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const parsed = new Date(y, m, d);
    return parsed.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Handle deletions
  const handleDeletePress = (id: string, title: string) => {
    setTxToDelete({ id, title });
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (txToDelete) {
      onDelete(txToDelete.id);
      setDeleteModalVisible(false);
      setTxToDelete(null);
    }
  };

  // Filter and Sort Logic
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          (t.note && t.note.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date-desc') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (sortBy === 'date-asc') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    if (sortBy === 'amount-desc') {
      return b.amount - a.amount;
    }
    if (sortBy === 'amount-asc') {
      return a.amount - b.amount;
    }
    return 0;
  });

  const groupTransactionsByDate = (txs: Transaction[]) => {
    const groups: Record<string, Transaction[]> = {};
    txs.forEach((tx) => {
      const dateStr = tx.date;
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(tx);
    });

    const getLocalDateString = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const todayStr = getLocalDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    return Object.keys(groups)
      .sort((a, b) => {
        const timeA = new Date(a).getTime();
        const timeB = new Date(b).getTime();
        return sortBy.includes('asc') ? timeA - timeB : timeB - timeA;
      })
      .map((dateKey) => {
        let title = dateKey;
        try {
          if (dateKey === todayStr) {
            title = 'Today';
          } else if (dateKey === yesterdayStr) {
            title = 'Yesterday';
          } else {
            title = new Date(dateKey).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          }
        } catch {
          title = dateKey;
        }

        return {
          title,
          data: groups[dateKey],
        };
      });
  };

  const getSections = () => {
    if (sortBy.startsWith('amount')) {
      const label = sortBy === 'amount-desc' ? 'Highest Amount' : 'Lowest Amount';
      return [
        {
          title: label,
          data: sortedTransactions,
        },
      ];
    }
    return groupTransactionsByDate(sortedTransactions);
  };

  const sections = getSections();

  const formatDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', options);
    } catch {
      return dateStr;
    }
  };

  const getSortLabel = (sortVal: FilterParams['sortBy']) => {
    switch (sortVal) {
      case 'date-desc': return 'Newest';
      case 'date-asc': return 'Oldest';
      case 'amount-desc': return 'Highest Amount';
      case 'amount-asc': return 'Lowest Amount';
    }
  };

  const formatDisplayAmount = (amount: number) => {
    if (currency === 'USD') {
      const val = amount / exchangeRate;
      return `$${val.toFixed(2)}`;
    }
    return `₦${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          height: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 126],
          }),
          opacity: animatedValue,
          overflow: overflowVal,
        }}
      >
        {/* Search and Filters */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              placeholderTextColor="#6B7280"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
                <Feather name="x" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortDropdown(!showSortDropdown)}
          >
            <Feather name="sliders" size={18} color="#00A884" />
            <Text style={styles.sortButtonText}>{getSortLabel(sortBy)}</Text>
          </TouchableOpacity>
        </View>

        {/* Sort Dropdown */}
        {showSortDropdown && (
          <View style={styles.dropdownContainer}>
            {(['date-desc', 'date-asc', 'amount-desc', 'amount-asc'] as FilterParams['sortBy'][]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownItem,
                  sortBy === option && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setSortBy(option);
                  setShowSortDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    sortBy === option && styles.dropdownTextActive,
                  ]}
                >
                  {getSortLabel(option)}
                </Text>
                {sortBy === option && <Feather name="check" size={16} color="#00A884" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.tabsContainer}>
          {([
            { key: 'all', label: 'All' },
            { key: 'expense', label: 'Expenses' },
            { key: 'income', label: 'Income' },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                typeFilter === tab.key && styles.activeTab,
              ]}
              onPress={() => setTypeFilter(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  typeFilter === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
      {/* Transaction List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 110 }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={48} color="#4B5563" />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const categoryConfig = CATEGORIES[item.category] || CATEGORIES.Others;
          const isExpense = item.type === 'expense';
          const isFirst = index === 0;
          const isLast = index === section.data.length - 1;

          return (
            <SwipeableRow
              onSwipeLeft={() => handleDeletePress(item.id, item.title)}
              onSwipeRight={() => onEdit(item)}
              isFirst={isFirst}
              isLast={isLast}
              onSwipeActive={(active) => setParentScrollEnabled?.(!active)}
            >
              <TouchableOpacity 
                style={[
                  styles.row,
                  isFirst && styles.rowFirst,
                  isLast && styles.rowLast,
                ]}
                onPress={() => handleRowPress(item)}
                onLongPress={() => handleDeletePress(item.id, item.title)}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  {/* Category Icon */}
                  <View style={styles.iconWrapper}>
                    <Feather name={categoryConfig.icon as any} size={18} color={categoryConfig.color} />
                  </View>
  
                  {/* Details */}
                  <View style={styles.rowDetails}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.note ? (
                      <Text style={styles.rowNote} numberOfLines={1}>
                        {item.note}
                      </Text>
                    ) : (
                      <Text style={[styles.rowCategory, { color: categoryConfig.color }]}>
                        {categoryConfig.name}
                      </Text>
                    )}
                  </View>
                </View>
  
                {/* Amount and Actions */}
                <View style={styles.rowRight}>
                  <Text style={[styles.rowAmount, isExpense ? styles.expenseAmount : styles.incomeAmount]}>
                    {isBalanceHidden ? '******' : `${isExpense ? '-' : '+'}${formatDisplayAmount(item.amount)}`}
                  </Text>
                </View>
              </TouchableOpacity>
            </SwipeableRow>
          );
        }}
      />

      {/* Custom Delete Confirmation Dialog Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setTxToDelete(null);
        }}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconWrapper}>
              <Feather name="trash-2" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.dialogTitle}>Delete Transaction?</Text>
            <Text style={styles.dialogMessage}>
              Are you sure you want to permanently delete "{txToDelete?.title}"? This action cannot be undone.
            </Text>
            <View style={styles.dialogButtonsRow}>
              <TouchableOpacity
                style={[styles.dialogBtn, styles.dialogCancelBtn]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setTxToDelete(null);
                }}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, styles.dialogDeleteBtn]}
                onPress={confirmDelete}
              >
                <Text style={styles.dialogDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transaction Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setDetailsModalVisible(false);
          setSelectedTx(null);
        }}
      >
        <TouchableOpacity
          style={styles.detailsOverlay}
          activeOpacity={1}
          onPress={() => {
            setDetailsModalVisible(false);
            setSelectedTx(null);
          }}
        >
          <TouchableOpacity activeOpacity={1} style={styles.detailsCard}>
            {selectedTx && (() => {
              const categoryConfig = CATEGORIES[selectedTx.category] || CATEGORIES.Others;
              const isExpense = selectedTx.type === 'expense';
              return (
                <>
                  {/* Category Header Badge */}
                  <View style={[styles.detailsHeaderCircle, { backgroundColor: categoryConfig.bgLight }]}>
                    <Feather name={categoryConfig.icon as any} size={28} color={categoryConfig.color} />
                  </View>
                  
                  {/* Title / Description */}
                  <Text style={styles.detailsTitle}>{selectedTx.title}</Text>
                  
                  {/* Amount */}
                  <Text style={[styles.detailsAmount, { color: isExpense ? '#FF6B6B' : '#00A884' }]}>
                    {isExpense ? '-' : '+'}{formatAmount(selectedTx.amount)}
                  </Text>
                  
                  <View style={styles.detailsDivider} />
                  
                  {/* Info Table */}
                  <View style={styles.detailsTable}>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Category</Text>
                      <View style={[styles.detailsBadge, { backgroundColor: categoryConfig.bgLight }]}>
                        <Text style={[styles.detailsBadgeText, { color: categoryConfig.color }]}>
                          {categoryConfig.name}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Type</Text>
                      <Text style={[styles.detailsValue, { color: isExpense ? '#FF6B6B' : '#00A884', fontWeight: '700' }]}>
                        {isExpense ? 'Expense' : 'Income'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Date & Time</Text>
                      <Text style={styles.detailsValue}>
                        {formatFullDate(selectedTx.date)} at {selectedTx.time || '12:00'}
                      </Text>
                    </View>
                    
                    {selectedTx.note ? (
                      <View style={styles.detailsNoteContainer}>
                        <Text style={styles.detailsLabel}>Note / Memo</Text>
                        <View style={styles.detailsNoteBox}>
                          <Feather name="edit-3" size={14} color="#9CA3AF" style={{ marginRight: 6, marginTop: 2 }} />
                          <Text style={styles.detailsNoteText}>{selectedTx.note}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                  
                  {/* Close Button */}
                  <TouchableOpacity
                    style={styles.detailsCloseBtn}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      setSelectedTx(null);
                    }}
                  >
                    <Text style={styles.detailsCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginLeft: 8,
  },
  sortButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  dropdownContainer: {
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 6,
    position: 'absolute',
    top: 58,
    right: 16,
    left: 16,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
  },
  dropdownText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownTextActive: {
    color: '#00A884',
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0B141A', // Match page background so it blends, but solid so swipe action background doesn't bleed through
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowFirst: {},
  rowLast: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(134, 150, 160, 0.15)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowDetails: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  rowCategory: {
    fontSize: 11,
    fontWeight: '600',
  },
  rowNote: {
    fontSize: 11,
    color: '#6B7280',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowDeleteBtn: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(134, 150, 160, 0.15)', // WhatsApp border grey
    marginHorizontal: 0,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionHeaderText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  expenseAmount: {
    color: '#FF6B6B',
  },
  incomeAmount: {
    color: '#00A884',
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailsCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#202C33', // WhatsApp Bubble BG
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  detailsHeaderCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  detailsAmount: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
  detailsDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  detailsTable: {
    width: '100%',
    marginBottom: 24,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  detailsLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  detailsValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detailsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsNoteContainer: {
    width: '100%',
    marginTop: 14,
  },
  detailsNoteBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  detailsNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 18,
  },
  detailsCloseBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#00A884',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00A884',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsCloseBtnText: {
    color: '#0B141A',
    fontSize: 14,
    fontWeight: '700',
  },
});
