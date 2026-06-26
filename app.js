// Default line items structure
const DEFAULT_ITEMS = [
  { description: "Course Fee", duration: "3 Months", qty: 1, rate: 12000 },
  { description: "Registration Fee", duration: "One-Time", qty: 1, rate: 500 },
  { description: "Study Materials", duration: "Complete Kit", qty: 1, rate: 1500 },
  { description: "Certification Fee", duration: "Exam & Certificate", qty: 1, rate: 1000 },
  { description: "Other Charges", duration: "N/A", qty: 0, rate: 0 }
];

// SVG representing default UPI QR code scan placeholder
const DEFAULT_QR_SVG = `
<svg class="w-full h-full text-slate-300" viewBox="0 0 100 100" fill="currentColor">
  <path d="M5 5h30v30H5V5zm6 6v18h18V11H11zm6 6h6v6h-6v-6zm48-12h30v30H65V5zm6 6v18h18V11H71zm6 6h6v6h-6v-6zM5 65h30v30H5V65zm6 6v18h18V71H11zm6 6h6v6h-6v-6zm56-8h6v6h-6v-6zm6 6h6v6h-6v-6zm6-6h6v6h-6v-6zm-12 12h6v6h-6v-6zm12 0h6v6h-6v-6zm-6 6h6v6h-6v-6zm-12 6h6v6h-6v-6zm12 0h6v6h-6v-6zm-18 6h6v6h-6v-6zm12 0h6v6h-6v-6zm-6-24h6v6h-6v-6zm12 0h6v6h-6v-6zm-24 12h6v6h-6v-6zm0 12h6v6h-6v-6zm12-6h6v6h-6v-6z" />
</svg>`;

// Base64 string variable for custom QR image
let uploadedQRBase64 = null;

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  resetInvoice();
  updateLedgerBadge();
});

// Setup DOM event listeners
function setupEventListeners() {
  // Add item row button
  document.getElementById("add-row-btn").addEventListener("click", () => {
    addItemRow("", "", 1, 0);
    calculateTotals();
  });

  // Event delegation for table inputs & actions
  const itemsBody = document.getElementById("invoice-items-body");
  
  itemsBody.addEventListener("input", (e) => {
    if (e.target.classList.contains("item-qty") || e.target.classList.contains("item-rate")) {
      const row = e.target.closest("tr");
      calculateRowAmount(row);
      calculateTotals();
    }
  });

  itemsBody.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".delete-row-btn");
    if (deleteBtn) {
      const row = deleteBtn.closest("tr");
      row.remove();
      updateRowNumbers();
      calculateTotals();
    }
  });

  // Fields triggering calculations
  document.getElementById("discount-input").addEventListener("input", calculateTotals);
  document.getElementById("gst-input").addEventListener("input", calculateTotals);
  document.getElementById("amount-paid").addEventListener("input", calculateTotals);

  // Buttons in dashboard
  document.getElementById("btn-generate-id").addEventListener("click", triggerRandomInvoiceNo);
  document.getElementById("btn-reset").addEventListener("click", resetInvoice);
  document.getElementById("btn-print").addEventListener("click", () => {
    closeMobileSidebar();
    saveToLedger();
    window.print();
  });
  document.getElementById("btn-pdf").addEventListener("click", () => {
    closeMobileSidebar();
    downloadPDF();
  });
  document.getElementById("btn-save-json").addEventListener("click", () => {
    closeMobileSidebar();
    saveAsJSON();
  });
  document.getElementById("btn-download-ledger").addEventListener("click", () => {
    closeMobileSidebar();
    exportLedgerToExcel();
  });
  document.getElementById("btn-clear-ledger").addEventListener("click", () => {
    closeMobileSidebar();
    clearLedger();
  });
  
  // Share buttons
  document.getElementById("btn-share-whatsapp").addEventListener("click", () => {
    closeMobileSidebar();
    shareViaWhatsApp();
  });
  document.getElementById("btn-share-email").addEventListener("click", () => {
    closeMobileSidebar();
    shareViaEmail();
  });
  document.getElementById("btn-share-sms").addEventListener("click", () => {
    closeMobileSidebar();
    shareViaSMS();
  });
  document.getElementById("btn-share-telegram").addEventListener("click", () => {
    closeMobileSidebar();
    shareViaTelegram();
  });
  document.getElementById("btn-share-copy").addEventListener("click", () => {
    closeMobileSidebar();
    copyToClipboard();
  });
  
  // File inputs
  document.getElementById("json-file-input").addEventListener("change", (e) => {
    closeMobileSidebar();
    loadFromJSON(e);
  });

  // Mobile drawer controls
  const toggleBtn = document.getElementById("btn-toggle-menu");
  const closeBtn = document.getElementById("btn-close-menu");
  const backdrop = document.getElementById("drawer-backdrop");
  const sidebar = document.getElementById("dashboard-sidebar");

  if (toggleBtn && sidebar && backdrop) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.add("open");
      backdrop.classList.add("active");
    });
  }

  if (closeBtn && sidebar && backdrop) {
    closeBtn.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("active");
    });
  }

  if (backdrop && sidebar) {
    backdrop.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("active");
    });
  }
  
  // Custom QR Code upload
  const qrUploadInput = document.getElementById("qr-upload");
  qrUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please upload a valid image file.");
        return;
      }
      
      // Limit size to 1MB
      if (file.size > 1024 * 1024) {
        alert("Image must be smaller than 1MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = function (event) {
        uploadedQRBase64 = event.target.result;
        displayQRImage(uploadedQRBase64);
      };
      reader.readAsDataURL(file);
    }
  });
}

