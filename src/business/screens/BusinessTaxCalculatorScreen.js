/**
 * Business Tax Calculator Screen
 * Provides a simple tax calculation tool for business users
 */
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';

const BusinessTaxCalculatorScreen = ({ navigation }) => {
  const [calculatorType, setCalculatorType] = useState('income');
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState('');
  const [salesAmount, setSalesAmount] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [deductions, setDeductions] = useState('');
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // Reset form when calculator type changes
  useEffect(() => {
    setIncome('');
    setExpenses('');
    setSalesAmount('');
    setTaxRate('');
    setDeductions('');
    setResult(null);
    setShowResult(false);
  }, [calculatorType]);

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return `$${parseFloat(amount).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Format percentage
  const formatPercentage = (value) => {
    if (!value) return '0%';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const validateInputs = () => {
    switch (calculatorType) {
      case 'income':
        if (!income || isNaN(parseFloat(income))) {
          Alert.alert('Error', 'Please enter a valid income amount');
          return false;
        }
        if (!expenses || isNaN(parseFloat(expenses))) {
          Alert.alert('Error', 'Please enter a valid expense amount');
          return false;
        }
        if (!taxRate || isNaN(parseFloat(taxRate))) {
          Alert.alert('Error', 'Please enter a valid tax rate percentage');
          return false;
        }
        return true;
      
      case 'sales':
        if (!salesAmount || isNaN(parseFloat(salesAmount))) {
          Alert.alert('Error', 'Please enter a valid sales amount');
          return false;
        }
        if (!taxRate || isNaN(parseFloat(taxRate))) {
          Alert.alert('Error', 'Please enter a valid tax rate percentage');
          return false;
        }
        return true;

      case 'estimation':
        if (!income || isNaN(parseFloat(income))) {
          Alert.alert('Error', 'Please enter a valid income amount');
          return false;
        }
        if (!deductions || isNaN(parseFloat(deductions))) {
          Alert.alert('Error', 'Please enter a valid deductions amount');
          return false;
        }
        if (!taxRate || isNaN(parseFloat(taxRate))) {
          Alert.alert('Error', 'Please enter a valid tax rate percentage');
          return false;
        }
        return true;

      default:
        return false;
    }
  };

  const calculateTax = () => {
    if (!validateInputs()) return;

    let taxAmount = 0;
    let totalAmount = 0;
    let netAmount = 0;
    let taxableAmount = 0;
    
    switch (calculatorType) {
      case 'income':
        const incomeValue = parseFloat(income);
        const expensesValue = parseFloat(expenses);
        const taxRateValue = parseFloat(taxRate) / 100;
        
        taxableAmount = incomeValue - expensesValue;
        taxAmount = taxableAmount * taxRateValue;
        netAmount = taxableAmount - taxAmount;
        
        setResult({
          income: incomeValue,
          expenses: expensesValue,
          taxableIncome: taxableAmount,
          taxRate: taxRateValue,
          taxAmount: taxAmount,
          netIncome: netAmount,
        });
        break;
      
      case 'sales':
        const salesValue = parseFloat(salesAmount);
        const salesTaxRate = parseFloat(taxRate) / 100;
        
        taxAmount = salesValue * salesTaxRate;
        totalAmount = salesValue + taxAmount;
        
        setResult({
          salesAmount: salesValue,
          taxRate: salesTaxRate,
          taxAmount: taxAmount,
          totalWithTax: totalAmount,
        });
        break;

      case 'estimation':
        const estimatedIncome = parseFloat(income);
        const deductionsValue = parseFloat(deductions);
        const estimatedTaxRate = parseFloat(taxRate) / 100;
        
        taxableAmount = Math.max(0, estimatedIncome - deductionsValue);
        taxAmount = taxableAmount * estimatedTaxRate;
        netAmount = estimatedIncome - taxAmount;
        
        setResult({
          income: estimatedIncome,
          deductions: deductionsValue,
          taxableIncome: taxableAmount,
          taxRate: estimatedTaxRate,
          estimatedTax: taxAmount,
          afterTaxIncome: netAmount,
        });
        break;

      default:
        return;
    }

    setShowResult(true);
  };

  const renderCalculator = () => {
    switch (calculatorType) {
      case 'income':
        return (
          <View style={styles.calculatorContainer}>
            <Text style={styles.formLabel}>Business Income</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={income}
                onChangeText={setIncome}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <Text style={styles.formLabel}>Business Expenses</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={expenses}
                onChangeText={setExpenses}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <Text style={styles.formLabel}>Tax Rate</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={taxRate}
                onChangeText={setTaxRate}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#A0A0A0"
              />
              <Text style={styles.inputSuffix}>%</Text>
            </View>
          </View>
        );
      
      case 'sales':
        return (
          <View style={styles.calculatorContainer}>
            <Text style={styles.formLabel}>Sales Amount</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={salesAmount}
                onChangeText={setSalesAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <Text style={styles.formLabel}>Sales Tax Rate</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={taxRate}
                onChangeText={setTaxRate}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#A0A0A0"
              />
              <Text style={styles.inputSuffix}>%</Text>
            </View>
          </View>
        );
      
      case 'estimation':
        return (
          <View style={styles.calculatorContainer}>
            <Text style={styles.formLabel}>Estimated Annual Income</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={income}
                onChangeText={setIncome}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <Text style={styles.formLabel}>Estimated Deductions</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={deductions}
                onChangeText={setDeductions}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <Text style={styles.formLabel}>Estimated Tax Rate</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={taxRate}
                onChangeText={setTaxRate}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#A0A0A0"
              />
              <Text style={styles.inputSuffix}>%</Text>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  const renderResult = () => {
    if (!showResult || !result) return null;

    switch (calculatorType) {
      case 'income':
        return (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Income Tax Calculation</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Income:</Text>
              <Text style={styles.resultValue}>{formatCurrency(result.income)}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Expenses:</Text>
              <Text style={styles.resultValue}>{formatCurrency(result.expenses)}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Taxable Income:</Text>
              <Text style={styles.resultValue}>{formatCurrency(result.taxableIncome)}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Tax Rate:</Text>
              <Text style={styles.resultValue}>{formatPercentage(result.taxRate * 100)}</Text>
            </View>
            
            <View style={styles.resultDivider} />
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabelHighlight}>Tax Amount:</Text>
              <Text style={styles.resultValueHighlight}>{formatCurrency(result.taxAmount)}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabelHighlight}>Net Income:</Text>
              <Text style={styles.resultValueHighlight}>{formatCurrency(result.netIncome)}</Text>
            </View>

         {/* <TouchableOpacity style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save Calculation</Text>
            </TouchableOpacity> */}
          </View>
        );
      
      case 'sales':
        return (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Sales Tax Calculation</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Sales Amount:</Text>
              <Text style={styles.resultValue}>{formatCurrency(result.salesAmount)}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Tax Rate:</Text>
              <Text style={styles.resultValue}>{formatPercentage(result.taxRate * 100)}</Text>
            </View>
            
            <View style={styles.resultDivider} />
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabelHighlight}>Tax Amount:</Text>
              <Text style={styles.resultValueHighlight}>{formatCurrency(result.taxAmount)}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabelHighlight}>Total with Tax:</Text>
              <Text style={styles.resultValueHighlight}>{formatCurrency(result.totalWithTax)}</Text>
            </View>

            <TouchableOpacity style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save Calculation</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'estimation':
        return (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Tax Estimation</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Estimated Income:</Text>
              <Text style={styles.resultValue}>{formatCurrency(result.income)}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Deductions:</Text>
              <Text style={styles.resultValue}>{formatCurrency(result.deductions)}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Taxable Income:</Text>
              <Text style={styles.resultValue}>{formatCurrency(result.taxableIncome)}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Tax Rate:</Text>
              <Text style={styles.resultValue}>{formatPercentage(result.taxRate * 100)}</Text>
            </View>
            
            <View style={styles.resultDivider} />
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabelHighlight}>Estimated Tax:</Text>
              <Text style={styles.resultValueHighlight}>{formatCurrency(result.estimatedTax)}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabelHighlight}>After-Tax Income:</Text>
              <Text style={styles.resultValueHighlight}>{formatCurrency(result.afterTaxIncome)}</Text>
            </View>

            <TouchableOpacity style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save Calculation</Text>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tax Calculator</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.calculatorTypeContainer}>
            <Text style={styles.sectionTitle}>Select Calculator Type</Text>
            <View style={styles.calculatorTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  calculatorType === 'income' && styles.activeTypeButton,
                ]}
                onPress={() => setCalculatorType('income')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    calculatorType === 'income' && styles.activeTypeButtonText,
                  ]}
                >
                  Income Tax
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  calculatorType === 'sales' && styles.activeTypeButton,
                ]}
                onPress={() => setCalculatorType('sales')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    calculatorType === 'sales' && styles.activeTypeButtonText,
                  ]}
                >
                  Sales Tax
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  calculatorType === 'estimation' && styles.activeTypeButton,
                ]}
                onPress={() => setCalculatorType('estimation')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    calculatorType === 'estimation' && styles.activeTypeButtonText,
                  ]}
                >
                  Tax Estimation
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {renderCalculator()}

          <TouchableOpacity style={styles.calculateButton} onPress={calculateTax}>
            <Text style={styles.calculateButtonText}>Calculate</Text>
          </TouchableOpacity>

          {renderResult()}

          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={18} color="#888" />
            <Text style={styles.disclaimerText}>
              This calculator provides estimates only. For accurate tax calculations, consult a professional accountant.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 70 : 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  calculatorTypeContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: theme.colors.text,
  },
  calculatorTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTypeButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#777777',
  },
  activeTypeButtonText: {
    color: theme.colors.primary,
  },
  calculatorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555555',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputPrefix: {
    color: '#555555',
    fontSize: 16,
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputSuffix: {
    color: '#555555',
    fontSize: 16,
    marginLeft: 4,
  },
  calculateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    color: '#555555',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  resultLabelHighlight: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  resultValueHighlight: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  resultDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 12,
  },
  saveButton: {
    backgroundColor: '#F5F7FA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  saveButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#888888',
    marginLeft: 8,
  },
});

export default BusinessTaxCalculatorScreen;
