/**
 * Business Dashboard Analytics Controller
 * Provides consolidated analytics for the business dashboard
 */
// mongoose not directly used, but may be needed for ObjectId operations
const BusinessInvoice = require('../models/businessInvoiceModel');
const Expense = require('../models/expenseModel');
const BusinessBill = require('../models/businessBillModel');
const BusinessDailyReport = require('../models/businessDailyReportModel');
const BusinessMiscTransaction = require('../models/businessMiscTransactionModel');

const catchAsync = require('../utils/catchAsync');

/**
 * Get dashboard analytics data
 * Calculates key metrics for the business dashboard:
 * - Monthly sales (Invoices paid + misc income + daily report sales)
 * - Expenses (Expenses + misc expenses + bills)
 * - Invoices paid
 * - Pending invoices
 * 
 * If no invoices, shows present day sales and over/short instead
 */
exports.getDashboardAnalytics = catchAsync(async (req, res) => {
  const userId = req.businessUser?.id || req.user?.id;
  
  // Set date ranges for the current month
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // Get today's date range (start and end of today)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  // Get paid invoices for the current month
  const paidInvoices = await BusinessInvoice.find({
    userId:userId,
    status: 'paid',
    issueDate: { $gte: startOfMonth, $lte: endOfMonth }
  });
  ////console.log('Paid invoices:', paidInvoices);
  
  // Get pending/sent invoices
  const pendingInvoices = await BusinessInvoice.find({
    userId:userId,
    status: { $in: ['sent', 'overdue'] },
    issueDate: { $gte: startOfMonth, $lte: endOfMonth },
  });
  ////console.log('Pending invoices:', pendingInvoices);
  
  // Get expenses for the current month
  const expenses = await Expense.find({
    user: userId,
    isBusinessExpense: true,
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });
  ////console.log('Expenses:', expenses);
  
  // Get bills for the current month
  const bills = await BusinessBill.find({
    user: userId,
    dueDate: { $gte: startOfMonth, $lte: endOfMonth },
  });
  ////console.log('Bills:', bills);
  
  // Get daily reports for the current month
  const dailyReports = await BusinessDailyReport.find({
    businessUser: userId,
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });
  ////console.log('Daily reports:', dailyReports);
  
  // Get today's daily report (might be used for today's metrics)
  const todayReport = await BusinessDailyReport.findOne({
    businessUser: userId,
    date: { $gte: startOfToday, $lte: endOfToday }
  });
  
  // Today's metrics to include in the response
  const todaySales = todayReport?.netSales || 0;
  const todayOverShort = todayReport?.overShortAmount || 0;

  // Get miscellaneous income
  const miscIncomes = await BusinessMiscTransaction.find({
    businessUser: userId,
    type: 'income',
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });
  ////console.log('Miscellaneous incomes:', miscIncomes);

  //get miscellaneous expenses
  const miscExpenses = await BusinessMiscTransaction.find({
    businessUser: userId,
    type: 'expense',
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });
  ////console.log('Miscellaneous expenses:', miscExpenses);
  

  // Calculate monthly sales
  const paidInvoicesTotal = paidInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const dailyReportSales = dailyReports.reduce((sum, report) => sum + report.netSales, 0);
  const miscIncome = miscIncomes.reduce((sum, income) => sum + income.amount, 0);
  const monthlySales = paidInvoicesTotal + dailyReportSales + miscIncome;
  
  // Calculate total expenses
  const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  // Debug each bill to see payments structure
  bills.forEach(bill => {
    if (['PAID', 'PARTIALLY_PAID'].includes(bill.status)) {
      ////console.log(`Bill ${bill.title} (${bill.status}): Amount: ${bill.amount}, Payments:`,
        bill.payments ? bill.payments.map(p => p.amount) : 'No payments';
    }
  }
);
  
  const billsTotal = bills.reduce((sum, bill) => {
    // Only include paid or partially paid bills
    if (['PAID', 'PARTIALLY_PAID'].includes(bill.status)) {
      // Calculate the total amount paid
      const paidAmount = Array.isArray(bill.payments) && bill.payments.length > 0 ?
        bill.payments.reduce((pSum, payment) => pSum + (payment.amount || 0), 0) : 0;
      
      // For partially paid bills, use the paid amount; for fully paid bills, use the bill amount if no payments
      const amountToAdd = bill.status === 'PARTIALLY_PAID' ? paidAmount : (paidAmount > 0 ? paidAmount : bill.amount);
      ////console.log(`Adding ${amountToAdd} to total for bill ${bill.title}`);
      return sum + amountToAdd;
    }
    return sum;
  }, 0);
  ////console.log('Bills total:', billsTotal);
  const miscExpense = miscExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalExpenses = expensesTotal + billsTotal + miscExpense;
  
  // Calculate paid invoices metrics
  const paidInvoicesCount = paidInvoices.length;
  const paidInvoicesAmount = paidInvoicesTotal;
  
  // Calculate pending invoices metrics
  const pendingInvoicesCount = pendingInvoices.length;
  const pendingInvoicesAmount = pendingInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  
  // We'll always show invoice data even if counts are zero
  
  // Calculate month-over-month growth by comparing with previous month's data
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const startOfPrevMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
  const endOfPrevMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);
  
  // Get previous month's paid invoices
  const prevMonthPaidInvoices = await BusinessInvoice.find({
    userId: userId,
    status: 'paid',
    issueDate: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
  });
  
  // Get previous month's daily reports
  const prevMonthDailyReports = await BusinessDailyReport.find({
    businessUser: userId,
    date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
  });

  // Calculate previous month's sales
  const prevPaidInvoicesTotal = prevMonthPaidInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const prevDailyReportSales = prevMonthDailyReports.reduce((sum, report) => sum + report.netSales, 0);
  const prevMiscIncome = prevMonthDailyReports.reduce((sum, report) => sum + report.miscIncome, 0);
  const prevMonthlySales = prevPaidInvoicesTotal + prevDailyReportSales + prevMiscIncome;
  
  // Calculate growth percentage
  let monthOverMonthGrowth = 0;
  if (prevMonthlySales > 0) {
    monthOverMonthGrowth = ((monthlySales - prevMonthlySales) / prevMonthlySales) * 100;
  } else if (monthlySales > 0) {
    // If previous month was zero but current month has sales, show 100% growth
    monthOverMonthGrowth = 100;
  }
  
  // Round to 1 decimal place
  monthOverMonthGrowth = Math.round(monthOverMonthGrowth * 10) / 10;
  
  // Simplified response with only essential metrics
  const analyticsData = {
    currentMonth: {
      netSales: monthlySales,
      totalExpenses: totalExpenses,
      monthOverMonthGrowth: monthOverMonthGrowth,
    },
    invoices: {
      pending: pendingInvoicesCount,
      totalOutstanding: pendingInvoicesAmount,
      paid: paidInvoicesCount,
      totalPaid: paidInvoicesAmount
    },
    today: {
      sales: todaySales,
      overShort: todayOverShort,
    },
    dailyReportCount: dailyReports.length,
    thisMonth: {
      year: today.getFullYear(),
      month: today.getMonth() + 1 // JavaScript months are 0-indexed
    },
    userId: userId,
  };
 //console.log('Analytics data:', analyticsData);
  res.status(200).json({
    status: 'success',
    data: analyticsData
  });
});