// Generate random invoice number: AF-2026-XXXX
function triggerRandomInvoiceNo() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  document.getElementById("invoice-no").value = `AF-${year}-${rand}`;
}

// Populate today's date and due date
function setInitialDates() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  
  const todayStr = `${yyyy}-${mm}-${dd}`;
  document.getElementById("invoice-date").value = todayStr;

  // Due date default: +30 days
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 30);
  const dueY = dueDate.getFullYear();
  const dueM = String(dueDate.getMonth() + 1).padStart(2, '0');
  const dueD = String(dueDate.getDate()).padStart(2, '0');
  document.getElementById("due-date").value = `${dueY}-${dueM}-${dueD}`;
}

// Add a new row to the table (compact padding)
function addItemRow(description = "", duration = "", qty = 1, rate = 0) {
  const itemsBody = document.getElementById("invoice-items-body");
  const rowCount = itemsBody.children.length + 1;

  const tr = document.createElement("tr");
  tr.className = "border-b border-slate-200 hover:bg-slate-50 transition-colors";
  
  tr.innerHTML = `
    <td class="px-2 py-0.5 text-center text-[10px] font-semibold text-slate-500 row-sno">${rowCount}</td>
    <td class="px-2 py-0.5">
      <input type="text" class="canvas-input w-full font-medium text-slate-800 text-[10px]" value="${description}" placeholder="e.g. Course Tuition Fee">
    </td>
    <td class="px-2 py-0.5">
      <input type="text" class="canvas-input w-full text-center text-[10px] text-slate-600" value="${duration}" placeholder="e.g. 3 Months">
    </td>
    <td class="px-2 py-0.5">
      <input type="number" class="canvas-input w-full text-center no-spinner item-qty text-[10px]" value="${qty}" min="0" placeholder="0">
    </td>
    <td class="px-2 py-0.5">
      <input type="number" class="canvas-input w-full text-right no-spinner item-rate text-[10px]" value="${rate}" min="0" placeholder="0.00">
    </td>
    <td class="px-2 py-0.5 text-right text-slate-900 font-semibold px-3 item-amount text-[10px]">₹0.00</td>
    <td class="px-2 py-1 text-center no-print">
      <button class="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg p-1 transition-all duration-200 delete-row-btn" title="Delete Row">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </td>
  `;

  itemsBody.appendChild(tr);
  calculateRowAmount(tr);
}

