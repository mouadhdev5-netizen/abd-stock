import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency, formatDate } from './utils'

/**
 * Exports an array of objects to an Excel file
 * @param data Array of objects representing rows
 * @param filename Name of the file (without .xlsx)
 */
export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
  
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

/**
 * Reads an Excel file and converts it to an array of objects
 */
export async function importFromExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const json = XLSX.utils.sheet_to_json(worksheet)
        resolve(json)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsBinaryString(file)
  })
}

/**
 * Generates and downloads a PDF Invoice/Receipt for Sales or Purchases
 */
export function generateInvoicePDF(order: any, company: any, type: 'Sale' | 'Purchase') {
  if (!order || !company) return

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width

  // 1. Header (Company Info)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(company.name, 14, 20)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  let currentY = 28
  if (company.address) {
    doc.text(company.address, 14, currentY)
    currentY += 6
  }
  if (company.phone) {
    doc.text(`Tel: ${company.phone}`, 14, currentY)
    currentY += 6
  }
  if (company.tax_id) {
    doc.text(`NIF: ${company.tax_id} | RC: ${company.rc_number || ''}`, 14, currentY)
  }

  // 2. Invoice Details (Right Side)
  const isSale = type === 'Sale'
  const docTitle = isSale ? 'INVOICE / FACTURE' : 'PURCHASE ORDER / BON DE COMMANDE'
  const orderNumber = isSale ? order.so_number : order.po_number
  
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(docTitle, pageWidth - 14, 20, { align: 'right' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`No: ${orderNumber}`, pageWidth - 14, 28, { align: 'right' })
  doc.text(`Date: ${formatDate(order.created_at)}`, pageWidth - 14, 34, { align: 'right' })
  doc.text(`Status: ${order.status.toUpperCase()}`, pageWidth - 14, 40, { align: 'right' })

  // 3. Customer / Supplier Info
  currentY = 55
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(isSale ? 'Bill To:' : 'Vendor:', 14, currentY)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const partner = isSale ? order.customers?.name : order.suppliers?.name
  const partnerName = partner || (isSale ? 'Walk-in Customer' : 'Unknown Supplier')
  doc.text(partnerName, 14, currentY + 6)
  
  if (isSale && order.customers) {
    if (order.customers.tax_id) doc.text(`NIF: ${order.customers.tax_id}`, 14, currentY + 12)
    if (order.customers.phone) doc.text(`Tel: ${order.customers.phone}`, 14, currentY + 18)
  } else if (!isSale && order.suppliers) {
    if (order.suppliers.tax_id) doc.text(`NIF: ${order.suppliers.tax_id}`, 14, currentY + 12)
    if (order.suppliers.phone) doc.text(`Tel: ${order.suppliers.phone}`, 14, currentY + 18)
  }

  // 4. Items Table
  const tableData = (order.sales_order_items || order.purchase_order_items || []).map((item: any, index: number) => [
    index + 1,
    item.products?.name || item.product_name || 'Unknown Item',
    item.quantity,
    formatCurrency(item.unit_price, company.currency),
    `${item.tax_rate}%`,
    formatCurrency(item.discount, company.currency),
    formatCurrency(item.total, company.currency)
  ])

  // @ts-expect-error autotable types
  doc.autoTable({
    startY: 85,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Tax', 'Discount', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'center' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' }
    }
  })

  // 5. Totals
  // @ts-expect-error autotable types
  const finalY = doc.lastAutoTable.finalY + 10
  
  doc.setFontSize(10)
  doc.text('Subtotal:', pageWidth - 60, finalY)
  doc.text(formatCurrency(order.subtotal, company.currency), pageWidth - 14, finalY, { align: 'right' })
  
  doc.text('Tax Amount:', pageWidth - 60, finalY + 6)
  doc.text(formatCurrency(order.tax_total, company.currency), pageWidth - 14, finalY + 6, { align: 'right' })
  
  doc.text('Discount:', pageWidth - 60, finalY + 12)
  doc.text(`-${formatCurrency(order.discount_total, company.currency)}`, pageWidth - 14, finalY + 12, { align: 'right' })
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Grand Total:', pageWidth - 60, finalY + 20)
  doc.text(formatCurrency(order.total, company.currency), pageWidth - 14, finalY + 20, { align: 'right' })

  // Payment Status
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Amount Paid: ${formatCurrency(order.paid_amount, company.currency)}`, 14, finalY + 10)
  doc.text(`Due Balance: ${formatCurrency(order.due_amount, company.currency)}`, 14, finalY + 16)
  
  const paymentStatus = order.payment_status.toUpperCase()
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(paymentStatus === 'PAID' ? 0 : 220, paymentStatus === 'PAID' ? 128 : 53, 0)
  doc.text(`STATUS: ${paymentStatus}`, 14, finalY + 24)

  // 6. Footer
  doc.setTextColor(150)
  doc.setFontSize(8)
  doc.text('Thank you for your business!', pageWidth / 2, 280, { align: 'center' })

  // Save
  doc.save(`${orderNumber}.pdf`)
}
