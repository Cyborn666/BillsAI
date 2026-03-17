/**
 * Invoice Generator Utility
 * Generates PDF invoices using HTML templates
 */
import RNFS from 'react-native-fs';
import { format } from 'date-fns';
import RNHTMLtoPDF from 'react-native-html-to-pdf';

/**
 * Creates an HTML template for the invoice
 * @param {Object} invoiceData - Invoice data to populate the template
 * @returns {string} HTML template as string
 */
const createInvoiceHTML = (invoiceData, itemsTable, subtotal, discount, taxAmount, total) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice #${invoiceData.invoiceNumber || '00001'}</title>
      <style>
        html, body {
          font-family: 'Helvetica Neue', 'Helvetica', Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
          background-color: #ffffff;
          height: 100%;
          width: 100%;
        }
        .invoice-box {
          max-width: 800px;
          padding: 20px;
          border: none;
          box-shadow: none;
          font-size: 16px;
          line-height: 24px;
          background-color: white;
          border-radius: 0;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          align-items: center;
        }
        .logo-title-container {
          display: flex;
          align-items: flex-start;
        }
        .logo-img {
          width: 120px;
          height: 60px;
          margin-right: 5px;
          margin-left: -15px;
        }
        .app-title {
          font-size: 28px;
          font-weight: bold;
          color: #1D3468; /* Mid-point between black and #3867D6 */
          letter-spacing: normal;
        }
        .invoice-details {
          text-align: right;
        }
        .invoice-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .row {
          display: flex;
          margin-bottom: 30px;
        }
        .col {
          flex: 1;
          padding: 10px;
        }
        .label {
          font-weight: bold;
          margin-bottom: 8px;
          color: #555;
          font-size: 14px;
          text-transform: uppercase;
        }
        .value {
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          padding: 12px 10px;
          background-color: #ffffff;
          border-bottom: 1px solid #f0f0f0;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }
        td {
          padding: 12px 10px;
          border-bottom: 1px solid #f0f0f0;
        }
        .total-section {
          margin-top: 20px;
          padding-top: 20px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .total-label {
          text-align: right;
        }
        .total-value {
          min-width: 100px;
          text-align: right;
          font-weight: bold;
        }
        .grand-total {
          font-size: 18px;
          font-weight: bold;
          color:rgb(0, 0, 0);
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: rgb(0, 0, 0) ;
          font-size: 14px;
          border-top: none;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="invoice-header">
          <div class="logo-title-container">
            <svg class="logo-img" width="120" height="60" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="120" height="120" rx="10" fill="black"/>
              <path d="M27.84 61.56C27.84 61.0693 27.6587 60.6 27.296 60.152C26.9333 59.6827 26.2933 59.416 25.376 59.352C24.7787 60.0773 24.0533 60.44 23.2 60.44C22.4747 60.44 21.856 60.184 21.344 59.672C20.832 59.16 20.576 58.5307 20.576 57.784C20.576 57.0373 20.832 56.408 21.344 55.896C21.856 55.384 22.4747 55.128 23.2 55.128C23.584 55.128 23.9573 55.2347 24.32 55.448C24.704 55.6613 25.0453 55.9173 25.344 56.216C25.8133 56.1947 26.176 56.12 26.432 55.992C26.688 55.864 26.8693 55.7147 26.976 55.544C27.104 55.352 27.1787 55.1387 27.2 54.904C27.2213 54.6693 27.232 54.4347 27.232 54.2V50.968C27.232 50.4347 27.0613 49.944 26.72 49.496C26.4 49.048 25.8453 48.824 25.056 48.824H18.368L18.336 69.944C18.336 70.3707 18.1333 70.7013 17.728 70.936C17.344 71.1493 16.9173 71.256 16.448 71.256C15.1893 71.256 14.56 70.744 14.56 69.72V47.512C14.56 46.744 14.752 46.232 15.136 45.976C15.5413 45.72 16.0213 45.592 16.576 45.592H25.856C26.4107 45.592 26.9973 45.6987 27.616 45.912C28.256 46.1253 28.8533 46.4133 29.408 46.776H29.376C29.9307 47.1813 30.336 47.7147 30.592 48.376C30.8693 49.0373 31.008 49.8053 31.008 50.68V54.296C31.008 55.1493 30.8267 55.8533 30.464 56.408C30.1013 56.9413 29.7173 57.368 29.312 57.688C29.5893 57.8587 29.856 58.04 30.112 58.232C30.368 58.4027 30.5813 58.5947 30.752 58.808C31.0293 59.1067 31.2427 59.4587 31.392 59.864C31.5627 60.2693 31.648 60.7493 31.648 61.304V65.88C31.648 67.6293 30.9653 68.92 29.6 69.752C28.9173 70.1787 28.2667 70.4987 27.648 70.712C27.0507 70.9253 26.4533 71.032 25.856 71.032H21.12C20.7573 71.032 20.4693 70.8827 20.256 70.584C20.064 70.2853 19.968 69.8907 19.968 69.4C19.968 68.3333 20.416 67.8 21.312 67.8H25.696C26.4853 67.8 27.04 67.576 27.36 67.128C27.68 66.68 27.84 66.1787 27.84 65.624V61.56ZM39.763 69.656C39.763 70.68 39.1763 71.192 38.003 71.192C36.8083 71.192 36.211 70.68 36.211 69.656V53.144C36.211 52.12 36.8083 51.608 38.003 51.608C39.1763 51.608 39.763 52.12 39.763 53.144V69.656ZM40.435 47.576C40.435 48.2587 40.2003 48.8347 39.731 49.304C39.2617 49.7733 38.6857 50.008 38.003 50.008C37.3203 50.008 36.7337 49.7733 36.243 49.304C35.7737 48.8347 35.539 48.2587 35.539 47.576C35.539 46.872 35.7737 46.2853 36.243 45.816C36.7337 45.3467 37.3203 45.112 38.003 45.112C38.6857 45.112 39.2617 45.3467 39.731 45.816C40.2003 46.2853 40.435 46.872 40.435 47.576ZM47.8575 69.752C47.8575 70.7547 47.2708 71.256 46.0975 71.256C44.9028 71.256 44.3055 70.7547 44.3055 69.752V46.808C44.3055 45.8053 44.9028 45.304 46.0975 45.304C47.2708 45.304 47.8575 45.8053 47.8575 46.808V69.752ZM55.92 69.752C55.92 70.7547 55.3333 71.256 54.16 71.256C52.9653 71.256 52.368 70.7547 52.368 69.752V46.808C52.368 45.8053 52.9653 45.304 54.16 45.304C55.3333 45.304 55.92 45.8053 55.92 46.808V69.752ZM70.7345 59.8C71.2678 59.8 71.8332 59.928 72.4305 60.184C73.0492 60.4187 73.6252 60.7173 74.1585 61.08H74.1265C74.6812 61.4853 75.1078 62.008 75.4065 62.648C75.7052 63.288 75.8545 64.056 75.8545 64.952V65.912C75.8545 67.6613 75.2785 68.952 74.1265 69.784C73.5718 70.2107 73.0065 70.52 72.4305 70.712C71.8545 70.904 71.2892 71 70.7345 71H65.2945C64.7398 71 64.1745 70.904 63.5985 70.712C63.0225 70.52 62.4572 70.2107 61.9025 69.784C60.7505 68.9733 60.1745 67.6827 60.1745 65.912V65.528C60.1745 64.6107 60.7612 64.1627 61.9345 64.184C63.1292 64.184 63.7265 64.632 63.7265 65.528V65.88C63.7265 66.392 63.8865 66.872 64.2065 67.32C64.5265 67.768 65.0918 67.992 65.9025 67.992H70.1265C70.9372 67.992 71.5025 67.768 71.8225 67.32C72.1425 66.872 72.3025 66.392 72.3025 65.88V64.984C72.3025 64.7067 72.2598 64.44 72.1745 64.184C72.1105 63.928 71.9932 63.704 71.8225 63.512C71.6518 63.2987 71.4278 63.128 71.1505 63C70.8732 62.872 70.5318 62.808 70.1265 62.808H65.4545C64.3665 62.808 63.2252 62.424 62.0305 61.656C60.8998 60.9307 60.3345 59.6827 60.3345 57.912V56.824C60.3345 55.9707 60.4838 55.224 60.7825 54.584C61.0812 53.9227 61.5078 53.3893 62.0625 52.984H62.0305C62.5638 52.6213 63.1292 52.3227 63.7265 52.088C64.3238 51.8533 64.8998 51.736 65.4545 51.736H70.5745C71.1292 51.736 71.6945 51.8533 72.2705 52.088C72.8678 52.3227 73.4438 52.6213 73.9985 52.984H73.9665C74.5212 53.3893 74.9478 53.9227 75.2465 54.584C75.5452 55.224 75.6945 55.9707 75.6945 56.824V57.112C75.6945 57.56 75.5452 57.8907 75.2465 58.104C74.9478 58.296 74.5105 58.4027 73.9345 58.424C72.7612 58.4453 72.1745 58.008 72.1745 57.112V56.856C72.1745 56.3227 72.0038 55.8427 71.6625 55.416C71.3425 54.968 70.7878 54.744 69.9985 54.744H66.0305C65.2412 54.744 64.6758 54.968 64.3345 55.416C64.0145 55.8427 63.8545 56.3227 63.8545 56.856V57.624C63.8545 58.1787 64.0145 58.68 64.3345 59.128C64.6758 59.576 65.2412 59.8 66.0305 59.8H70.7345ZM88.726 48.728L81.718 70.232V70.2C81.59 70.52 81.4087 70.7867 81.174 71C80.9607 71.192 80.694 71.288 80.374 71.288C80.2033 71.288 80.0327 71.2667 79.862 71.224C79.7127 71.2027 79.5527 71.1707 79.382 71.128H79.414C78.198 70.744 77.75 70.0613 78.07 69.08L85.366 46.904C85.4727 46.5627 85.654 46.2747 85.91 46.04C86.1873 45.8053 86.5073 45.6667 86.87 45.624C87.2327 45.56 87.5847 45.5173 87.926 45.496C88.2673 45.4533 88.534 45.432 88.726 45.432C88.918 45.432 89.1847 45.4533 89.526 45.496C89.8673 45.5173 90.2193 45.5493 90.582 45.592C90.8807 45.6347 91.1687 45.7947 91.446 46.072C91.7447 46.3493 91.9687 46.6267 92.118 46.904C93.3127 50.5733 94.518 54.2747 95.734 58.008C96.9713 61.72 98.1873 65.4107 99.382 69.08C99.6807 70.0613 99.2327 70.744 98.038 71.128C97.8673 71.1707 97.7073 71.2027 97.558 71.224C97.43 71.2667 97.2807 71.288 97.11 71.288C96.8113 71.288 96.534 71.192 96.278 71C96.0433 70.7867 95.8727 70.52 95.766 70.2V70.232L88.726 48.728ZM91.126 63.32C91.126 64.0027 90.8807 64.5893 90.39 65.08C89.9207 65.5493 89.3447 65.784 88.662 65.784C87.9793 65.784 87.4033 65.5493 86.934 65.08C86.4647 64.5893 86.23 64.0027 86.23 63.32C86.23 62.6373 86.4647 62.0613 86.934 61.592C87.4033 61.1013 87.9793 60.856 88.662 60.856C89.3447 60.856 89.9207 61.1013 90.39 61.592C90.8807 62.0613 91.126 62.6373 91.126 63.32ZM106.184 69.656C106.184 70.68 105.544 71.192 104.264 71.192C103.005 71.192 102.376 70.68 102.376 69.656V46.968C102.376 45.944 103.005 45.432 104.264 45.432C105.544 45.432 106.184 45.944 106.184 46.968V69.656Z" fill="white"/>
            </svg>
          </div>
          <div class="invoice-details">
            <div class="invoice-title">Invoice</div>
            <div><strong>Date:</strong> ${format(new Date(), 'MM/dd/yyyy')}</div>
            <div><strong>Due Date:</strong> ${format(new Date(invoiceData.dueDate || Date.now() + 30 * 24 * 60 * 60 * 1000), 'MM/dd/yyyy')}</div>
          </div>
        </div>
        
        <div class="row">
          <div class="col">
            <div class="label">FROM:</div>
            <div class="value">${invoiceData.businessName || 'Your Business'}</div>
            <div>${invoiceData.businessAddress || '123 Business Street'}</div>
            <div>${invoiceData.businessCity ? `${invoiceData.businessCity}, ${invoiceData.businessState} ${invoiceData.businessZip}` : 'City, State ZIP'}</div>
            <div>Email: ${invoiceData.businessEmail || 'business@example.com'}</div>
            <div>Phone: ${invoiceData.businessPhone || '(555) 123-4567'}</div>
          </div>
          
          <div class="col">
            <div class="label">BILL TO:</div>
            <div class="value">${invoiceData.client?.name || 'Client Name'}</div>
            ${invoiceData.client?.address ? `<div>${invoiceData.client.address}</div>` : ''}
            ${invoiceData.client?.email ? `<div>Email: ${invoiceData.client.email}</div>` : ''}
            ${invoiceData.client?.phone ? `<div>Phone: ${invoiceData.client.phone}</div>` : ''}
          </div>
        </div>
        
        <div class="row">
          <div class="col">
            <div class="label">INVOICE DETAILS</div>
            <div><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber || '00001'}</div>
            <div>Issue Date: ${format(new Date(invoiceData.issueDate || new Date()), 'MM/dd/yyyy')}</div>
            <div>Due Date: ${format(new Date(invoiceData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), 'MM/dd/yyyy')}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>DESCRIPTION</th>
              <th>QTY</th>
              <th>PRICE</th>
              <th>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTable}
          </tbody>
        </table>
        
        <div class="total-section">
          <div class="total-row">
            <div class="total-label">Subtotal:</div>
            <div class="total-value">$${subtotal.toFixed(2)}</div>
          </div>
          
          ${invoiceData.discount > 0 ? `
          <div class="total-row">
            <div class="total-label">Discount (${invoiceData.discount}%):</div>
            <div class="total-value">-$${discount.toFixed(2)}</div>
          </div>
          ` : ''}
          
          ${invoiceData.taxRate > 0 ? `
          <div class="total-row">
            <div class="total-label">Tax (${invoiceData.taxRate}%):</div>
            <div class="total-value">$${taxAmount.toFixed(2)}</div>
          </div>
          ` : ''}
          
          <div class="total-row grand-total">
            <div class="total-label">TOTAL:</div>
            <div class="total-value">$${total.toFixed(2)}</div>
          </div>
        </div>
        
        <div class="footer">
          Payment is due within 30 days from date of invoice.<br>
          Thank you for choosing <strong>${invoiceData.businessName}</strong>.
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate a text-based invoice from invoice data
 * @param {Object} invoiceData - The invoice data object
 * @returns {Promise<Object>} Object containing invoice path, filename, type, and content
 */
export const generateInvoicePDF = async (invoiceData) => {
  if (!invoiceData) {
    throw new Error('Invoice data is required');
  }
  
  try {
    // Build items table for HTML
    let subtotal = 0;
    let itemsTable = '';
    
    if (invoiceData.items && invoiceData.items.length > 0) {
      invoiceData.items.forEach(item => {
        const price = item.price || item.unitPrice || 0;
        const quantity = item.quantity || 1;
        const amount = price * quantity;
        subtotal += amount;
        
        itemsTable += `
          <tr>
            <td>${item.description || 'Item'}</td>
            <td>${quantity}</td>
            <td>$${price.toFixed(2)}</td>
            <td>$${amount.toFixed(2)}</td>
          </tr>
        `;
      });
    } else {
      itemsTable = `
        <tr>
          <td colspan="4">No items</td>
        </tr>
      `;
    }
    
    // Calculate totals
    const discountAmount = invoiceData.discount ? (invoiceData.discount / 100) * subtotal : 0;
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = invoiceData.taxRate ? (invoiceData.taxRate / 100) * discountedSubtotal : 0;
    const total = discountedSubtotal + taxAmount;

    // Create HTML content for the invoice
    const htmlContent = createInvoiceHTML(invoiceData, itemsTable, subtotal, discountAmount, taxAmount, total);
    
    // Ensure we have a directory to save the file
    const directory = `${RNFS.DocumentDirectoryPath}/invoices`;
    
    // Ensure the directory exists
    const dirExists = await RNFS.exists(directory);
    if (!dirExists) {
      await RNFS.mkdir(directory);
    }
    
    // Generate a PDF using the HTML content
    const safeInvoiceNumber = (invoiceData.invoiceNumber || 'INVOICE').replace('#', '').replace(/[^a-zA-Z0-9]/g, '_');
    const options = {
      html: htmlContent,
      fileName: `invoice_${safeInvoiceNumber}`,
      directory,
      width: 612, // Standard paper width (8.5 x 11 inches @ 72 PPI)
      height: 792, // Standard paper height
      padding: 24,
      base64: true,
    };
    
    // Generate PDF
    const pdf = await RNHTMLtoPDF.convert(options);
    //console.log(`PDF Generated at: ${pdf.filePath}`);

    // Return the PDF data in a format compatible with existing code
    return {
      pdfPath: pdf.filePath,
      fileName: `invoice_${safeInvoiceNumber}.pdf`,
      data: pdf.base64,
      isPdf: true,
    };
  } catch (error) {
    //console.error('Error generating invoice file:', error);
    throw error;
  }
};