// Calculate the amount for a specific row
function calculateRowAmount(row) {
  const qtyInput = row.querySelector(".item-qty");
  const rateInput = row.querySelector(".item-rate");
  const amountSpan = row.querySelector(".item-amount");

  const qty = parseFloat(qtyInput.value) || 0;
  const rate = parseFloat(rateInput.value) || 0;
  const amount = qty * rate;

  amountSpan.textContent = `₹${amount.toFixed(2)}`;
  return amount;
}

// Update row sequential S.No numbers
function updateRowNumbers() {
  const rows = document.querySelectorAll("#invoice-items-body tr");
  rows.forEach((row, index) => {
    row.querySelector(".row-sno").textContent = index + 1;
  });
}

// Calculate all fields, subtotals, taxes, and final balance
function calculateTotals() {
  const rows = document.querySelectorAll("#invoice-items-body tr");
  let subtotal = 0;

  rows.forEach(row => {
    const qty = parseFloat(row.querySelector(".item-qty").value) || 0;
    const rate = parseFloat(row.querySelector(".item-rate").value) || 0;
    subtotal += qty * rate;
  });

  // Inputs
  const discount = parseFloat(document.getElementById("discount-input").value) || 0;
  const gstPercent = parseFloat(document.getElementById("gst-input").value) || 0;
  const amountPaid = parseFloat(document.getElementById("amount-paid").value) || 0;

  // Base math
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const gstAmount = subtotalAfterDiscount * (gstPercent / 100);
  const grandTotal = subtotalAfterDiscount + gstAmount;
  const balanceDue = grandTotal - amountPaid;

  // DOM update
  document.getElementById("lbl-subtotal").textContent = `₹${subtotal.toFixed(2)}`;
  document.getElementById("lbl-gst-amount").textContent = `₹${gstAmount.toFixed(2)}`;
  document.getElementById("lbl-grand-total").textContent = `₹${grandTotal.toFixed(2)}`;
  
  // Format balance and update badge status
  const balanceEl = document.getElementById("lbl-balance-due");
  const statusBadge = document.getElementById("payment-status-badge");
  
  balanceEl.value = balanceDue.toFixed(2);
  
  if (grandTotal === 0) {
    statusBadge.className = "px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-500 border border-slate-200";
    statusBadge.textContent = "DRAFT";
  } else if (balanceDue <= 0) {
    statusBadge.className = "px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200";
    statusBadge.textContent = "PAID IN FULL";
  } else if (amountPaid > 0 && balanceDue > 0) {
    statusBadge.className = "px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-200";
    statusBadge.textContent = "PARTIALLY PAID";
  } else {
    statusBadge.className = "px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-600 border border-rose-200";
    statusBadge.textContent = "UNPAID";
  }
}

// Display custom QR image or SVG
function displayQRImage(srcOrSvg) {
  const container = document.getElementById("qr-placeholder-container");
  if (srcOrSvg && srcOrSvg.startsWith("data:image")) {
    container.innerHTML = `<img src="${srcOrSvg}" alt="Scan and Pay QR Code" class="w-full h-full object-contain" />`;
  } else {
    container.innerHTML = DEFAULT_QR_SVG;
  }
}

