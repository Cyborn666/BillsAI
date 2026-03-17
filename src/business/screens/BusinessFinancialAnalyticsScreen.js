import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { VictoryPie, VictoryTooltip } from 'victory-native';
import theme from '../../styles/theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as businessApiService from '../services/businessApiService';

const screenWidth = Dimensions.get('window').width;

const BusinessFinancialAnalyticsScreen = ({ navigation }) => {
  const [timeRange, setTimeRange] = useState('6m');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeExpenseSlice, setActiveExpenseSlice] = useState(null);
  const [activeIncomeSlice, setActiveIncomeSlice] = useState(null);

  const timeRanges = [
    { label: '1M', value: '1m' },
    { label: '3M', value: '3m' },
    { label: '6M', value: '6m' },
    { label: '1Y', value: '1y' },
  ];

  // Define the analytics data fetching function
  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const analyticsResponse = await businessApiService.getAnalyticsTabData(timeRange);
      
      // Format the data to match the expected structure
      const formattedData = {
        profitLossData: analyticsResponse.data.cashFlowOverview,
        totalIncome: analyticsResponse.data.totalIncome,
        totalExpenses: analyticsResponse.data.totalExpenses,
        netProfit: analyticsResponse.data.netProfit,
        expenseBreakdown: analyticsResponse.data.expenseBreakdown.map((item, index) => ({
          ...item,
          color: getExpenseColor(index),
        })),
        incomeBreakdown: analyticsResponse.data.incomeBreakdown.map((item, index) => ({
          ...item,
          color: getIncomeColor(index),
        })),
        weeklyNetSales: analyticsResponse.data.weeklyNetSales,
      };

      setData(formattedData);
    } catch (error) {
      //console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Refresh when screen comes into focus or timeRange changes
  useFocusEffect(
    useCallback(() => {
      fetchAnalyticsData();
      return () => {
        // Optional cleanup
      };
    }, [fetchAnalyticsData])
  );

  // Helper functions to get colors for pie charts
  const getExpenseColor = (index) => {
    const colors = ['#FFA500', '#3366FF', '#33CC99', '#9966FF', '#FF6B8B', '#808080'];
    return colors[index % colors.length];
  };

  const getIncomeColor = (index) => {
    const colors = ['#3366FF', '#00C853', '#FF6B6B'];
    return colors[index % colors.length];
  };

  // 1. Financial Overview - Line Chart with tooltips on hover
  const renderFinancialOverview = () => {
    const { profitLossData } = data;
    const { labels, income, expenses } = profitLossData;
    // Calculate profit data from income and expenses
    const profit = income.map((inc, index) => inc - expenses[index]);

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <MaterialIcons name="trending-up" size={20} color={theme.colors.primary} />
          <Text style={styles.chartTitle}>Financial Overview</Text>
        </View>
        <LineChart
          data={{
            labels,
            datasets: [
              {
                data: income,
                color: (opacity = 1) => `rgba(51, 102, 255, ${opacity})`,
                strokeWidth: 2,
              },
              {
                data: expenses,
                color: (opacity = 1) => `rgba(255, 165, 0, ${opacity})`,
                strokeWidth: 2,
              },
              {
                data: profit,
                color: (opacity = 1) => `rgba(0, 200, 83, ${opacity})`,
                strokeWidth: 2,
              },
            ],
            legend: [], // Remove legend labels
          }}
          width={screenWidth - 10}
          height={220}
          chartConfig={{
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            // Format the y-axis values to be shorter (e.g., 5000 -> 5K)
            formatYLabel: (value) => {
              if (value >= 1000) {
                return `${Math.round(value / 1000)}K`;
              }
              return value;
            },
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '0', // Set radius to 0 to hide by default
              strokeWidth: '0',
            },
            propsForHover: {
              r: '5', // Larger radius when hovered
              strokeWidth: '2',
              stroke: '#FFFFFF',
            },
            fillShadowGradient: 'rgba(51, 102, 255, 0.2)',
            fillShadowGradientOpacity: 0.5,
            useShadowColorFromDataset: true,
          }}
          bezier
          withInnerLines={false}
          withOuterLines={true}
          fromZero
          segments={4}
          style={styles.chart}
        />

        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={[styles.summaryValue, styles.incomeText]}>
              ${data.totalIncome.toFixed(2)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={[styles.summaryValue, styles.expenseText]}>
              ${data.totalExpenses.toFixed(2)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Net Profit</Text>
            <Text style={[styles.summaryValue, styles.profitText]}>
              ${data.netProfit.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // 2. Expense Categories - Donut chart
  const renderExpenseBreakdown = () => {
    // Simple check to avoid errors while loading data
    if (!data || !data.expenseBreakdown) {
      return null;
    }

    // Use the data from the API
    const expenseData = data.expenseBreakdown;
    // Expense breakdown data ready for visualization

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <MaterialIcons name="pie-chart" size={20} color={theme.colors.primary} />
          <Text style={styles.chartTitle}>Expense Breakdown</Text>
        </View>

        <View style={styles.customPieChartContainer}>
          <View style={styles.chartWithLabelsContainer}>
            <View style={styles.donutChartWrapper}>
              <VictoryPie
                data={expenseData}
                x="category"
                y="percent"
                radius={100}
                innerRadius={70}
                colorScale={expenseData.map(item => item.color)}
                labels={({ datum }) => `${Math.round(datum.percent)}%`}
                style={{
                  labels: { fill: 'white', fontSize: 12, fontWeight: 'bold' },
                }}
                labelComponent={
                  <VictoryTooltip
                    flyoutStyle={styles.tooltipFlyout}
                    style={styles.tooltipText}
                    renderInPortal={false}
                    constrainToVisibleArea
                    pointerLength={0}
                    cornerRadius={8}
                    flyoutPadding={{top: 15, bottom: 15, left: 20, right: 20}}
                    text={({ datum }) => `${datum.category} (${Math.round(datum.percent)}%)\n$${datum.amount.toLocaleString()}`}
                    active={({datum}) => activeExpenseSlice === datum.category}
                  />
                }
                events={[
                  {
                    target: 'data',
                    eventHandlers: {
                      onPress: (_, targetProps) => {
                        // Show tooltip for the pressed slice
                        const datum = targetProps.datum;
                        if (datum && datum.category) {
                          setActiveExpenseSlice(datum.category);
                          
                          // Auto-hide tooltip after 500ms
                          setTimeout(() => {
                            setActiveExpenseSlice(null);
                          }, 500);
                        }
                        return [];
                      }
                    }
                  }
                ]}
                padding={0}
                width={350}
                height={350}
                animate={{
                  duration: 2000,
                  onExit: { duration: 500 },
                  onEnter: { duration: 1000 },
                }}
                padAngle={1}
              />
            </View>
            
            {/* Simple Legend */}
            <View style={styles.simpleLegend}>
              {expenseData.map((item, index) => (
                <View key={index} style={styles.simpleLegendItem}>
                  <View style={[styles.colorSquare, { backgroundColor: item.color }]} />
                  <Text style={styles.legendName}>{item.category}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }; 

  // 3. Income Sources - Donut chart
  const renderIncomeBreakdown = () => {
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <MaterialIcons
            name="account-balance-wallet"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.chartTitle}>Income Sources</Text>
        </View>

        <View style={styles.chartWithLabelsContainer}>
          <View style={styles.donutChartWrapper}>
            <VictoryPie
              data={data.incomeBreakdown}
              x="source"
              y="percent"
              radius={100}
              innerRadius={70}
              colorScale={data.incomeBreakdown.map(item => item.color)}
              labels={({ datum }) => `${Math.round(datum.percent)}%`}
              style={{
                labels: { fill: 'white', fontSize: 12, fontWeight: 'bold' },
              }}
              labelComponent={
                <VictoryTooltip
                  flyoutStyle={styles.tooltipFlyout}
                  style={styles.tooltipText}
                  renderInPortal={false}
                  constrainToVisibleArea
                  pointerLength={0}
                  cornerRadius={8}
                  flyoutPadding={{top: 15, bottom: 15, left: 20, right: 20}}
                  text={({ datum }) => `${datum.source} (${Math.round(datum.percent)}%)\n$${datum.amount.toLocaleString()}`}
                  active={({datum}) => activeIncomeSlice === datum.source}
                />
              }
              padding={0}
              width={350}
              height={300}
              animate={{
                duration: 2000,
                onExit: { duration: 500 },
                onEnter: { duration: 1000 },
              }}
              padAngle={1}
              events={[
                {
                  target: 'data',
                  eventHandlers: {
                    onPress: (_, targetProps) => {
                      // Show tooltip for the pressed slice
                      const datum = targetProps.datum;
                      if (datum && datum.source) {
                        setActiveIncomeSlice(datum.source);
                        
                        // Auto-hide tooltip after 1 second
                        setTimeout(() => {
                          setActiveIncomeSlice(null);
                        }, 500);
                      }
                      return [];
                    }
                  }
                }
              ]}
            />
          </View>
          
          {/* Simple Legend */}
          <View style={styles.simpleLegend}>
            {data.incomeBreakdown.map((item, index) => (
              <View key={index} style={styles.simpleLegendItem}>
                <View style={[styles.colorSquare, { backgroundColor: item.color }]} />
                <Text style={styles.legendName}>{item.source}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Prepare for weekly sales data visualization

  // 4. Weekly Sales Performance - Bar chart with improved aesthetics
  const renderWeeklySales = () => {
    const { weeklyNetSales } = data;
    const { labels, sales } = weeklyNetSales;


    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <MaterialIcons name="bar-chart" size={20} color={theme.colors.primary} />
          <Text style={styles.chartTitle}>Weekly Sales Performance</Text>
        </View>

        <BarChart
          data={{
            labels,
            datasets: [
              {
                data: sales,
                color: () => '#2563EB',
                strokeColor: '#2563EB',
                strokeWidth: 0,
                fillShadowGradient: '#2563EB',
                fillShadowGradientOpacity: 1,
              },
            ],
            legend: [],
          }}
          width={screenWidth - 40}
          height={240}
          yAxisLabel="$"
          chartConfig={{
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            fillShadowGradientFrom: '#2563EB',
            fillShadowGradientTo: '#2563EB',
            fillShadowGradientOpacity: 1,
            barPercentage: 0.6,
            minimumBarHeight: 5,
            labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
            propsForLabels: {
              fontSize: 12,
              fontWeight: '500',
            },
            propsForBackgroundLines: {
              strokeDasharray: '4, 4',
              strokeWidth: 1,
              stroke: '#E0E0E0',
            },
            formatYLabel: (value) => `${parseInt(value, 10).toLocaleString()}`,
          }}
          style={styles.chart}
          fromZero
          showBarTops={false}
          withInnerLines={true}
          showValuesOnTopOfBars={false}
          withHorizontalLines={true}
        />
      </View>
    );
  };

  // Render time range selector for filtering data
  const renderTimeRangeSelector = () => {
    return (
      <View style={styles.timeRangeContainer}>
        <View style={styles.timeRangeHeader}>
          <Text style={styles.timeRangeTitle}>Time Range:</Text>
          <View style={styles.timeRangeButtonContainer}>
          <View style={[styles.timeRangeButton, styles.timeRangeButtonActive]}>
              <Text style={[styles.timeRangeButtonText, styles.timeRangeButtonTextActive]}>
                6M (6 Months)
              </Text>
            </View>




           {/* {timeRanges.map((range) => (
              <TouchableOpacity
                key={range.value}
                style={[
                  styles.timeRangeButton,
                  timeRange === range.value ? styles.timeRangeButtonActive : null,
                ]}
                onPress={() => setTimeRange(range.value)}
              >
                <Text
                  style={[
                    styles.timeRangeButtonText,
                    timeRange === range.value
                      ? styles.timeRangeButtonTextActive
                      : null,
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}*/}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading analytics data...</Text>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Unable to load analytics data</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => setTimeRange(timeRange)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financial Analytics</Text>
        <TouchableOpacity 
          style={styles.aiButton}
          onPress={() => navigation.navigate('BusinessAiInsights')}
        >
          <MaterialIcons name="chat" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {renderTimeRangeSelector()}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {data && renderFinancialOverview()}
        {data && renderExpenseBreakdown()}
        {data && renderIncomeBreakdown()}
        {data && renderWeeklySales()}
      </ScrollView>
    </SafeAreaView>
  );
};

// You'll need to add your styles here
const styles = StyleSheet.create({
  tooltipFlyout: {
    fill: 'rgba(50, 50, 50, 0.95)',
    stroke: 'rgba(50, 50, 50, 0)',
    filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2))',
  },
  tooltipText: {
    fill: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  timeRangeContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  timeRangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRangeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  timeRangeButtonContainer: {
    flexDirection: 'row',
  },
  timeRangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  timeRangeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  timeRangeButtonText: {
    fontSize: 14,
    color: '#555',
  },
  timeRangeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  barChartStyle: {
    marginVertical: 15,
    borderRadius: 16,
    paddingTop: 15,
    backgroundColor: '#FFFFFF',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#777',
    marginLeft: 8,
    marginTop: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeText: {
    color: '#3366FF',
  },
  expenseText: {
    color: '#FFA500',
  },
  profitText: {
    color: '#00C853',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.error,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  customPieChartContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  chartWithLabelsContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 5,
    marginTop: 5,
  },
  donutChartWrapper: {
    position: 'relative',
    width: 400,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 5,
  },
  simpleLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  colorSquare: {
    width: 12,
    height: 12,
    marginRight: 4,
  },
  legendName: {
    fontSize: 12,
  },
  labelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  // New styles for the legends
  legendContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
    flexDirection: 'column',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#555',
  },
});

export default BusinessFinancialAnalyticsScreen;
