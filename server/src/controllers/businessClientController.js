const BusinessClient = require('../models/businessClientModel');
const BusinessInvoice = require('../models/businessInvoiceModel');

// Get all clients (manual + from invoices) with comprehensive business metrics
exports.getBusinessClients = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Manual clients
    const manualClients = await BusinessClient.find({ userId });
    
    // All invoices for this user
    const invoices = await BusinessInvoice.find({ userId:userId })
      .sort({ issueDate: -1 }); // Sort by most recent first for tracking latest activity
    
    // Aggregate clients from invoices
    const invoiceClients = invoices.map(inv => inv.client).filter(Boolean);
    
    // Create a map to track clients by email or name for faster lookups
    const allClientsMap = new Map();
    // Also create a map to track clients by name (lowercase) for merging
    const clientsByName = new Map();
    
    //console.log(`Processing ${manualClients.length} manual clients and ${invoices.length} invoices for client calculations`);
    
    // First, initialize clients from manual entries
    manualClients.forEach(client => {
      // Use email as primary key, fallback to name
      const key = client.email || client.name;
      if (!key) return; // Skip if no valid key
      
      const clientData = {
        id: client._id,
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        source: 'manual',
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        invoiceCount: 0,
        lastInvoiceDate: null,
        recentActivity: client.updatedAt || client.createdAt
      };
      
      allClientsMap.set(key, clientData);
      
      // Also index by name for later merging with invoices
      if (client.name) {
        clientsByName.set(client.name.toLowerCase(), key);
      }
    });
    
    // Add clients from invoices if not already in map
    invoiceClients.forEach(c => {
      if (!c || !c.name) return; // Skip invalid clients
      
      const key = c.email || c.name;
      if (!key) return; // Skip if no identifier
      
      if (!allClientsMap.has(key)) {
        allClientsMap.set(key, {
          id: c.id || `inv-client-${key.replace(/[^a-zA-Z0-9]/g, '')}`,
          name: c.name,
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          source: 'invoice',
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          invoiceCount: 0,
          lastInvoiceDate: null,
          recentActivity: null
        });
      }
    });
    
    // Debug log for all invoices
    //console.log(`Processing ${invoices.length} invoices for client calculations`);
    
    // Process all invoices to calculate metrics for each client
    invoices.forEach(inv => {
      const client = inv.client;
      if (!client || !client.name) return; // Skip invalid
      
      // First check if we already have this client by name in our clientsByName map
      let key = null;
      if (client.name && clientsByName.has(client.name.toLowerCase())) {
        // Use the existing client key from our map
        key = clientsByName.get(client.name.toLowerCase());
        //console.log(`Matching invoice client ${client.name} to existing client with key ${key}`);
      } else {
        // Generate a unique key for a new client
        key = client.id || client.name;
        
        // Add this client to our maps if it doesn't exist
        if (!allClientsMap.has(key)) {
          //console.log(`Adding new client from invoice: ${client.name}`);
          const clientData = {
            id: client.id || `inv-client-${key.replace(/[^a-zA-Z0-9]/g, '')}`,
            name: client.name,
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || '',
            source: 'invoice',
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
            invoiceCount: 0,
            lastInvoiceDate: null,
            recentActivity: null
          };
          
          allClientsMap.set(key, clientData);
          if (client.name) {
            clientsByName.set(client.name.toLowerCase(), key);
          }
        }
      }
      
      const clientData = allClientsMap.get(key);
      
      // Verify we're getting the correct amount from the invoice
      // Check multiple fields to ensure we get the right value
      let amount = 0;
      
      // For existing invoices, total may be stored in different field names
      // Try all possible field names in order of likelihood
      if (typeof inv.total === 'number') {
        amount = inv.total;
      } else if (typeof inv.totalAmount === 'number') {
        amount = inv.totalAmount;
      } else if (typeof inv.amount === 'number') {
        amount = inv.amount;
      } else if (typeof inv.subtotal === 'number') {
        // If no total but we have subtotal, use that as fallback
        amount = inv.subtotal;
      }
      
      // Convert string amounts to numbers if needed
      if (typeof amount === 'string') {
        amount = parseFloat(amount) || 0;
      }
      
      // Debug log for significant amounts
      if (amount > 1000) {
        //console.log(`High value invoice detected - Client: ${client.name}, Invoice: ${inv._id}, Amount: ${amount}`);
      }
      
      // Update metrics
      clientData.totalAmount += amount;
      clientData.invoiceCount += 1;
      
      // Track paid vs pending amounts - check for case insensitive status values
      const invStatus = (inv.status || '').toUpperCase();
      if (invStatus === 'PAID' || invStatus === 'FULFILLED' || invStatus === 'COMPLETED') {
        clientData.paidAmount += amount;
      } else {
        clientData.pendingAmount += amount;
      }
      
      // For backward compatibility
      clientData.totalReceived = clientData.paidAmount;
      
      // Update most recent activity
      const invDate = new Date(inv.issueDate || inv.createdAt || Date.now());
      if (!clientData.lastInvoiceDate || invDate > new Date(clientData.lastInvoiceDate)) {
        clientData.lastInvoiceDate = invDate;
        clientData.recentActivity = invDate;
      }
    });
    
    // Log invoice details to debug client mapping
    //console.log('All invoice clients:');
    invoices.forEach(inv => {
      if (inv.client) {
        //console.log(`Invoice ID: ${inv._id}, Client: ${inv.client.name}, Amount: ${inv.total}, Status: ${inv.status}`);
      }
    });
    
    // Remove any empty clients that might have been created but have no invoice data
    for (const [key, client] of allClientsMap.entries()) {
      if (client.invoiceCount === 0 && client.source !== 'manual') {
        //console.log(`Removing empty client: ${client.name}`);
        allClientsMap.delete(key);
      }
    }
    
    // Final sanity check to ensure reasonable values
    for (const [key, client] of allClientsMap.entries()) {
      // Debug log all client calculations
      //console.log(`Client ${client.name}: Total=${client.totalAmount}, Paid=${client.paidAmount}, Pending=${client.pendingAmount}, Invoices=${client.invoiceCount}`);
      
      // Check for unreasonable values and correct if needed
      if (client.totalAmount !== client.paidAmount + client.pendingAmount) {
        //console.log(`Fixing inconsistent amounts for client ${client.name}`);
        client.totalAmount = client.paidAmount + client.pendingAmount;
      }
    }
    
    // Convert to array and sort by total amount (highest first)
    const clientsArray = Array.from(allClientsMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);
      
    res.json(clientsArray);
  } catch (err) {
    //console.error('Error fetching business clients:', err);
    res.status(500).json({ error: 'Failed to get clients' });
  }
};

// Add a manual client
exports.addBusinessClient = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, address, phone } = req.body;
    const exists = await BusinessClient.findOne({ userId, email });
    if (exists) return res.status(400).json({ error: 'Client already exists' });
    const client = await BusinessClient.create({ userId, name, email, address, phone });
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add client' });
  }
};

// Delete a manual client
exports.deleteBusinessClient = async (req, res) => {
  try {
    const userId = req.user.id;
    const { clientId } = req.params;
    await BusinessClient.deleteOne({ _id: clientId, userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
};