// Reset the entire page state
function resetInvoice() {
  closeMobileSidebar();
  // Brand details check is static in HTML, reset metadata and inputs
  triggerRandomInvoiceNo();
  setInitialDates();

  // Reset Student Bill To
  document.getElementById("student-name").value = "";
  document.getElementById("student-id").value = "";
  document.getElementById("student-enrollment").value = "";
  document.getElementById("student-session").value = "";
  document.getElementById("student-course").value = "";
  document.getElementById("student-batch").value = "";
  document.getElementById("student-mobile").value = "";
  document.getElementById("student-address").value = "";

  // Reset Items table
  const itemsBody = document.getElementById("invoice-items-body");
  itemsBody.innerHTML = "";
  DEFAULT_ITEMS.forEach(item => {
    addItemRow(item.description, item.duration, item.qty, item.rate);
  });

  // Reset Payments
  document.getElementById("discount-input").value = "0";
  document.getElementById("gst-input").value = "18";
  document.getElementById("amount-paid").value = "0";
  document.getElementById("transaction-id").value = "";

  // Reset payment checkboxes
  const modes = ["mode-cash", "mode-upi", "mode-bank", "mode-card", "mode-cheque"];
  modes.forEach(id => {
    document.getElementById(id).checked = false;
  });
  // Default to UPI checked
  document.getElementById("mode-upi").checked = true;

  // Reset QR
  document.getElementById("upi-id").value = "alphafly@okaxis";
  uploadedQRBase64 = null;
  displayQRImage(null);
  document.getElementById("qr-upload").value = "";

  calculateTotals();
}

// ============================================================
// COLLECT INVOICE DATA (shared helper for save/share/export)
// ============================================================
function collectInvoiceData() {
  const items = [];
  const rows = document.querySelectorAll("#invoice-items-body tr");
  
  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    items.push({
      description: cells[1] ? cells[1].querySelector("input").value : "",
      duration: cells[2] ? cells[2].querySelector("input").value : "",
      qty: parseFloat(row.querySelector(".item-qty").value) || 0,
      rate: parseFloat(row.querySelector(".item-rate").value) || 0
    });
  });

  const modes = {
    cash: document.getElementById("mode-cash").checked,
    upi: document.getElementById("mode-upi").checked,
    bank: document.getElementById("mode-bank").checked,
    card: document.getElementById("mode-card").checked,
    cheque: document.getElementById("mode-cheque").checked
  };

  // Collect active payment modes as string
  const activeModes = Object.entries(modes)
    .filter(([, v]) => v)
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
    .join(", ");

  const discount = parseFloat(document.getElementById("discount-input").value) || 0;
  const gstPercent = parseFloat(document.getElementById("gst-input").value) || 0;
  const amountPaid = parseFloat(document.getElementById("amount-paid").value) || 0;

  let subtotal = 0;
  items.forEach(item => { subtotal += item.qty * item.rate; });
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const gstAmount = subtotalAfterDiscount * (gstPercent / 100);
  const grandTotal = subtotalAfterDiscount + gstAmount;
  const balanceDue = grandTotal - amountPaid;

  const statusBadge = document.getElementById("payment-status-badge");

  return {
    invoiceNo: document.getElementById("invoice-no").value,
    invoiceDate: document.getElementById("invoice-date").value,
    dueDate: document.getElementById("due-date").value,
    studentName: document.getElementById("student-name").value,
    studentId: document.getElementById("student-id").value,
    enrollment: document.getElementById("student-enrollment").value,
    session: document.getElementById("student-session").value,
    course: document.getElementById("student-course").value,
    batch: document.getElementById("student-batch").value,
    mobile: document.getElementById("student-mobile").value,
    address: document.getElementById("student-address").value,
    items,
    discount,
    gstPercent,
    amountPaid,
    transactionId: document.getElementById("transaction-id").value,
    paymentModes: modes,
    activeModesStr: activeModes,
    upiId: document.getElementById("upi-id").value,
    qrImage: uploadedQRBase64,
    subtotal,
    gstAmount,
    grandTotal,
    balanceDue,
    status: statusBadge.textContent
  };
}

