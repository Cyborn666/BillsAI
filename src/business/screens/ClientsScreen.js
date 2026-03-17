import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../../styles/theme';
import { getBusinessClients, deleteBusinessClient } from '../services/businessApiService';

const ClientsScreen = ({ navigation }) => {
  const [clients, setClients] = useState([]);
  const [enhancedClients, setEnhancedClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('business'); // 'business', 'name', or 'recent'

  // Process incoming client data - if data is already processed by backend,
  // just apply sorting and filtering
  const enrichClientData = useCallback((clientsData) => {
    if (!clientsData || !clientsData.length) return;
    
    // Check if this data is already enriched from our backend
    const hasEnrichment = clientsData.length > 0 && 
                         ('totalAmount' in clientsData[0] || 'paidAmount' in clientsData[0]);
    
    let enrichedClients = clientsData;
    
    // If data is not already enriched by backend (should not happen with our API updates)
    if (!hasEnrichment) {
      //console.log('Client data not pre-processed by backend - applying client-side enrichment');
      enrichedClients = clientsData.map(client => ({
        ...client,
        totalAmount: client.totalReceived || 0,
        paidAmount: client.totalReceived || 0,
        pendingAmount: 0,
        invoiceCount: 0
      }));
    }
    
    // Apply sorting
    if (sortBy === 'name') {
      enrichedClients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'recent') {
      // Sort by most recent activity (createdAt or updatedAt)
      enrichedClients.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB - dateA; // Most recent first
      });
    } else if (sortBy === 'business') {
      // Sort by total business amount (descending)
      enrichedClients.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
    } else {
      // Default: sort by business name
      enrichedClients.sort((a, b) => (a.businessName || '').localeCompare(b.businessName || ''));
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      enrichedClients = enrichedClients.filter(client => {
        return (
          (client.name && client.name.toLowerCase().includes(query)) ||
          (client.businessName && client.businessName.toLowerCase().includes(query)) ||
          (client.email && client.email.toLowerCase().includes(query))
        );
      });
    }
    
    setEnhancedClients(enrichedClients);
  }, [searchQuery, sortBy]);
  
  const fetchClientsAndInvoices = useCallback(async () => {
    try {
      setLoading(true);
      // With our updated backend, we now get pre-processed clients with all metrics
      const clientsData = await getBusinessClients();
      
      // Update the state with the received data
      setClients(clientsData);
      
      // Process client data for display
      enrichClientData(clientsData);
    } catch (err) {
      Alert.alert('Error', 'Failed to load client data');
      //console.error('Error loading client data:', err);
    } finally {
      setLoading(false);
    }
  }, [enrichClientData]);
  
  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchClientsAndInvoices();
      return () => {
        // Optional cleanup
      };
    }, [fetchClientsAndInvoices])
  );

  useEffect(() => {
    if (clients.length > 0) {
      enrichClientData(clients);
    }
  }, [searchQuery, clients, sortBy, enrichClientData]);

  const handleDelete = async (clientId) => {
    Alert.alert(
      'Delete Client',
      'Are you sure you want to delete this client?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBusinessClient(clientId);
              fetchClientsAndInvoices();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete client');
            }
          },
        },
      ]
    );
  };
  
  const handleViewClient = (client) => {
    // You could navigate to a detailed client view screen
    // For now, just show quick summary
    Alert.alert(
      `${getClientField(client, 'name', 'Client')}`,
      `Total Business: ${formatCurrency(getClientField(client, 'totalAmount', 0))}\n` +
      `Paid: ${formatCurrency(getClientField(client, 'paidAmount', 0))}\n` +
      `Pending: ${formatCurrency(getClientField(client, 'pendingAmount', 0))}\n` +
      `Invoices: ${getClientField(client, 'invoiceCount', 0)}\n` +
      `Email: ${getClientField(client, 'email', 'Not available')}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };
  
  const handleChangeSortOrder = (order) => {
    setSortBy(order);
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const renderClient = ({ item }) => (
    <TouchableOpacity 
      style={styles.clientCard}
      onPress={() => handleViewClient(item)}
      activeOpacity={0.7}
    >
      <View style={styles.clientAvatarContainer}>
        <View style={[styles.clientAvatar, { backgroundColor: getClientColor(item.name) }]}>
          <Text style={styles.clientAvatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : "C"}
          </Text>
        </View>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName} numberOfLines={1}>{getClientField(item, 'name', 'Unnamed Client')}</Text>
        <Text style={styles.clientEmail} numberOfLines={1}>{getClientField(item, 'email', 'No email')}</Text>
        
        <View style={styles.clientMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{formatCurrency(getClientField(item, 'totalAmount', 0))}</Text>
            <Text style={styles.metricLabel}>Total</Text>
          </View>
          
          <View style={styles.metricDivider} />
          
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: theme.colors.success }]}>
              {formatCurrency(getClientField(item, 'paidAmount', 0))}
            </Text>
            <Text style={styles.metricLabel}>Paid</Text>
          </View>
          
          <View style={styles.metricDivider} />
          
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: getClientField(item, 'pendingAmount', 0) > 0 ? theme.colors.warning : theme.colors.gray500 }]}>
              {formatCurrency(getClientField(item, 'pendingAmount', 0))}
            </Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.clientActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDelete(item.id)}
        >
          <MaterialIcons name="delete-outline" size={22} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  // Generate a consistent color based on client name
  const getClientColor = (name) => {
    if (!name) return theme.colors.primary;
    
    const colors = [
      '#4CAF50', '#2196F3', '#9C27B0', '#F44336', '#FF9800',
      '#009688', '#673AB7', '#3F51B5', '#E91E63', '#607D8B'
    ];
    
    // Simple hash function for name
    const hashCode = name.split('').reduce(
      (hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0
    );
    
    return colors[Math.abs(hashCode) % colors.length];
  };
  
  // Safe getter for client fields that might be undefined
  const getClientField = (client, field, defaultValue = '') => {
    if (!client) return defaultValue;
    return client[field] !== undefined ? client[field] : defaultValue;
  };
  
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color={theme.colors.gray500} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.gray400}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={24} color={theme.colors.gray500} />
          </TouchableOpacity>
        ) : null}
      </View>
      
     {/* <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortButtons}
      >
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'business' && styles.sortButtonActive]}
          onPress={() => handleChangeSortOrder('business')}
        >
          <MaterialIcons 
            name="trending-down" 
            size={16} 
            color={sortBy === 'business' ? theme.colors.white : theme.colors.primary} 
          />
          <Text style={[styles.sortButtonText, sortBy === 'business' && styles.sortButtonTextActive]}>
            By Business
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
          onPress={() => handleChangeSortOrder('name')}
        >
          <MaterialIcons 
            name="sort-by-alpha" 
            size={16} 
            color={sortBy === 'name' ? theme.colors.white : theme.colors.primary} 
          />
          <Text style={[styles.sortButtonText, sortBy === 'name' && styles.sortButtonTextActive]}>
            By Name
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
          onPress={() => handleChangeSortOrder('recent')}
        >
          <MaterialIcons 
            name="access-time" 
            size={16} 
            color={sortBy === 'recent' ? theme.colors.white : theme.colors.primary} 
          />
          <Text style={[styles.sortButtonText, sortBy === 'recent' && styles.sortButtonTextActive]}>
            Recent Activity
          </Text>
        </TouchableOpacity>
      </ScrollView> */}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.backButton}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color='#000000' />
          </TouchableOpacity>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Clients</Text>
          <Text style={styles.subtitle}>
            {enhancedClients.length} {enhancedClients.length === 1 ? 'client' : 'clients'}
          </Text>
        </View>
        <View style={{width: 40}} />
      </View>
      
      {renderHeader()}
      
      <FlatList
        data={enhancedClients}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="account-group-outline" 
              size={64} 
              color={theme.colors.gray300} 
            />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No matching clients found.' : 'No clients yet.'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term.' : 'Add clients to manage your business relationships.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff'
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    width: 40, // Fixed width to balance layout
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#000000' 
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.gray600,
    marginTop: 2,

  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.gray100,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: theme.colors.gray900,
  },
  sortButtons: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.gray100,
    borderRadius: 16,
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  sortButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  sortButtonTextActive: {
    color: theme.colors.white,
  },
  clientCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    marginHorizontal: 16, 
    marginVertical: 6, 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1,
    borderColor: theme.colors.gray200,
  },
  clientAvatarContainer: {
    marginRight: 12,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  clientInfo: { 
    flex: 1, 
  },
  clientName: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: theme.colors.gray900,
  },
  clientEmail: { 
    fontSize: 14, 
    color: theme.colors.gray600, 
    marginBottom: 8,
  },
  clientMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metricItem: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.gray900,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.gray500,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.gray300,
    marginHorizontal: 4,
  },
  clientActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: { 
    textAlign: 'center', 
    marginTop: 16, 
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.gray500 
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.gray400,
  },
  listContent: { 
    paddingBottom: 32,
    flexGrow: 1,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
});

export default ClientsScreen;
