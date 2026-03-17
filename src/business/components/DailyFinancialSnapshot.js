/**
 * DailyFinancialSnapshot Component
 * Displays a snapshot of daily financial data for quick reference
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getDailyFinancialSummary } from '../services/businessApiService';
import theme from '../../styles/theme';
import { format } from 'date-fns';

const DailyFinancialSnapshot = ({ date = new Date(), style = {} }) => {
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState(null);
  const [error, setError] = useState(null);
  
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  useEffect(() => {
    const fetchDailyData = async () => {
      try {
        setLoading(true);
        const data = await getDailyFinancialSummary(formattedDate);
        setFinancialData(data);
        setError(null);
      } catch (err) {
        //console.error('Error fetching daily financial data:', err);
        setError('Failed to load financial data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDailyData();
  }, [formattedDate]);
  
  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  if (error || !financialData) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>{error || 'No data available'}</Text>
      </View>
    );
  }
  
  const { 
    totalIncome = 0, 
    totalExpenses = 0, 
    netCashFlow = 0, 
    pendingInvoices = 0,
    unpaidBills = 0 
  } = financialData;
  
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Daily Financial Summary</Text>
      <Text style={styles.date}>{format(date, 'MMMM d, yyyy')}</Text>
      
      <View style={styles.dataRow}>
        <View style={styles.dataColumn}>
          <Text style={styles.dataLabel}>Income</Text>
          <Text style={[styles.dataValue, styles.incomeText]}>
            ${totalIncome.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.dataColumn}>
          <Text style={styles.dataLabel}>Expenses</Text>
          <Text style={[styles.dataValue, styles.expenseText]}>
            ${totalExpenses.toFixed(2)}
          </Text>
        </View>
      </View>
      
      <View style={styles.separator} />
      
      <View style={styles.netRow}>
        <Text style={styles.netLabel}>Net Cash Flow</Text>
        <Text 
          style={[
            styles.netValue, 
            netCashFlow >= 0 ? styles.positiveFlow : styles.negativeFlow
          ]}
        >
          ${Math.abs(netCashFlow).toFixed(2)}
          {netCashFlow >= 0 ? ' (+)' : ' (-)'}
        </Text>
      </View>
      
      <View style={styles.alertsContainer}>
        {pendingInvoices > 0 && (
          <Text style={styles.alertText}>
            {pendingInvoices} pending invoice{pendingInvoices !== 1 ? 's' : ''}
          </Text>
        )}
        
        {unpaidBills > 0 && (
          <Text style={styles.alertText}>
            {unpaidBills} unpaid bill{unpaidBills !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dataColumn: {
    flex: 1,
  },
  dataLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  incomeText: {
    color: theme.colors.success,
  },
  expenseText: {
    color: theme.colors.error,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 16,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  netLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  netValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positiveFlow: {
    color: theme.colors.success,
  },
  negativeFlow: {
    color: theme.colors.error,
  },
  alertsContainer: {
    marginTop: 8,
  },
  alertText: {
    fontSize: 14,
    color: theme.colors.warning,
    marginBottom: 4,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    padding: 16,
  },
});

export default DailyFinancialSnapshot;