// ============================================================
// GENERATE SHARE TEXT SUMMARY
// ============================================================
function generateShareText() {
  const d = collectInvoiceData();

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const parts = dateStr.split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  let text = `📄 INVOICE: ${d.invoiceNo || "N/A"}\n`;
  text += `📅 Date: ${formatDate(d.invoiceDate)} | Due: ${formatDate(d.dueDate)}\n`;
  text += `👤 Student: ${d.studentName || "N/A"}`;
  if (d.enrollment) text += ` (${d.enrollment})`;
  if (d.course) text += ` | Course: ${d.course}`;
  if (d.session) text += ` | Year: ${d.session}`;
  text += `\n`;
  
  if (d.items.length > 0) {
    text += `\n── Fee Details ──\n`;
    d.items.forEach((item, i) => {
      if (item.description) {
        const amt = (item.qty * item.rate).toFixed(2);
        text += `${i + 1}. ${item.description} — ₹${amt}\n`;
      }
    });
  }

  text += `\n💰 Subtotal: ₹${d.subtotal.toFixed(2)}`;
  if (d.discount > 0) text += ` | Discount: ₹${d.discount.toFixed(2)}`;
  text += `\n`;
  if (d.gstPercent > 0) text += `📊 GST (${d.gstPercent}%): ₹${d.gstAmount.toFixed(2)}\n`;
  text += `🏷️ Grand Total: ₹${d.grandTotal.toFixed(2)}\n`;
  text += `💳 Paid: ₹${d.amountPaid.toFixed(2)} | Balance: ₹${d.balanceDue.toFixed(2)}\n`;
  text += `📌 Status: ${d.status}\n`;
  if (d.activeModesStr) text += `💰 Payment: ${d.activeModesStr}\n`;
  text += `\n🏫 Alphafly Computer Education, Theni\n📞 8015 8016 89`;

  return text;
}

