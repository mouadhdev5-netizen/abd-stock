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
export function generateInvoicePDF(order: any, company: any, type: 'Sale' | 'Purchase' | 'Command' | 'Delivery Note') {
  if (!order || !company) return

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width

  // 1. Header (Company Info)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(company.name || 'Company Name', 14, 20)

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
  const isPurchase = type === 'Purchase'
  const isCommand = type === 'Command'

  let docTitle = 'FACTURE'
  if (isPurchase) docTitle = 'FACTURE FOURNISSEUR'
  if (isCommand) docTitle = 'BON DE COMMANDE'
  if (type === 'Delivery Note') docTitle = 'BON DE LIVRAISON'

  const orderNumber = order.so_number || order.po_number || order.id?.substring(0, 8) || '-'

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
  doc.text(isPurchase ? 'Fournisseur:' : 'Client:', 14, currentY)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const partner = isPurchase ? order.suppliers?.name : order.customers?.name
  const partnerName = partner || (isPurchase ? 'Fournisseur Inconnu' : 'Client Divers')
  doc.text(partnerName, 14, currentY + 6)

  if (!isPurchase && order.customers) {
    if (order.customers.tax_id) doc.text(`NIF: ${order.customers.tax_id}`, 14, currentY + 12)
    if (order.customers.phone) doc.text(`Tel: ${order.customers.phone}`, 14, currentY + 18)
  } else if (isPurchase && order.suppliers) {
    if (order.suppliers.tax_id) doc.text(`NIF: ${order.suppliers.tax_id}`, 14, currentY + 12)
    if (order.suppliers.phone) doc.text(`Tel: ${order.suppliers.phone}`, 14, currentY + 18)
  }

  // 4. Items Table
  const items = order.sales_order_items || order.purchase_order_items || order.items || order.command_items || []
  let totalCalculated = 0

  const tableData = items.map((item: any, index: number) => {
    const qty = item.quantity || 0
    const price = item.unit_price || item.cost_price || item.price || 0
    const discount = item.discount || 0
    const lineTotal = (qty * price) - discount
    totalCalculated += lineTotal

    const productName = item.products?.name || item.product_name || 'Produit'
    const variantName = item.product_variants?.name
    const desc = variantName ? `${productName} - ${variantName}` : productName

    return [
      index + 1,
      desc,
      qty.toString(),
      formatCurrency(price, company.currency),
      `${item.tax_rate || 0}%`,
      formatCurrency(discount, company.currency),
      formatCurrency(lineTotal, company.currency)
    ]
  })

  doc.autoTable({
    startY: 85,
    head: [['#', 'Description', 'Qte', 'Prix Unitaire', 'Tax', 'Remise', 'Total']],
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
  const finalY = doc.lastAutoTable.finalY + 10

  const subtotal = order.subtotal !== undefined ? order.subtotal : totalCalculated
  const total = order.total !== undefined ? order.total : totalCalculated
  const paid = order.paid_amount || 0
  const due = order.due_amount || (total - paid)

  doc.setFontSize(10)
  doc.text('Sous-total:', pageWidth - 60, finalY)
  doc.text(formatCurrency(subtotal, company.currency), pageWidth - 14, finalY, { align: 'right' })

  if (order.tax_total !== undefined) {
    doc.text('TVA:', pageWidth - 60, finalY + 6)
    doc.text(formatCurrency(order.tax_total, company.currency), pageWidth - 14, finalY + 6, { align: 'right' })
  }

  if (order.discount_total !== undefined) {
    doc.text('Remise:', pageWidth - 60, finalY + 12)
    doc.text(`-${formatCurrency(order.discount_total, company.currency)}`, pageWidth - 14, finalY + 12, { align: 'right' })
  }

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Total Net:', pageWidth - 60, finalY + 20)
  doc.text(formatCurrency(total, company.currency), pageWidth - 14, finalY + 20, { align: 'right' })

  // Payment Status (skip for delivery note or commands without payment info)
  if (type !== 'Delivery Note' && order.payment_status) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Montant Payé: ${formatCurrency(paid, company.currency)}`, 14, finalY + 10)
    doc.text(`Reste à Payer: ${formatCurrency(due, company.currency)}`, 14, finalY + 16)

    const paymentStatus = order.payment_status.toUpperCase()
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(paymentStatus === 'PAID' ? 0 : 220, paymentStatus === 'PAID' ? 128 : 53, 0)
    doc.text(`STATUT: ${paymentStatus}`, 14, finalY + 24)
  }

  // 6. Footer
  doc.setTextColor(150)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text('Merci pour votre confiance.', pageWidth / 2, 280, { align: 'center' })

  // Save
  doc.save(`${docTitle.replace(/ /g, '_')}_${orderNumber}.pdf`)
}