/**
 * Get analytics tab detailed data
 * Provides comprehensive data for the analytics tab:
 * - Cash flow overview
 * - Expense breakdown by category
 * - Income sources breakdown
 * - Weekly sales report with over/short
 */
exports.getAnalyticsTabData = catchAsync(async (req, res) => {
  const userId = req.businessUser?.id || req.user?.id;
  const { period = '6m' } = req.query; // Default to 6 months
  
  // Calculate date range based on period
  const today = new Date();
  let startDate;
  switch(period) {
    case '1m':
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      break;
    case '3m':
      startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      break;
    case '1y':
      startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      break;
    case '6m':
    default:
      startDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
  }
  
  // Generate month labels and store the reference months for index calculation
  const months = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Create an array of reference dates for proper month mapping
  const referenceMonths = [];
  let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1); // Start at beginning of month
  
  while (currentDate <= today) {
    months.push(monthNames[currentDate.getMonth()]);
    referenceMonths.push(new Date(currentDate)); // Store reference date for each month 
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  //console.log('Months array:', months);
  //console.log('Period months:', months.map((name, i) => `${i+1}. ${name} ${referenceMonths[i].getFullYear()}`));





  
  
  // Get data for specified period
  // 1. Income (paid invoices + daily reports + misc income)
  // Get miscellaneous income transactions
  const miscIncomes = await BusinessMiscTransaction.find({
    businessUser: userId,
    type: 'income',
    date: { $gte: startDate, $lte: today },
  });
 // console.log('Miscellaneous income:', miscIncomes);

  // Get miscellaneous expense transactions
  const miscExpenses = await BusinessMiscTransaction.find({
    businessUser: userId,
    type: 'expense',
    date: { $gte: startDate, $lte: today },
  });
  //console.log('Miscellaneous expense:', miscExpenses);
  
  // Calculate last day of the current month for proper date ranges
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const paidInvoices = await BusinessInvoice.find({
    userId:userId,
    status: 'paid',
    issueDate: { $gte: startDate, $lte: endOfMonth }
  });
  //console.log('Paid invoices:', paidInvoices);
  
  // Group invoices by month
  const invoicesByMonth = Array(months.length).fill(0);
  paidInvoices.forEach(invoice => {
    // For paid invoices, use issue date for when the income was recognized
    const invoiceDate = new Date(invoice.issueDate);
    
    // Find the correct month index by comparing to reference months
    const monthIndex = referenceMonths.findIndex(refDate => {
      return invoiceDate.getFullYear() === refDate.getFullYear() && 
             invoiceDate.getMonth() === refDate.getMonth();
    });
    
    if (monthIndex >= 0 && monthIndex < invoicesByMonth.length) {
      invoicesByMonth[monthIndex] += invoice.total;
      //console.log(`Invoice ${invoice.invoiceNumber} (${invoice.total}) added to period month ${monthIndex+1} of ${months.length}: ${months[monthIndex]} ${invoiceDate.getFullYear()}`);
    } else {
      //console.log(`Invoice ${invoice.invoiceNumber} outside of range: ${invoiceDate.toISOString()}`);
    }
  });

  //console.log('Invoices by month:', invoicesByMonth);





  // 2. Daily reports grouped by month
  const dailyReports = await BusinessDailyReport.find({
    businessUser: userId,
    date: { $gte: startDate, $lte: today },
  });
  
  //console.log(`Found ${dailyReports.length} daily reports between ${startDate.toISOString()} and ${today.toISOString()}`);

  //console.log('Daily reports:', dailyReports);
  
  // Group daily reports by month
  const salesByMonth = Array(months.length).fill(0);
  const expensesByMonth = Array(months.length).fill(0);
  
  dailyReports.forEach(report => {
    const reportDate = new Date(report.date);
    
    // Find the correct month index by comparing to reference months
    const monthIndex = referenceMonths.findIndex(refDate => {
      return reportDate.getFullYear() === refDate.getFullYear() && 
             reportDate.getMonth() === refDate.getMonth();
    });
    
    if (monthIndex >= 0 && monthIndex < salesByMonth.length) {
      salesByMonth[monthIndex] += report.netSales || 0;
      //console.log(`Daily report ${report._id} (${report.netSales}) added to period month ${monthIndex+1} of ${months.length}: ${months[monthIndex]} ${reportDate.getFullYear()}`);
    } else {
      //console.log(`Daily report outside of range: ${reportDate.toISOString()}`);
    }
  });

 // console.log('Sales by month:', salesByMonth);
  



  
  // 3. Expenses grouped by month
  const expenses = await Expense.find({
    user:userId,
    isBusinessExpense: true,
    date: { $gte: startDate, $lte: today },
  });
  
  expenses.forEach(expense => {
    const expenseDate = new Date(expense.date);
    const monthIndex =
      (expenseDate.getMonth() - startDate.getMonth()) +
      (12 * (expenseDate.getFullYear() - startDate.getFullYear()));
    if (monthIndex >= 0 && monthIndex < expensesByMonth.length) {
      expensesByMonth[monthIndex] += expense.amount;
    }
  });
  
 // console.log('Expenses by month:', expensesByMonth);
  
  // Add paid bills to the monthly expenses
  const paidBills = await BusinessBill.find({
    user: userId,
    status: 'paid',
    dueDate: { $gte: startDate, $lte: today }
  });
  
  //console.log(`Found ${paidBills.length} paid bills`);
  
  paidBills.forEach(bill => {
    const billDate = new Date(bill.dueDate); // Use due date for expenses
    
    // Find the correct month index by comparing to reference months
    const monthIndex = referenceMonths.findIndex(refDate => {
      return billDate.getFullYear() === refDate.getFullYear() && 
             billDate.getMonth() === refDate.getMonth();
    });
    
    if (monthIndex >= 0 && monthIndex < expensesByMonth.length) {
      expensesByMonth[monthIndex] += bill.amount || 0;
      //console.log(`Bill (${bill.amount}) added to period month ${monthIndex+1} of ${months.length}: ${months[monthIndex]} ${billDate.getFullYear()}`);
    }
  });
 // console.log('Expenses by month:', expensesByMonth);


  
  // 4. Calculate total income and expense by month
  const incomeByMonth = invoicesByMonth.map((invoiceAmount, index) => 
    invoiceAmount + salesByMonth[index]
  );
 // console.log('Income by month:', incomeByMonth);
  





  
  // 5. Calculate expense breakdown by category
  const expenseCategories = {};
  
  expenses.forEach(expense => {
    if (!expenseCategories[expense.category]) {
      expenseCategories[expense.category] = 0;
    }
    expenseCategories[expense.category] += expense.amount;
  });
  
  // Get bills to add to expense breakdown
  const bills = await BusinessBill.find({
    user: userId,
    dueDate: { $gte: startDate, $lte: today },
  });
  //console.log('Bills:', bills);
  
  bills.forEach(bill => {
    const category = bill.category || 'OTHER';
    if (!expenseCategories[category]) {
      expenseCategories[category] = 0;
    }
    
    // If bill is paid, add the full amount to expenses
    if (bill.status === 'PAID') {
      expenseCategories[category] += bill.amount || 0;
    }
  });
  
  // Add misc expenses from daily reports
  if (dailyReports.some(report => report.miscExpenses > 0)) {
    expenseCategories.OTHER = (expenseCategories.OTHER || 0) + dailyReports.reduce((sum, report) => sum + report.miscExpenses, 0);
  }
  
  // Add miscellaneous expense transactions to OTHER category
  expenseCategories.OTHER = (expenseCategories.OTHER || 0) + miscExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  // Calculate expense breakdown percentages
  const totalExpenses = Object.values(expenseCategories).reduce((sum, amount) => sum + amount, 0);
  const expenseBreakdown = Object.entries(expenseCategories).map(([category, amount]) => ({
    category: formatCategory(category),
    amount,
    percent: Math.round((amount / totalExpenses) * 100) || 0
  }));
 // console.log('Expense breakdown:', expenseBreakdown);




  
  // 6. Calculate income sources breakdown
  const incomeSources = {
    'Invoices': paidInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
    'Daily Operations': dailyReports.reduce((sum, report) => sum + report.netSales + report.miscIncome, 0),
    'Misc Transactions': miscIncomes.reduce((sum, income) => sum + income.amount, 0)
  };
  
  const totalIncome = Object.values(incomeSources).reduce((sum, amount) => sum + amount, 0);
  const incomeBreakdown = Object.entries(incomeSources).map(([source, amount]) => ({
    source,
    amount,
    percent: Math.round((amount / totalIncome) * 100) || 0
  }));







  {/* WEEKLY REPORTS */}
  
  // 7. Get weekly sales report data (for the last 7 days)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6); // Get last 7 days including today
  
  // Set time to beginning of day for weekStart and end of day for today
  weekStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(today);
  dayEnd.setHours(23, 59, 59, 999);
  
 // console.log(`Searching for reports between ${weekStart.toISOString()} and ${dayEnd.toISOString()}`);
  
  // Get all reports without date filtering first
  const allReports = await BusinessDailyReport.find({
    businessUser: userId
  }).sort({ date: 1 });
  
  //console.log(`Found ${allReports.length} total reports for this user`);
  
  // Manually filter for reports within our week
  const weeklyReports = allReports.filter(report => {
    const reportDate = new Date(report.date);
    return reportDate >= weekStart && reportDate <= dayEnd;
  });
  
 // console.log(`Found ${weeklyReports.length} weekly reports between ${weekStart.toISOString()} and ${today.toISOString()}`);
  
  // Create daily data for the past week - using a specific ordered day pattern the client prefers
  // Order is intentionally Thu, Fri, Sat, Sun, Mon, Tue, Wed (not alphabetical)
  const dayNames = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
  
  // Initialize arrays with zeros - we'll only use actual data
  const weeklySalesData = {
    labels: dayNames,
    sales: new Array(7).fill(0),
    overShort: new Array(7).fill(0)
  };
  
  // Process each report and assign to the correct day in our array
 // console.log(`Processing ${weeklyReports.length} reports for weekly chart data`);
  
  // Map each report to the appropriate day
  weeklyReports.forEach(report => {
    const reportDate = new Date(report.date);
    //console.log(`Processing report date: ${reportDate.toISOString()}`);

    // Create a lookup object to map the JS day number (0-6) to our custom ordered days
    // JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    // Our array: Thu, Fri, Sat, Sun, Mon, Tue, Wed
    const dayLookup = {
      0: 'Sun', // Sunday
      1: 'Mon', // Monday
      2: 'Tue', // Tuesday
      3: 'Wed', // Wednesday
      4: 'Thu', // Thursday
      5: 'Fri', // Friday
      6: 'Sat', // Saturday
    };
    
    // Get both UTC and local day to handle potential timezone issues
    const utcDay = reportDate.getUTCDay();
    const localDay = reportDate.getDay();
    
    // Print both for debugging
    //console.log(`UTC day: ${utcDay}, Local day: ${localDay}`);
    
    // Use the local day for US timezone
    const dayName = dayLookup[localDay];
    //console.log(`Mapped to day name: ${dayName}`);
    const dayIndex = dayNames.indexOf(dayName);

    if (dayIndex !== -1) {
      weeklySalesData.sales[dayIndex] = report.netSales || 0;
      weeklySalesData.overShort[dayIndex] = report.overShortAmount || 0;
      //console.log(`Applied report for ${dayName}: sales=${report.netSales}, overShort=${report.overShortAmount}`);
    }
  });

  //console.log('Final weekly sales data:', weeklySalesData);

  // Prepare final response
  const analyticsData = {
    cashFlowOverview: {
      labels: months,
      income: incomeByMonth,
      expenses: expensesByMonth,
    },
    expenseBreakdown,
    incomeBreakdown,
    weeklyNetSales: weeklySalesData,
    totalIncome: totalIncome,
    totalExpenses: totalExpenses,
    netProfit: totalIncome - totalExpenses,
  };

 // console.log('Analytics data:', analyticsData);


  res.status(200).json({
    status: 'success',
    data: analyticsData
  });
});