// ============================================================
// SHARING FUNCTIONS
// ============================================================
function shareViaWhatsApp() {
  const text = generateShareText();
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

function shareViaEmail() {
  const d = collectInvoiceData();
  const subject = `Invoice ${d.invoiceNo || "Alphafly"} — ${d.studentName || "Student"}`;
  const body = generateShareText();
  window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_self");
}

function shareViaSMS() {
  const text = generateShareText();
  window.open(`sms:?body=${encodeURIComponent(text)}`, "_self");
}

function shareViaTelegram() {
  const text = generateShareText();
  window.open(`https://t.me/share/url?text=${encodeURIComponent(text)}`, "_blank");
}

function copyToClipboard() {
  const text = generateShareText();
  navigator.clipboard.writeText(text).then(() => {
    showToast("Copied to clipboard!");
  }).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showToast("Copied to clipboard!");
  });
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(message) {
  const toast = document.getElementById("toast");
  const msgEl = document.getElementById("toast-message");
  msgEl.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// ============================================================
// LEDGER & AUTO-SAVE LOGIC
// ============================================================
function updateLedgerBadge() {
  const ledger = JSON.parse(localStorage.getItem("invoiceLedger") || "[]");
  const badge = document.getElementById("ledger-count-badge");
  if (badge) {
    badge.textContent = ledger.length;
  }
}

function saveToLedger() {
  const d = collectInvoiceData();
  let ledger = JSON.parse(localStorage.getItem("invoiceLedger") || "[]");
  
  // Update if invoice no exists, else push
  const existingIdx = ledger.findIndex(inv => inv.invoiceNo === d.invoiceNo);
  if (existingIdx >= 0) {
    ledger[existingIdx] = d;
  } else {
    ledger.push(d);
  }
  
  localStorage.setItem("invoiceLedger", JSON.stringify(ledger));
  updateLedgerBadge();
}

function clearLedger() {
  if (confirm("Are you sure you want to clear the invoice ledger? This cannot be undone.")) {
    localStorage.removeItem("invoiceLedger");
    updateLedgerBadge();
    showToast("Ledger cleared!");
  }
}

// ============================================================
// EXPORT LEDGER TO EXCEL (SheetJS)
// ============================================================
function exportLedgerToExcel() {
  const ledger = JSON.parse(localStorage.getItem("invoiceLedger") || "[]");
  
  if (ledger.length === 0) {
    alert("The ledger is empty. Generate and save/print invoices first.");
    return;
  }

  // Sheet 1: Ledger Summary (All Invoices)
  const summaryHeaders = [
    "Invoice No", "Date", "Due Date", "Status", "Student Name", "Enrollment No", "Academic Year", "Course", 
    "Subtotal (₹)", "Discount (₹)", "GST (₹)", "Grand Total (₹)", "Amount Paid (₹)", "Balance Due (₹)", "Payment Modes"
  ];
  
  const summaryRows = ledger.map(d => [
    d.invoiceNo, d.invoiceDate, d.dueDate, d.status, d.studentName, d.enrollment || "", d.session || "", d.course,
    d.subtotal, d.discount, d.gstAmount, d.grandTotal, d.amountPaid, d.balanceDue, d.activeModesStr
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  ws1["!cols"] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];

  // Sheet 2: All Line Items (Flattened)
  const itemHeaders = ["Invoice No", "Student Name", "S.No", "Description", "Duration", "Qty", "Rate (₹)", "Amount (₹)"];
  const itemRows = [];
  
  ledger.forEach(d => {
    d.items.forEach((item, i) => {
      itemRows.push([
        d.invoiceNo,
        d.studentName,
        i + 1,
        item.description,
        item.duration,
        item.qty,
        item.rate,
        (item.qty * item.rate)
      ]);
    });
  });

  const ws2 = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows]);
  ws2["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 6 }, { wch: 30 }, { wch: 18 }, { wch: 6 }, { wch: 12 }, { wch: 14 }];

  // Create workbook with both sheets
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "Ledger Summary");
  XLSX.utils.book_append_sheet(wb, ws2, "All Fee Items");

  // Download
  const filename = `Alphafly_Invoice_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast("Ledger downloaded!");
}

// ============================================================
// SAVE AS JSON
// ============================================================
function saveAsJSON() {
  const d = collectInvoiceData();

  const invoiceData = {
    metadata: {
      invoiceNo: d.invoiceNo,
      invoiceDate: d.invoiceDate,
      dueDate: d.dueDate
    },
    student: {
      name: d.studentName,
      id: d.studentId,
      enrollment: d.enrollment,
      session: d.session,
      course: d.course,
      batch: d.batch,
      mobile: d.mobile,
      address: d.address
    },
    items: d.items,
    financials: {
      discount: d.discount,
      gstPercent: d.gstPercent,
      amountPaid: d.amountPaid,
      transactionId: d.transactionId
    },
    paymentModes: d.paymentModes,
    qr: {
      upiId: d.upiId,
      qrImage: d.qrImage
    }
  };

  const jsonStr = JSON.stringify(invoiceData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Invoice_${d.invoiceNo || 'AF-export'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  saveToLedger();
  showToast("JSON backup saved!");
}

// ============================================================
// LOAD FROM JSON
// ============================================================
function loadFromJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);
      
      // Load Metadata
      if (data.metadata) {
        document.getElementById("invoice-no").value = data.metadata.invoiceNo || "";
        document.getElementById("invoice-date").value = data.metadata.invoiceDate || "";
        document.getElementById("due-date").value = data.metadata.dueDate || "";
      }

      // Load Student
      if (data.student) {
        document.getElementById("student-name").value = data.student.name || "";
        document.getElementById("student-id").value = data.student.id || "";
        document.getElementById("student-enrollment").value = data.student.enrollment || "";
        document.getElementById("student-session").value = data.student.session || "";
        document.getElementById("student-course").value = data.student.course || "";
        document.getElementById("student-batch").value = data.student.batch || "";
        document.getElementById("student-mobile").value = data.student.mobile || "";
        document.getElementById("student-address").value = data.student.address || "";
      }

      // Load Items
      if (Array.isArray(data.items)) {
        const itemsBody = document.getElementById("invoice-items-body");
        itemsBody.innerHTML = "";
        data.items.forEach(item => {
          addItemRow(item.description, item.duration, item.qty, item.rate);
        });
      }

      // Load Financials
      if (data.financials) {
        document.getElementById("discount-input").value = data.financials.discount || 0;
        document.getElementById("gst-input").value = data.financials.gstPercent || 0;
        document.getElementById("amount-paid").value = data.financials.amountPaid || 0;
        document.getElementById("transaction-id").value = data.financials.transactionId || "";
      }

      // Load Checkboxes
      if (data.paymentModes) {
        document.getElementById("mode-cash").checked = !!data.paymentModes.cash;
        document.getElementById("mode-upi").checked = !!data.paymentModes.upi;
        document.getElementById("mode-bank").checked = !!data.paymentModes.bank;
        document.getElementById("mode-card").checked = !!data.paymentModes.card;
        document.getElementById("mode-cheque").checked = !!data.paymentModes.cheque;
      }

      // Load QR details
      if (data.qr) {
        document.getElementById("upi-id").value = data.qr.upiId || "";
        uploadedQRBase64 = data.qr.qrImage || null;
        displayQRImage(uploadedQRBase64);
      }

      calculateTotals();
      showToast("Invoice loaded successfully!");
      
      // Clear input so file can be uploaded again
      e.target.value = "";
    } catch(err) {
      alert("Error parsing JSON file. Please ensure it is a valid Alphafly invoice JSON.");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

// ============================================================
// DOWNLOAD PDF
// ============================================================
function downloadPDF() {
  const element = document.getElementById("invoice-canvas");
  const invoiceNo = document.getElementById("invoice-no").value || "AF-Invoice";

  // Temporarily adjust elements for cleaner PDF render
  document.body.classList.add("pdf-rendering");
  
  const options = {
    margin: 0,
    filename: `Invoice_${invoiceNo}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      logging: false,
      letterRendering: true
    },
    jsPDF: { 
      unit: "mm", 
      format: "b5", 
      orientation: "portrait" 
    }
  };

  html2pdf().set(options).from(element).save().then(() => {
    document.body.classList.remove("pdf-rendering");
    saveToLedger();
    showToast("PDF downloaded!");
  }).catch(err => {
    console.error("PDF generation error: ", err);
    document.body.classList.remove("pdf-rendering");
    alert("An error occurred during PDF generation. Please try native print instead.");
  });
}

