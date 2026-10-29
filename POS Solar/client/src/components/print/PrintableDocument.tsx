import React from 'react';
import { usePrinterStore } from '../../stores/printerStore';
import { formatCurrency } from '../../lib/utils';

export const PrintableDocument: React.FC = () => {
  const { activeDoc, settings } = usePrinterStore();

  if (!activeDoc) return null;

  const isInvoice = activeDoc.docType === 'invoice';
  const subtotal = activeDoc.subtotal || activeDoc.grandTotal || 0;
  const taxRate = activeDoc.taxRate ?? 18;
  const untaxedSubtotal = activeDoc.untaxedAmount !== undefined ? activeDoc.untaxedAmount : subtotal;
  const taxAmount = activeDoc.tax !== undefined ? activeDoc.tax : Math.round(untaxedSubtotal * (taxRate / 100));
  const discount = activeDoc.discount || 0;
  const installationCharges = activeDoc.installationCharges || 0;
  const transportCharges = activeDoc.transportCharges || 0;
  const taxedGrandTotal = activeDoc.taxedTotal !== undefined 
    ? activeDoc.taxedTotal 
    : (untaxedSubtotal + taxAmount - discount + installationCharges + transportCharges);
  const salesperson = activeDoc.salespersonName || 'Engr. Usman Tariq (Sales Desk)';
  const customerCnic = activeDoc.customerCnic || activeDoc.customerNtn || '35202-9876543-1';
  const validityDays = activeDoc.validityDays ? String(activeDoc.validityDays) : 'Expired 2 Days';

  const isThermal = settings.paperSize === '80mm' || settings.paperSize === '58mm';
  const widthClass = settings.paperSize === '58mm' ? 'w-[54mm] max-w-[54mm]' : 'w-[74mm] max-w-[74mm]';

  // ==========================================
  // THERMAL RECEIPT LAYOUT (58mm / 80mm Roll)
  // ==========================================
  if (isThermal) {
    return (
      <div id="printable-area" className="bg-white text-black font-mono">
        <div className={`mx-auto p-1.5 text-[10px] leading-tight ${widthClass}`}>
          {/* Header */}
          <div className="text-center pb-2 border-b border-dashed border-black">
            <img
              src="/banner.png"
              alt="AlpSolar & J.I Energies"
              className="w-full h-auto max-h-12 object-contain mx-auto mb-1 rounded bg-black"
            />
            <h1 className="text-xs font-black tracking-tight uppercase">{settings.companyName}</h1>
            <p className="text-[9.5px] mt-0.5">{settings.address}, {settings.city}</p>
            <p className="text-[9.5px] font-bold">Tel/WhatsApp: {settings.phone}</p>
            {settings.ntn && <p className="text-[9px] mt-0.5">{settings.ntn}</p>}
          </div>

          {/* Document Info */}
          <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[9.5px]">
            {isInvoice && (
              <div className="flex justify-between font-black pb-0.5">
                <span>AGREEMENT:</span>
                <span className="bg-black text-white px-1">DEAL LOCK</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>{isInvoice ? 'TAX INVOICE:' : `${activeDoc.docType.toUpperCase()}:`}</span>
              <span className="font-mono">#{activeDoc.docNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{activeDoc.date || new Date().toLocaleString()}</span>
            </div>
            {isInvoice && (
              <div className="flex justify-between font-bold">
                <span>Validity:</span>
                <span>{validityDays}</span>
              </div>
            )}
            {activeDoc.customerName && (
              <div className="flex justify-between font-semibold pt-0.5">
                <span>Customer:</span>
                <span className="text-right truncate max-w-[60%]">{activeDoc.customerName}</span>
              </div>
            )}
            {isInvoice && (
              <div className="flex justify-between">
                <span>CNIC/NTN:</span>
                <span className="font-mono">{customerCnic}</span>
              </div>
            )}
            {activeDoc.customerPhone && (
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{activeDoc.customerPhone}</span>
              </div>
            )}
            {activeDoc.customerCity && (
              <div className="flex justify-between">
                <span>City:</span>
                <span>{activeDoc.customerCity}</span>
              </div>
            )}
            {isInvoice && (
              <div className="flex justify-between pt-0.5">
                <span>Salesperson:</span>
                <span className="font-semibold">{salesperson}</span>
              </div>
            )}
          </div>

          {/* Items Table with Fixed Columns */}
          <div className="py-1.5 border-b border-dashed border-black">
            <table className="w-full text-[9.5px] border-collapse table-fixed">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="w-6 pb-1 text-left font-bold">QTY</th>
                  <th className="pb-1 text-left font-bold px-1">ITEM (DESC)</th>
                  {isInvoice && <th className="w-8 pb-1 text-center font-bold">TAX</th>}
                  <th className="w-16 pb-1 text-right font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-gray-300">
                {activeDoc.items.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1 font-bold">{item.quantity}x</td>
                    <td className="py-1 px-1">
                      <div className="font-semibold break-words leading-tight">{item.name}</div>
                      {item.unit_price > 0 && (
                        <div className="text-[8.5px] text-gray-700">@ {formatCurrency(item.unit_price)}</div>
                      )}
                      {item.serials && item.serials.length > 0 && (
                        <div className="text-[8px] text-gray-700 font-mono">S/N: {item.serials.join(', ')}</div>
                      )}
                    </td>
                    {isInvoice && (
                      <td className="py-1 text-center text-[8.5px] text-gray-700 font-mono">
                        {item.tax_rate !== undefined ? `${item.tax_rate}%` : `${taxRate}%`}
                      </td>
                    )}
                    <td className="py-1 text-right font-mono font-bold">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="py-2 border-b border-dashed border-black space-y-1 text-[9.5px]">
            {isInvoice ? (
              <>
                <div className="flex justify-between">
                  <span>Untaxed Subtotal:</span>
                  <span className="font-mono">{formatCurrency(untaxedSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Tax ({taxRate}% GST):</span>
                  <span className="font-mono">{formatCurrency(taxAmount)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(activeDoc.subtotal)}</span>
              </div>
            )}

            {activeDoc.discount ? (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span className="font-mono">-{formatCurrency(activeDoc.discount)}</span>
              </div>
            ) : null}

            {activeDoc.installationCharges ? (
              <div className="flex justify-between">
                <span>Installation Fee:</span>
                <span className="font-mono">+{formatCurrency(activeDoc.installationCharges)}</span>
              </div>
            ) : null}

            {activeDoc.transportCharges ? (
              <div className="flex justify-between">
                <span>Transport Charges:</span>
                <span className="font-mono">+{formatCurrency(activeDoc.transportCharges)}</span>
              </div>
            ) : null}

            <div className="flex justify-between font-bold text-[11px] pt-1 border-t border-black">
              <span>{isInvoice ? 'TAXED TOTAL:' : 'GRAND TOTAL:'}</span>
              <span className="font-mono">{formatCurrency(isInvoice ? taxedGrandTotal : activeDoc.grandTotal)}</span>
            </div>

            <div className="flex justify-between font-bold text-[10px] text-black pt-0.5">
              <span>ADVANCE PAID:</span>
              <span className="font-mono">{formatCurrency(activeDoc.paidAmount)}</span>
            </div>

            {activeDoc.balanceDue > 0 ? (
              <div className="flex justify-between font-bold text-[10.5px] text-black pt-0.5 border-t border-dashed border-black">
                <span>BALANCE DUE:</span>
                <span className="font-mono">{formatCurrency(activeDoc.balanceDue)}</span>
              </div>
            ) : (
              <div className="text-center font-bold text-[10px] text-black py-0.5">
                *** FULLY PAID ***
              </div>
            )}

            {activeDoc.paymentMethod && (
              <div className="flex justify-between text-[8.5px] pt-0.5 text-gray-700">
                <span>Payment Mode:</span>
                <span>{activeDoc.paymentMethod.replace('_', ' ')}</span>
              </div>
            )}
          </div>

          {/* Terms & Footer */}
          <div className="pt-2 text-center text-[8.5px] space-y-1">
            {isInvoice ? (
              <div className="leading-tight text-left border-b border-dashed border-gray-400 pb-1.5 space-y-0.5">
                <p className="font-bold underline uppercase">Deal Lock Terms &amp; Conditions:</p>
                <p>• <b>Ex - :</b> Ex-Warehouse Multan delivery terms.</p>
                <p>• <b>Rate :</b> Rates locked for 2 Days ({validityDays}).</p>
                <p>• <b>Pannel :</b> 12-Yr product &amp; 25-Yr linear output warranty.</p>
                <p>• <b>Payment :</b> 100% clearance required before dispatch.</p>
              </div>
            ) : (
              <p className="whitespace-pre-line leading-tight text-left border-b border-dashed border-gray-400 pb-1.5">
                {settings.terms}
              </p>
            )}
            <p className="font-bold pt-1">{settings.footerNote}</p>
            <p className="text-[7.5px] text-gray-600">Printed: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STANDARD A4 FORMAL DOCUMENT LAYOUT
  // ==========================================
  return (
    <div id="printable-area" className="bg-white text-black font-sans p-6 max-w-[210mm] mx-auto min-h-[297mm]">
      {/* Official Shop Banner (Dual Branding) */}
      <div className="mb-4">
        <div className="w-full rounded-xl overflow-hidden bg-black shadow-xs">
          <img
            src="/banner.png"
            alt="AlpSolar & J.I Energies Banner"
            className="w-full h-auto max-h-[105px] object-cover"
          />
        </div>
      </div>

      {/* Document Info Bar (Type, Number & Date) */}
      <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="inline-block px-3 py-1 bg-black text-white font-black text-xs tracking-wider uppercase rounded shadow-xs">
            {activeDoc.docType === 'quotation'
              ? 'Official Quotation'
              : activeDoc.docType === 'payment_receipt'
              ? 'Payment Receipt Voucher'
              : activeDoc.docType === 'customer_ledger'
              ? 'Customer Account Statement (Ledger)'
              : activeDoc.docType === 'installation_certificate'
              ? 'Solar Installation & Handover Certificate'
              : 'Sales Tax Invoice'}
          </span>
          {isInvoice && (
            <span className="inline-block px-2.5 py-1 bg-amber-500 text-black font-black text-xs tracking-wider uppercase rounded shadow-xs">
              Deal Lock
            </span>
          )}
        </div>

        <div className="flex items-center gap-6 text-right">
          {isInvoice && (
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Validity</span>
              <span className="text-xs font-black text-black">{validityDays}</span>
            </div>
          )}
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">
              {activeDoc.docType === 'installation_certificate' ? 'Job No' : 'Document No'}
            </span>
            <span className="text-sm font-black text-black font-mono">#{activeDoc.docNumber}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Date</span>
            <span className="text-xs font-bold text-gray-800">
              {activeDoc.date || new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Bill To & Details Cards */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50/40">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
            {activeDoc.docType === 'installation_certificate' ? 'Customer & Site Location' : 'Bill To Customer'}
          </span>
          <p className="text-sm font-bold">{activeDoc.customerName || 'Counter Sale / Walk-in'}</p>
          {activeDoc.customerPhone && <p className="text-xs text-gray-600">Phone: {activeDoc.customerPhone}</p>}
          {activeDoc.customerCity && <p className="text-xs text-gray-600">City: {activeDoc.customerCity}</p>}
          {activeDoc.customerAddress && <p className="text-xs text-gray-600">Site Address: {activeDoc.customerAddress}</p>}
          {isInvoice && (
            <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-gray-200">
              <span className="text-gray-600 font-medium">ID Card / NTN:</span>
              <span className="font-bold text-black font-mono">{customerCnic}</span>
            </div>
          )}
        </div>

        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50/40 space-y-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
            {activeDoc.docType === 'installation_certificate'
              ? 'Technical & Commissioning Specs'
              : isInvoice
              ? 'Deal & Order Information'
              : 'Order & Payment Details'}
          </span>
          {activeDoc.docType === 'installation_certificate' ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">System Capacity:</span>
                <span className="font-bold">{activeDoc.systemCapacity || 'Standard kW'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Assigned Team:</span>
                <span className="font-bold">{activeDoc.technicianName || 'Engineering Team'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Status:</span>
                <span className="font-black text-black">{activeDoc.installationStatus || 'COMPLETED'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Completion Date:</span>
                <span className="font-bold">{activeDoc.completedDate || activeDoc.date}</span>
              </div>
            </>
          ) : (
            <>
              {isInvoice && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Sales Person:</span>
                    <span className="font-bold text-black">{salesperson}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Deal Lock Status:</span>
                    <span className="font-bold text-black">Locked (Valid 2 Days)</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-semibold">{activeDoc.paymentMethod?.replace('_', ' ') || 'Cash'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Payment Status:</span>
                <span className="font-bold">
                  {activeDoc.balanceDue <= 0 ? 'PAID' : activeDoc.paidAmount > 0 ? 'PARTIALLY PAID' : 'UNPAID'}
                </span>
              </div>
            </>
          )}
          {activeDoc.notes && (
            <div className="text-xs text-gray-600 pt-1">
              <span>Remarks: </span>
              <span className="italic">{activeDoc.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Table: Ledger Statement OR Items Breakdown */}
      {activeDoc.docType === 'customer_ledger' && activeDoc.ledgerEntries ? (
        <table className="w-full text-xs border border-collapse border-black mb-5">
          <thead>
            <tr className="bg-gray-100 border-b border-black text-left">
              <th className="p-2 border-r border-black w-24 text-center">Date</th>
              <th className="p-2 border-r border-black w-28">Ref / Doc #</th>
              <th className="p-2 border-r border-black">Particulars / Description</th>
              <th className="p-2 border-r border-black w-28 text-right">Debit (Bill)</th>
              <th className="p-2 border-r border-black w-28 text-right">Credit (Paid)</th>
              <th className="p-2 w-32 text-right">Balance Due</th>
            </tr>
          </thead>
          <tbody>
            {activeDoc.ledgerEntries.map((entry, idx) => (
              <tr key={idx} className="border-b border-gray-300">
                <td className="p-2 border-r border-black text-center text-[11px]">
                  {new Date(entry.date).toLocaleDateString()}
                </td>
                <td className="p-2 border-r border-black font-bold text-[11px] font-mono">{entry.ref_no}</td>
                <td className="p-2 border-r border-black text-[11px]">{entry.description}</td>
                <td className="p-2 border-r border-black text-right font-mono font-semibold">
                  {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                </td>
                <td className="p-2 border-r border-black text-right font-mono font-semibold text-emerald-800">
                  {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                </td>
                <td className="p-2 text-right font-mono font-black">
                  {formatCurrency(entry.running_balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : isInvoice ? (
        <table className="w-full text-xs border border-collapse border-black mb-5">
          <thead>
            <tr className="bg-gray-100 border-b border-black text-left">
              <th className="p-2 border-r border-black w-10 text-center">#</th>
              <th className="p-2 border-r border-black">Description (product)</th>
              <th className="p-2 border-r border-black w-16 text-center">Qty</th>
              <th className="p-2 border-r border-black w-28 text-right">Price</th>
              <th className="p-2 border-r border-black w-24 text-center">Taxes</th>
              <th className="p-2 w-32 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {activeDoc.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-300">
                <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                <td className="p-2 border-r border-black font-semibold">
                  <div>{item.name}</div>
                  {item.model && <span className="text-gray-600 text-[11px] block">{item.model}</span>}
                  {item.serials && item.serials.length > 0 && (
                    <span className="text-gray-500 text-[10px] block mt-0.5 font-mono">
                      Serial(s): {item.serials.join(', ')}
                    </span>
                  )}
                </td>
                <td className="p-2 border-r border-black text-center font-bold">{item.quantity}</td>
                <td className="p-2 border-r border-black text-right font-mono">{formatCurrency(item.unit_price)}</td>
                <td className="p-2 border-r border-black text-center font-semibold text-gray-700 font-mono">
                  {item.tax_rate !== undefined ? `${item.tax_rate}% GST` : `${taxRate}% GST`}
                </td>
                <td className="p-2 text-right font-bold font-mono">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="w-full text-xs border border-collapse border-black mb-5">
          <thead>
            <tr className="bg-gray-100 border-b border-black text-left">
              <th className="p-2 border-r border-black w-10 text-center">#</th>
              <th className="p-2 border-r border-black">Item Description &amp; Specifications</th>
              <th className="p-2 border-r border-black w-20 text-center">Qty</th>
              <th className="p-2 border-r border-black w-28 text-right">Unit Price</th>
              <th className="p-2 w-32 text-right">Total Price</th>
            </tr>
          </thead>
          <tbody>
            {activeDoc.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-300">
                <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                <td className="p-2 border-r border-black font-semibold">
                  <div>{item.name}</div>
                  {item.model && <span className="text-gray-600 text-[11px] block">{item.model}</span>}
                  {item.serials && item.serials.length > 0 && (
                    <span className="text-gray-500 text-[10px] block mt-0.5 font-mono">
                      Serial(s): {item.serials.join(', ')}
                    </span>
                  )}
                </td>
                <td className="p-2 border-r border-black text-center font-bold">{item.quantity}</td>
                <td className="p-2 border-r border-black text-right font-mono">{formatCurrency(item.unit_price)}</td>
                <td className="p-2 text-right font-bold font-mono">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Balanced Summary & Bank Transfer Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print-avoid-break">
        {/* Left Column: Official Bank Account Details */}
        <div className="border border-black rounded-lg p-3 space-y-2 text-xs bg-gray-50/50">
          <span className="text-[10px] font-black text-black uppercase tracking-wider block border-b border-gray-300 pb-1">
            Official Bank Transfer Details
          </span>
          <div className="text-[11px] space-y-1.5 text-gray-800">
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Bank Name:</span>
              <span className="font-bold">Meezan Bank Ltd / Bank Al Habib</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Account Title:</span>
              <span className="font-bold">Alp Solar &amp; J.I Energies</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Branch / City:</span>
              <span className="font-semibold">Multan Main Branch</span>
            </div>
          </div>
          <div className="pt-2 border-t border-dashed border-gray-300 text-[10px] text-gray-600 leading-snug">
            <span>⚠️ Please share deposit slip / online transaction screenshot on WhatsApp (<b>{settings.phone}</b>) for stock clearance &amp; warranty activation.</span>
          </div>
        </div>

        {/* Right Column: Financial Calculations */}
        <div className="border border-black rounded-lg p-3 space-y-1.5 text-xs bg-white">
          {activeDoc.docType === 'installation_certificate' ? (
            <>
              <div className="flex justify-between font-bold">
                <span className="text-gray-700">Total Equipment:</span>
                <span>{activeDoc.items?.length || 0} Line Items</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-700">System Value:</span>
                <span className="font-mono">{formatCurrency(activeDoc.grandTotal)}</span>
              </div>
              <div className="flex justify-between font-black text-sm border-t-2 border-black pt-1.5 text-black">
                <span>Commissioning Status:</span>
                <span className="text-black">PASSED &amp; OPERATIONAL</span>
              </div>
            </>
          ) : activeDoc.docType === 'customer_ledger' ? (
            <>
              <div className="flex justify-between font-bold">
                <span className="text-gray-700">Total Purchases (Debit):</span>
                <span className="font-mono">{formatCurrency(activeDoc.grandTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800">
                <span>Total Received (Credit):</span>
                <span className="font-mono">{formatCurrency(activeDoc.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-sm border-t-2 border-black pt-1.5 text-black">
                <span>Net Account Balance Due:</span>
                <span className="font-mono">{formatCurrency(activeDoc.balanceDue)}</span>
              </div>
            </>
          ) : isInvoice ? (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Untaxed Amount (Subtotal):</span>
                <span className="font-semibold font-mono">{formatCurrency(untaxedSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sales Tax ({taxRate}% GST):</span>
                <span className="font-semibold font-mono">{formatCurrency(taxAmount)}</span>
              </div>
              {activeDoc.discount ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-mono">-{formatCurrency(activeDoc.discount)}</span>
                </div>
              ) : null}
              {activeDoc.installationCharges ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Installation Fee:</span>
                  <span className="font-mono">+{formatCurrency(activeDoc.installationCharges)}</span>
                </div>
              ) : null}
              {activeDoc.transportCharges ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transport:</span>
                  <span className="font-mono">+{formatCurrency(activeDoc.transportCharges)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-black text-sm border-t-2 border-black pt-1.5">
                <span>Taxed Grand Total:</span>
                <span className="font-mono">{formatCurrency(taxedGrandTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1">
                <span>Advance Paid / Received:</span>
                <span className="font-mono">{formatCurrency(activeDoc.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-xs pt-1 border-t border-dashed border-gray-400">
                <span>Balance Outstanding Due:</span>
                <span className={`font-mono ${activeDoc.balanceDue > 0 ? 'text-black underline' : 'text-gray-600'}`}>
                  {formatCurrency(activeDoc.balanceDue)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold font-mono">{formatCurrency(activeDoc.subtotal)}</span>
              </div>
              {activeDoc.discount ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-mono">-{formatCurrency(activeDoc.discount)}</span>
                </div>
              ) : null}
              {activeDoc.installationCharges ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Installation Fee:</span>
                  <span className="font-mono">+{formatCurrency(activeDoc.installationCharges)}</span>
                </div>
              ) : null}
              {activeDoc.transportCharges ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transport:</span>
                  <span className="font-mono">+{formatCurrency(activeDoc.transportCharges)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-black text-sm border-t border-black pt-1">
                <span>Grand Total:</span>
                <span className="font-mono">{formatCurrency(activeDoc.grandTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-0.5">
                <span>Advance Received:</span>
                <span className="font-mono">{formatCurrency(activeDoc.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-xs pt-1 border-t border-dashed border-gray-400">
                <span>Balance Outstanding:</span>
                <span className={`font-mono ${activeDoc.balanceDue > 0 ? 'text-black underline' : 'text-gray-600'}`}>
                  {formatCurrency(activeDoc.balanceDue)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Terms, Signatures & Shop Address */}
      <div className="mt-auto pt-4 border-t border-gray-300">
        {isInvoice ? (
          <div className="text-[10.5px] text-gray-800 mb-6 border border-gray-300 rounded-lg p-3 bg-gray-50/60 print-avoid-break">
            <b className="block text-black uppercase tracking-wider mb-1.5 text-xs font-black">
              Terms &amp; Conditions (Deal Lock Agreement):
            </b>
            <div className="space-y-1 leading-relaxed text-gray-700">
              <p>
                <b className="text-black">• Ex-Warehouse (Ex -):</b> All materials and solar equipment are supplied on Ex-Warehouse Multan basis. Offloading, local carriage, and transit insurance are customer responsibility unless specifically contracted in writing.
              </p>
              <p>
                <b className="text-black">• Rate &amp; Price Lock (Rate):</b> Quoted rates and invoice prices are locked strictly for <b>2 Days ({validityDays})</b> from invoice date against USD exchange rate, currency parity, and market fluctuations.
              </p>
              <p>
                <b className="text-black">• Solar Panels &amp; Equipment Warranty (Pannel):</b> Tier-1 Solar Panels include 12-year standard product warranty &amp; 25-year linear performance warranty. Inverters carry 5-year replacement/service warranty. Physical damage, improper wiring, lightning or burnt damages are excluded.
              </p>
              <p>
                <b className="text-black">• Payment &amp; Ownership:</b> Advance token locks product allotment for 2 days. 100% full cleared payment is mandatory prior to stock release or dispatch. Title remains with company until full settlement.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-[10.5px] text-gray-600 mb-6 whitespace-pre-line print-avoid-break">
            <b>Terms &amp; Conditions:</b>
            <br />
            {settings.terms}
          </div>
        )}

        {/* Full-width Signatures Spanning Entire Document Margin */}
        <div className="w-full flex justify-between items-end pt-6 pb-2 px-2 print-avoid-break">
          <div className="text-center w-56">
            <div className="w-full border-t border-black mb-1.5"></div>
            <p className="text-xs font-bold text-gray-900">Customer Signature</p>
            <p className="text-[9.5px] text-gray-500">Receiver's Sign &amp; Date</p>
          </div>
          <div className="text-center w-56">
            <div className="w-full border-t border-black mb-1.5"></div>
            <p className="text-xs font-bold text-gray-900">Authorized Signature &amp; Stamp</p>
            <p className="text-[9.5px] text-gray-500">Alp Solar &amp; J.I Energies</p>
          </div>
        </div>

        {/* Shop Address & Contact Details */}
        <div className="mt-6 pt-3 border-t border-dashed border-gray-300 text-center space-y-1 print-avoid-break">
          <p className="text-xs font-black text-gray-900 tracking-wide uppercase">
            {settings.companyName}
          </p>
          <p className="text-[11px] font-semibold text-gray-700">
            📍 {settings.address}, {settings.city}
          </p>
          <div className="flex justify-center items-center gap-3 text-[11px] font-bold text-gray-800">
            <span>📞 Tel / WhatsApp: {settings.phone}</span>
            {settings.ntn && (
              <>
                <span>•</span>
                <span>{settings.ntn}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