/**
 * Format category name for display (convert SNAKE_CASE to Title Case)
 */
function formatCategory(category) {
  if (!category) return 'Other';
  
  // Handle specific categories that shouldn't be split by underscore
  if (category === 'RENT') return 'Rent';
  if (category === 'UTILITIES') return 'Utilities';
  if (category === 'OTHER') return 'Other';
  
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get recent business activities
 * Combines the 5 most recent activities across bills, invoices, expenses, and daily reports
 * Returns them in chronological order (newest first)
 */
exports.getRecentActivity = catchAsync(async (req, res) => {
  const userId = req.businessUser?.id || req.user?.id;
  
  // Define a cutoff date (e.g., past 30 days) to limit search scope
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  
  // Get recent bills (both new and paid)
  const recentBills = await BusinessBill.find({
    user: userId,
    // Find bills that were created or updated recently
    $or: [
      { createdAt: { $gte: cutoffDate } },
      { updatedAt: { $gte: cutoffDate } },
    ],
  })
  .sort({ updatedAt: -1 })
  .limit(5);
  
  // Get recent invoices (new, sent, and paid)
  const recentInvoices = await BusinessInvoice.find({
    userId: userId,
    $or: [
      { createdAt: { $gte: cutoffDate } },
      { updatedAt: { $gte: cutoffDate } },
    ],
  })
  .sort({ updatedAt: -1 })
  .limit(5);
  
  // Get recent expenses
  const recentExpenses = await Expense.find({
    user: userId,
    isBusinessExpense: true,
    createdAt: { $gte: cutoffDate },
  })
  .sort({ createdAt: -1 })
  .limit(5);
  
  // Get recent daily reports
  const recentReports = await BusinessDailyReport.find({
    businessUser: userId,
    createdAt: { $gte: cutoffDate },
  })
  .sort({ createdAt: -1 })
  .limit(5);
  
  // Get recent misc transactions
  const recentMiscTransactions = await BusinessMiscTransaction.find({
    businessUser: userId,
    createdAt: { $gte: cutoffDate },
  })
  .sort({ createdAt: -1 })
  .limit(5);
  
  // Transform bills into activity format
  const billActivities = recentBills.map(bill => ({
    id: bill._id,
    type: 'bill',
    title: `${bill.vendor || 'Vendor'} Bill`,
    description: `${bill.status === 'PAID' ? 'Paid' : 'Updated'} bill for ${bill.vendor || 'vendor'}`,
    amount: bill.amount,
    date: bill.updatedAt || bill.createdAt,
    status: bill.status,
    link: `/business/bills/${bill._id}`,
  }));
  
  // Transform invoices into activity format
  const invoiceActivities = recentInvoices.map(invoice => ({
    id: invoice._id,
    type: 'invoice',
    title: `${invoice.client.name || 'Client Invoice'}`,
    description: invoice.status === 'paid' ? `Payment received from ${invoice.clientName || 'client'}` : `Updated invoice for ${invoice.clientName || 'client'}`,
    amount: invoice.total,
    date: invoice.updatedAt || invoice.createdAt,
    status: invoice.status,
    link: `/business/invoices/${invoice._id}`,
  }));
  
  // Transform expenses into activity format
  const expenseActivities = recentExpenses.map(expense => ({
    id: expense._id,
    type: 'expense',
    title: expense.description || (expense.title ? expense.title : 'Business Expense'),
    description: 'Expense',
    amount: expense.amount,
    date: expense.createdAt,
    category: 'Expense', // Always show 'Expense' as the category
    link: `/business/expenses/${expense._id}`,
  }));
  
  // Transform daily reports into activity format
  const reportActivities = recentReports.map(report => ({
    id: report._id,
    type: 'dailyReport',
    title: new Date(report.date || report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' Daily Report',
    description: `Submitted daily report with ${report.netSales > 0 ? '$' + report.netSales.toFixed(2) + ' in sales' : 'sales data'}`,
    amount: report.netSales,
    date: report.createdAt,
    link: `/business/daily-reports/${report._id}`,
  }));
  
  // Transform misc transactions into activity format
  const miscActivities = recentMiscTransactions.map(transaction => ({
    id: transaction._id,
    type: 'miscTransaction',
    title: `${transaction.type === 'income' ? 'Income' : 'Expense'}: ${transaction.description || transaction.category || 'Miscellaneous'}`,
    description: `Recorded ${transaction.type} transaction${transaction.notes ? ': ' + transaction.notes : ''}`,
    amount: transaction.amount,
    date: transaction.createdAt,
    transactionType: transaction.type,
    link: `/business/transactions/${transaction._id}`,
  }));
  
  // Combine all activities
  const allActivities = [
    ...billActivities,
    ...invoiceActivities,
    ...expenseActivities,
    ...reportActivities,
    ...miscActivities,
  ];
  
  // Sort by date (newest first) and limit to 5
  const recentActivities = allActivities
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  
  res.status(200).json({
    status: 'success',
    results: recentActivities.length,
    data: recentActivities,
  });
});


