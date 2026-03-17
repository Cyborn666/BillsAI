/**
 * Business Miscellaneous Screen
 * Screen for recording miscellaneous income and expenses
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { createMiscellaneousTransaction, getMiscellaneousTransactions, deleteMiscellaneousTransaction } from '../services/businessApiService';
import theme from '../../styles/theme';
import {Swipeable} from 'react-native-gesture-handler';

const BusinessMiscellaneousScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [transactionData, setTransactionData] = useState({
    title: '',
    amount: '',
    type: 'expense', // 'expense' or 'income'
    description: '',
    category: '',
  });

  // Fetch transactions when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [])
  );

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await getMiscellaneousTransactions();
      if (response && response.data) {
        setTransactions(response.data);
      }
    } catch (error) {
      //console.error('Error fetching miscellaneous transactions:', error);
      Alert.alert('Error', 'Failed to load transactions. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTransaction = async () => {
    if (!transactionData.title || !transactionData.amount) {
      Alert.alert('Missing Information', 'Please enter a title and amount.');
      return;
    }

    try {
      setIsLoading(true);
      const data = {
        date,
        title: transactionData.title,
        amount: parseFloat(transactionData.amount),
        type: transactionData.type,
        description: transactionData.description,
        category: transactionData.category,
      };

      const response = await createMiscellaneousTransaction(data);
      if (response) {
        Alert.alert('Success', 'Transaction has been recorded successfully.');
        // Reset form
        setTransactionData({
          title: '',
          amount: '',
          type: 'expense',
          description: '',
          category: '',
        });
        setDate(new Date());
        setShowForm(false);
        // Refresh transactions list
        fetchTransactions();
      }
    } catch (error) {
      //console.error('Error creating transaction:', error);
      Alert.alert('Error', error.message || 'Failed to record transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onDelete = async (transactionId) => {
    try {
      await deleteMiscellaneousTransaction(transactionId);
      fetchTransactions();
    } catch (error) {
      //console.error('Error deleting transaction:', error);
      Alert.alert('Error', 'Failed to delete transaction. Please try again later.');
    }
  };


  const renderRightActions = ({item}) => (
    <TouchableOpacity onPress={() => onDelete(item._id || item.id)} style={{ backgroundColor: 'red', justifyContent: 'center', alignItems: 'center', padding: 16, width: 100,height: 80 ,borderTopRightRadius: 8,borderBottomRightRadius: 8}}>
        <MaterialIcons name="delete" size={24} color="white" />
    </TouchableOpacity>
  );


  const renderTransactionItem = ({ item }) => {
    const isIncome = item.type === 'income';
    return (
      <Swipeable
        renderRightActions={() => renderRightActions({item})}
      >
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionTitle}>{item.title}</Text>
          <Text
            style={[
              styles.transactionAmount,
              isIncome ? styles.incomeAmount : styles.expenseAmount,
            ]}
          >
            {isIncome ? '+' : '-'}${parseFloat(item.amount).toFixed(2)}
          </Text>
        </View>
        <Text style={styles.transactionDate}>
          {format(new Date(item.date), 'MMM d, yyyy')}
        </Text>
        {item.description ? (
          <Text style={styles.transactionDescription}>{item.description}</Text>
        ) : null}
        {item.category ? (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{item.category}</Text>
          </View>
        ) : null}
      </View>
      </Swipeable>
    );
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={24} color="#000000"  />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Miscellaneous</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <MaterialIcons
            name={showForm ? 'close' : 'add'}
            size={24}
            color={theme.colors.white}
          />
        </TouchableOpacity>
      </View>

      {isLoading && !showForm ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          {showForm ? (
            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>{format(date, 'MMMM d, yyyy')}</Text>
                  <MaterialIcons name="calendar-today" size={20} color="#555" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.textInput}
                  value={transactionData.title}
                  onChangeText={(text) => setTransactionData({ ...transactionData, title: text })}
                  placeholder="Transaction title"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Amount ($)</Text>
                <TextInput
                  style={styles.textInput}
                  value={transactionData.amount}
                  onChangeText={(text) => setTransactionData({ ...transactionData, amount: text })}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.typeToggle}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      transactionData.type === 'expense' ? styles.typeOptionActive : {},
                    ]}
                    onPress={() => setTransactionData({ ...transactionData, type: 'expense' })}
                  >
                    <Text
                      style={
                        transactionData.type === 'expense'
                          ? styles.typeTextActive
                          : styles.typeTextInactive
                      }
                    >
                      Expense
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      transactionData.type === 'income' ? styles.typeOptionActive : {},
                    ]}
                    onPress={() => setTransactionData({ ...transactionData, type: 'income' })}
                  >
                    <Text
                      style={
                        transactionData.type === 'income'
                          ? styles.typeTextActive
                          : styles.typeTextInactive
                      }
                    >
                      Income
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={transactionData.category}
                  onChangeText={(text) => setTransactionData({ ...transactionData, category: text })}
                  placeholder="E.g., Utilities, Rent, Commission"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={transactionData.description}
                  onChangeText={(text) => setTransactionData({ ...transactionData, description: text })}
                  placeholder="Add any notes about this transaction..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleCreateTransaction}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Save Transaction</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="receipt-long" size={60} color="#CCCCCC" />
              <Text style={styles.emptyText}>No miscellaneous transactions recorded yet</Text>
              <Text style={styles.emptySubtext}>
                Add income or expenses that don't fit into other categories
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowForm(true)}
              >
                <Text style={styles.emptyButtonText}>Add Your First Transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={transactions}
              renderItem={renderTransactionItem}
              keyExtractor={(item) => item._id || item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.white,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  addButton: {
    backgroundColor: '#3867d6',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3867d6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: '#3867d6',
  },
  typeTextActive: {
    fontWeight: '600',
    color: theme.colors.white,
  },
  typeTextInactive: {
    color: '#666',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#3867d6',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3867d6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  incomeAmount: {
    color: '#4CAF50',
  },
  expenseAmount: {
    color: '#F44336',
  },
  transactionDate: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  categoryTagText: {
    fontSize: 12,
    color: '#666',
  },
});

export default BusinessMiscellaneousScreen;