// Helper to close mobile responsive sidebar
function closeMobileSidebar() {
  const sidebar = document.getElementById("dashboard-sidebar");
  const backdrop = document.getElementById("drawer-backdrop");
  if (sidebar && backdrop) {
    sidebar.classList.remove("open");
    backdrop.classList.remove("active");
  }
}

// ============================================================
// RESPONSIVE CANVAS SCALING
// ============================================================
function applyCanvasScale() {
  const canvas = document.getElementById("invoice-canvas");
  if (!canvas) return;

  const CANVAS_WIDTH_MM = 176;
  const MM_TO_PX = 3.7795275591; // 1mm = 3.7795px at 96dpi
  const canvasWidthPx = CANVAS_WIDTH_MM * MM_TO_PX; // ~665px

  // Only apply dynamic scaling on mobile (< 768px)
  if (window.innerWidth >= 768) {
    canvas.style.transform = "";
    canvas.style.marginBottom = "";
    return;
  }

  // Available width: viewport minus padding (24px each side on mobile)
  const availableWidth = window.innerWidth - 32;
  const scale = Math.min(1, availableWidth / canvasWidthPx);

  const CANVAS_HEIGHT_MM = 250;
  const canvasHeightPx = CANVAS_HEIGHT_MM * MM_TO_PX;
  // After scaling, canvas occupies scale*height. The rest collapses, so add negative margin
  const marginBottom = canvasHeightPx * (scale - 1);

  canvas.style.transformOrigin = "top center";
  canvas.style.transform = `scale(${scale})`;
  canvas.style.marginBottom = `${marginBottom}px`;
}

// Run on load and on every resize
window.addEventListener("DOMContentLoaded", applyCanvasScale);
window.addEventListener("resize", applyCanvasScale);
