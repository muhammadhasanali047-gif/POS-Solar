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
  const widthClass = settings.paperSize === '58mm' ? 'max-w-[56mm]' : 'max-w-[78mm]';

  if (isThermal) {
    return (
      <div id="printable-area" className="bg-white text-black font-mono">
        <div className={`mx-auto p-2 text-[11px] leading-tight ${widthClass}`}>
          {/* Header */}
          <div className="text-center pb-2 border-b border-dashed border-black">
            <img
              src="/banner.png"
              alt="AlpSolar & J.I Energies"
              className="w-full h-auto max-h-14 object-contain mx-auto mb-1.5 rounded bg-black"
            />
            <h1 className="text-xs font-black tracking-tight uppercase">{settings.companyName}</h1>
            <p className="text-[10px] mt-0.5">{settings.address}, {settings.city}</p>
            <p className="text-[10px] font-bold">Tel / WhatsApp: {settings.phone}</p>
            {settings.ntn && <p className="text-[9px] mt-0.5">{settings.ntn}</p>}
          </div>

          {/* Document Info */}
          <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
            {isInvoice && (
              <div className="flex justify-between font-black pb-0.5">
                <span>AGREEMENT:</span>
                <span className="bg-black text-white px-1">DEAL LOCK</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>{isInvoice ? 'TAX INVOICE:' : `${activeDoc.docType.toUpperCase()}:`}</span>
              <span>#{activeDoc.docNumber}</span>
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
                <span className="text-right">{activeDoc.customerName}</span>
              </div>
            )}
            {isInvoice && (
              <div className="flex justify-between">
                <span>ID Card / NTN:</span>
                <span>{customerCnic}</span>
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

          {/* Items Table */}
          <div className="py-2 border-b border-dashed border-black">
            <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-black">
              <span className="w-8">QTY</span>
              <span className="flex-1 text-left px-1">ITEM (DESC)</span>
              {isInvoice && <span className="w-10 text-center">TAX</span>}
              <span className="w-16 text-right">TOTAL</span>
            </div>

            <div className="divide-y divide-dashed divide-gray-300 py-1">
              {activeDoc.items.map((item, idx) => (
                <div key={idx} className="py-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="w-8 font-semibold">{item.quantity}x</span>
                    <span className="flex-1 text-left px-1 font-semibold">{item.name}</span>
                    {isInvoice && (
                      <span className="w-10 text-center text-[9px] text-gray-700">
                        {item.tax_rate !== undefined ? `${item.tax_rate}%` : `${taxRate}%`}
                      </span>
                    )}
                    <span className="w-16 text-right">{formatCurrency(item.total_price)}</span>
                  </div>
                  {item.unit_price > 0 && (
                    <div className="text-[9px] text-gray-700 pl-8">
                      @ {formatCurrency(item.unit_price)} each
                    </div>
                  )}
                  {item.serials && item.serials.length > 0 && (
                    <div className="text-[8px] text-gray-700 pl-8 pt-0.5">
                      S/N: {item.serials.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
            {isInvoice ? (
              <>
                <div className="flex justify-between">
                  <span>Untaxed Amount (Subtotal):</span>
                  <span>{formatCurrency(untaxedSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Tax ({taxRate}% GST):</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(activeDoc.subtotal)}</span>
              </div>
            )}

            {activeDoc.discount ? (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-{formatCurrency(activeDoc.discount)}</span>
              </div>
            ) : null}

            {activeDoc.installationCharges ? (
              <div className="flex justify-between">
                <span>Installation Fee:</span>
                <span>+{formatCurrency(activeDoc.installationCharges)}</span>
              </div>
            ) : null}

            {activeDoc.transportCharges ? (
              <div className="flex justify-between">
                <span>Transport Charges:</span>
                <span>+{formatCurrency(activeDoc.transportCharges)}</span>
              </div>
            ) : null}

            <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
              <span>{isInvoice ? 'TAXED GRAND TOTAL:' : 'GRAND TOTAL:'}</span>
              <span>{formatCurrency(isInvoice ? taxedGrandTotal : activeDoc.grandTotal)}</span>
            </div>

            <div className="flex justify-between font-bold text-[11px] text-black pt-0.5">
              <span>ADVANCE PAID:</span>
              <span>{formatCurrency(activeDoc.paidAmount)}</span>
            </div>

            {activeDoc.balanceDue > 0 ? (
              <div className="flex justify-between font-bold text-[11px] text-black pt-0.5 border-t border-dashed border-black">
                <span>BALANCE OUTSTANDING:</span>
                <span>{formatCurrency(activeDoc.balanceDue)}</span>
              </div>
            ) : (
              <div className="text-center font-bold text-[10px] text-black py-0.5">
                *** FULLY PAID ***
              </div>
            )}

            {activeDoc.paymentMethod && (
              <div className="flex justify-between text-[9px] pt-0.5 text-gray-700">
                <span>Payment Mode:</span>
                <span>{activeDoc.paymentMethod.replace('_', ' ')}</span>
              </div>
            )}
          </div>

          {/* Terms & Footer */}
          <div className="pt-2 text-center text-[9px] space-y-1">
            {isInvoice ? (
              <div className="leading-tight text-left border-b border-dashed border-gray-400 pb-1.5 space-y-0.5 text-[8.5px]">
                <p className="font-bold underline uppercase">Deal Lock Terms & Conditions:</p>
                <p>• <b>Ex - :</b> Ex-Warehouse Multan delivery terms.</p>
                <p>• <b>Rate :</b> Rates locked for 2 Days ({validityDays}).</p>
                <p>• <b>Pannel :</b> 12-Yr product & 25-Yr linear output warranty.</p>
                <p>• <b>Payment :</b> 100% clearance required before dispatch.</p>
              </div>
            ) : (
              <p className="whitespace-pre-line leading-tight text-left border-b border-dashed border-gray-400 pb-1.5">
                {settings.terms}
              </p>
            )}
            <p className="font-bold pt-1">{settings.footerNote}</p>
            <p className="text-[8px] text-gray-600">Printed: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    );
  }

  // Standard A4 Layout
  return (
    <div id="printable-area" className="bg-white text-black font-sans p-8 max-w-[210mm] mx-auto min-h-[297mm]">
      {/* Official Shop Banner (Solid Jet-Black Dual Branding) */}
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
      <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="inline-block px-3.5 py-1.5 bg-black text-white font-black text-xs tracking-wider uppercase rounded shadow-xs">
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
            <span className="inline-block px-3 py-1 bg-black text-white font-black text-xs tracking-wider uppercase rounded shadow-xs">
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
            <span className="text-sm font-black text-black">#{activeDoc.docNumber}</span>
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
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="p-3 border border-gray-300 rounded-lg">
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

        <div className="p-3 border border-gray-300 rounded-lg space-y-1">
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
                    <span className="text-gray-600">Sale Person Name:</span>
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
        <table className="w-full text-xs border border-collapse border-black mb-6">
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
                <td className="p-2 border-r border-black font-bold text-[11px]">{entry.ref_no}</td>
                <td className="p-2 border-r border-black text-[11px]">{entry.description}</td>
                <td className="p-2 border-r border-black text-right font-semibold">
                  {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                </td>
                <td className="p-2 border-r border-black text-right font-semibold text-emerald-800">
                  {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                </td>
                <td className="p-2 text-right font-black">
                  {formatCurrency(entry.running_balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : isInvoice ? (
        <table className="w-full text-xs border border-collapse border-black mb-6">
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
                  {item.name}
                  {item.model && <span className="text-gray-600 text-[11px] block">{item.model}</span>}
                  {item.serials && item.serials.length > 0 && (
                    <span className="text-gray-500 text-[10px] block mt-0.5">
                      Serial(s): {item.serials.join(', ')}
                    </span>
                  )}
                </td>
                <td className="p-2 border-r border-black text-center font-bold">{item.quantity}</td>
                <td className="p-2 border-r border-black text-right">{formatCurrency(item.unit_price)}</td>
                <td className="p-2 border-r border-black text-center font-semibold text-gray-700">
                  {item.tax_rate !== undefined ? `${item.tax_rate}% GST` : `${taxRate}% GST`}
                </td>
                <td className="p-2 text-right font-bold">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="w-full text-xs border border-collapse border-black mb-6">
          <thead>
            <tr className="bg-gray-100 border-b border-black text-left">
              <th className="p-2 border-r border-black w-10 text-center">#</th>
              <th className="p-2 border-r border-black">Item Description & Specifications</th>
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
                  {item.name}
                  {item.model && <span className="text-gray-600 text-[11px] block">{item.model}</span>}
                  {item.serials && item.serials.length > 0 && (
                    <span className="text-gray-500 text-[10px] block mt-0.5">
                      Serial(s): {item.serials.join(', ')}
                    </span>
                  )}
                </td>
                <td className="p-2 border-r border-black text-center font-bold">{item.quantity}</td>
                <td className="p-2 border-r border-black text-right">{formatCurrency(item.unit_price)}</td>
                <td className="p-2 text-right font-bold">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Summary Box */}
      <div className="flex justify-end mb-8">
        <div className="w-80 border border-black rounded-lg p-3 space-y-1.5 text-xs">
          {activeDoc.docType === 'installation_certificate' ? (
            <>
              <div className="flex justify-between font-bold">
                <span className="text-gray-700">Total Installed Equipment:</span>
                <span>{activeDoc.items?.length || 0} Line Items</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-700">Total System Value:</span>
                <span>{formatCurrency(activeDoc.grandTotal)}</span>
              </div>
              <div className="flex justify-between font-black text-sm border-t-2 border-black pt-1.5 text-black">
                <span>Commissioning Status:</span>
                <span className="text-black">PASSED & OPERATIONAL</span>
              </div>
            </>
          ) : activeDoc.docType === 'customer_ledger' ? (
            <>
              <div className="flex justify-between font-bold">
                <span className="text-gray-700">Total Solar Purchases (Debit):</span>
                <span>{formatCurrency(activeDoc.grandTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800">
                <span>Total Payment Received (Credit):</span>
                <span>{formatCurrency(activeDoc.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-sm border-t-2 border-black pt-1.5 text-black">
                <span>Net Account Balance Due:</span>
                <span>{formatCurrency(activeDoc.balanceDue)}</span>
              </div>
            </>
          ) : isInvoice ? (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Untaxed Amount (Subtotal):</span>
                <span className="font-semibold">{formatCurrency(untaxedSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sales Tax ({taxRate}% GST):</span>
                <span className="font-semibold">{formatCurrency(taxAmount)}</span>
              </div>
              {activeDoc.discount ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span>-{formatCurrency(activeDoc.discount)}</span>
                </div>
              ) : null}
              {activeDoc.installationCharges ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Installation Fee:</span>
                  <span>+{formatCurrency(activeDoc.installationCharges)}</span>
                </div>
              ) : null}
              {activeDoc.transportCharges ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transport:</span>
                  <span>+{formatCurrency(activeDoc.transportCharges)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-black text-sm border-t-2 border-black pt-1.5">
                <span>Taxed Grand Total:</span>
                <span>{formatCurrency(taxedGrandTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1">
                <span>Advance Paid / Received:</span>
                <span>{formatCurrency(activeDoc.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-xs pt-1 border-t border-dashed border-gray-400">
                <span>Balance Outstanding Due:</span>
                <span className={activeDoc.balanceDue > 0 ? 'text-black underline' : 'text-gray-600'}>
                  {formatCurrency(activeDoc.balanceDue)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatCurrency(activeDoc.subtotal)}</span>
              </div>
              {activeDoc.discount ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span>-{formatCurrency(activeDoc.discount)}</span>
                </div>
              ) : null}
              {activeDoc.installationCharges ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Installation Fee:</span>
                  <span>+{formatCurrency(activeDoc.installationCharges)}</span>
                </div>
              ) : null}
              {activeDoc.transportCharges ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transport:</span>
                  <span>+{formatCurrency(activeDoc.transportCharges)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-black text-sm border-t border-black pt-1">
                <span>Grand Total:</span>
                <span>{formatCurrency(activeDoc.grandTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-0.5">
                <span>Advance Received:</span>
                <span>{formatCurrency(activeDoc.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-xs pt-1 border-t border-dashed border-gray-400">
                <span>Balance Outstanding:</span>
                <span className={activeDoc.balanceDue > 0 ? 'text-black underline' : 'text-gray-600'}>
                  {formatCurrency(activeDoc.balanceDue)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Terms, Signatures & Shop Address */}
      <div className="mt-auto pt-6 border-t border-gray-300">
        {isInvoice ? (
          <div className="text-[11px] text-gray-800 mb-8 border border-gray-300 rounded-lg p-3 bg-gray-50/60">
            <b className="block text-black uppercase tracking-wider mb-1.5 text-xs font-black">
              Terms & Conditions (Deal Lock Agreement):
            </b>
            <div className="space-y-1.5 leading-relaxed text-gray-700">
              <p>
                <b className="text-black">• Ex-Warehouse (Ex -):</b> All materials and solar equipment are supplied on Ex-Warehouse Multan basis. Offloading, local carriage, and transit insurance are customer responsibility unless specifically contracted in writing.
              </p>
              <p>
                <b className="text-black">• Rate & Price Lock (Rate):</b> Quoted rates and invoice prices are locked strictly for <b>2 Days (Expired 2 Days)</b> from invoice date against USD exchange rate, currency parity, and market fluctuations.
              </p>
              <p>
                <b className="text-black">• Solar Panels & Equipment Warranty (Pannel):</b> Tier-1 Solar Panels include 12-year standard product warranty & 25-year linear performance warranty. Inverters carry 5-year replacement/service warranty. Physical damage, improper wiring, lightning or burnt damages are excluded.
              </p>
              <p>
                <b className="text-black">• Payment & Ownership:</b> Advance token locks product allotment for 2 days. 100% full cleared payment is mandatory prior to stock release or dispatch. Title remains with company until full settlement.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-gray-600 mb-8 whitespace-pre-line">
            <b>Terms & Conditions:</b>
            <br />
            {settings.terms}
          </div>
        )}

        {/* Signatures */}
        <div className="flex justify-between items-end pt-8 px-6">
          <div className="text-center">
            <div className="w-48 border-t border-black mb-1"></div>
            <p className="text-xs font-semibold">Customer Signature</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-t border-black mb-1"></div>
            <p className="text-xs font-semibold">Authorized Signature & Stamp</p>
          </div>
        </div>

        {/* Shop Address & Contact Details (Placed Down Below Signatures) */}
        <div className="mt-8 pt-4 border-t border-dashed border-gray-300 text-center space-y-1">
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
                <span>NTN: {settings.ntn}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
