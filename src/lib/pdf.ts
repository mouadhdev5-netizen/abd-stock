import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency } from './utils'
import { format } from 'date-fns'

// Extend jsPDF for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
    lastAutoTable: {
      finalY: number
    }
  }
}

export function generateInvoicePDF(order: any, company: any, type: 'Sale' | 'Command' | 'Supplier' | 'Delivery Note') {
  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.width
  
  // 1. Header Section
  doc.setFontSize(20)
  doc.setTextColor(33, 33, 33)
  const title = type === 'Delivery Note' ? 'BON DE LIVRAISON' : type === 'Supplier' ? 'FACTURE FOURNISSEUR' : 'FACTURE'
  doc.text(title, pageWidth - 14, 20, { align: 'right' })

  // Company Info
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(company?.name || 'Company Name', 14, 20)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  const companyPhone = company?.phone || ''
  const companyAddress = company?.address || ''
  let yPos = 26
  if (companyPhone) { doc.text(`Tel: ${companyPhone}`, 14, yPos); yPos += 5 }
  if (companyAddress) { doc.text(companyAddress, 14, yPos); yPos += 5 }

  // 2. Document Details
  doc.setTextColor(33, 33, 33)
  const refLabel = type === 'Sale' ? 'N° Facture:' : type === 'Command' ? 'N° Commande:' : 'Référence:'
  const refValue = order.so_number || order.po_number || order.reference || order.id?.substring(0, 8) || '-'
  const dateValue = order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')
  
  doc.setFont('helvetica', 'bold')
  doc.text(refLabel, pageWidth - 60, 35)
  doc.setFont('helvetica', 'normal')
  doc.text(refValue, pageWidth - 14, 35, { align: 'right' })
  
  doc.setFont('helvetica', 'bold')
  doc.text('Date:', pageWidth - 60, 41)
  doc.setFont('helvetica', 'normal')
  doc.text(dateValue, pageWidth - 14, 41, { align: 'right' })

  // 3. Client / Supplier Info
  doc.setFont('helvetica', 'bold')
  doc.text(type === 'Supplier' ? 'Fournisseur:' : 'Client:', 14, 50)
  doc.setFont('helvetica', 'normal')
  const entityName = order.customers?.name || order.suppliers?.name || 'Client Divers'
  doc.text(entityName, 14, 56)

  // 4. Items Table
  const tableColumn = ["Description", "Qte", "Prix Unitaire", "Remise", "Total"]
  const tableRows: any[] = []

  let items = order.items || order.sales_order_items || order.purchase_order_items || order.command_items || []
  let totalCalculated = 0

  items.forEach((item: any) => {
    const qty = item.quantity || 0
    const price = item.unit_price || item.cost_price || item.price || 0
    const discount = item.discount || 0
    const lineTotal = (qty * price) - discount
    totalCalculated += lineTotal

    const productName = item.product_name || item.products?.name || 'Produit inconnu'
    const variantName = item.product_variants?.name
    const desc = variantName ? `${productName} - ${variantName}` : productName

    tableRows.push([
      desc,
      qty.toString(),
      formatCurrency(price, company?.currency || 'DZD'),
      formatCurrency(discount, company?.currency || 'DZD'),
      formatCurrency(lineTotal, company?.currency || 'DZD')
    ])
  })

  doc.autoTable({
    startY: 65,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    }
  })

  // 5. Totals
  const finalY = doc.lastAutoTable.finalY || 65
  
  const subtotal = totalCalculated
  const total = order.total || totalCalculated
  const paid = order.paid_amount || 0
  const due = order.due_amount || (total - paid)

  doc.setFontSize(10)
  
  if (type !== 'Delivery Note') {
    doc.text('Sous-total:', pageWidth - 60, finalY + 10)
    doc.text(formatCurrency(subtotal, company?.currency || 'DZD'), pageWidth - 14, finalY + 10, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.text('Total Net:', pageWidth - 60, finalY + 18)
    doc.text(formatCurrency(total, company?.currency || 'DZD'), pageWidth - 14, finalY + 18, { align: 'right' })
    doc.setFont('helvetica', 'normal')

    if (paid > 0) {
      doc.text('Montant Payé:', pageWidth - 60, finalY + 26)
      doc.text(formatCurrency(paid, company?.currency || 'DZD'), pageWidth - 14, finalY + 26, { align: 'right' })
      
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38) // Red for due
      doc.text('Reste à Payer:', pageWidth - 60, finalY + 34)
      doc.text(formatCurrency(due, company?.currency || 'DZD'), pageWidth - 14, finalY + 34, { align: 'right' })
    }
  }

  // 6. Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.setFont('helvetica', 'italic')
  const footerText = 'Merci pour votre confiance.'
  doc.text(footerText, pageWidth / 2, doc.internal.pageSize.height - 15, { align: 'center' })

  // Save or Open
  const fileName = `${type.replace(' ', '_')}_${refValue}.pdf`
  doc.save(fileName)
}
