/********************************************************************
 *  Records Management – paginated front-end
 *  Back-end:  https://malexoffice-bkdt.onrender.com/api/records
 *  20 rows per page  (change PAGE_SIZE if you wish)
 *******************************************************************/
const API       = 'https://malexoffice-bkdt.onrender.com/api/records';
const PAGE_SIZE = 20;               // rows per page

/* ---------- DOM shortcuts -------------------------------------- */
const els = {
    recordsTableBody: document.getElementById('recordsTableBody'),
    recordModal     : document.getElementById('recordModal'),
    addRecordBtn    : document.getElementById('addRecordBtn'),
    closeModal      : document.getElementById('closeModal'),
    cancelRecord    : document.getElementById('cancelRecord'),
    saveRecord      : document.getElementById('saveRecord'),
    recordForm      : document.getElementById('recordForm'),
    typeFilter      : document.getElementById('typeFilter'),
    searchInput     : document.getElementById('searchInput'),
    dateFilter      : document.getElementById('dateFilter'),
    customerFilter  : document.getElementById('customerFilter'),
    recordType      : document.getElementById('recordType'),
    amountField     : document.getElementById('amountField'),
    modalTitle      : document.getElementById('modalTitle'),
    paginationInfo  : document.querySelector('.pagination-info'),
    paginationCtrl  : document.querySelector('.pagination-controls')
};

/* ---------- state ------------------------------------------------
 *  fullData   : all 2000+ records (cached once)
 *  page       : current page (0-based)
 *------------------------------------------------------------ */
let fullData = [];      // cached after first fetch
let page     = 0;       // current page index

/* ---------- boot ------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
    fetchAllRecords();          // one-time load
    attachEventListeners();
});



/* ---------- 1.  LOAD ONCE --------------------------------------- */
async function fetchAllRecords() {
    try {
        const res = await fetch(API);
        if (!res.ok) throw new Error(res.statusText);
        fullData = await res.json();
        renderPage();           // initial draw
    } catch (e) {
        console.error(e);
        alert('Could not load records');
    }
}

/* ---------- 2.  RENDER 20-ROW PAGE ----------------------------- */
function renderPage() {
    const start = page * PAGE_SIZE;
    const end   = start + PAGE_SIZE;
    const slice = fullData.slice(start, end);
    els.recordsTableBody.innerHTML = '';
    if (!slice.length) {
        els.recordsTableBody.innerHTML = `
            <tr><td colspan="8">
                <div class="empty-state"><i class="fas fa-inbox"></i><h3>No records found</h3></div>
            </td></tr>`;
    }

    slice.forEach(r => {
        const docNo = r.invoiceNo || r.cashSaleNo || r.quotationNo;
        const type  = r.invoiceNo ? 'invoice' : r.cashSaleNo ? 'cashSale' : 'quotation';
        const tr    = document.createElement('tr');
        // Original date from backend
        const dateObj = new Date(r.date);

        // Subtract 3 hours to correct display time
        dateObj.setHours(dateObj.getHours() - 3);

        // Kenya date
        const eatDate = dateObj.toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        });

        // Kenya time
        const eatTime = dateObj.toLocaleTimeString('en-KE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });


        // Original date from backend
        /*const dateObj = new Date(r.date);

        // Subtract 3 hours to correct display time
        dateObj.setHours(dateObj.getHours() - 3);

        // Kenya date
        const eatDate = dateObj.toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        });

        // Kenya time
        const eatTime = dateObj.toLocaleTimeString('en-KE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });*/


        tr.innerHTML = `
           <td>${eatDate} &nbsp; ${eatTime}</td>

            <td>${r.customerName}</td>
            <td><span class="type-badge type-${type}">${type.charAt(0).toUpperCase()+type.slice(1)}</span></td>
            <td>${docNo}</td>
            <td class="amount">Ksh ${r.amount.toLocaleString()}</td>
            <td>${r.facilitator}</td>
            <td>${r.createdBy}</td>
            <td class="actions">
                <button class="action-btn action-edit" data-id="${r.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn action-delete" data-id="${r.id}"><i class="fas fa-trash"></i></button>
            </td>`;
        els.recordsTableBody.appendChild(tr);
    });

    /* pagination bar */
    const total = fullData.length;
    els.paginationInfo.textContent = `Showing ${start + 1}-${Math.min(end, total)} of ${total} records`;
    drawPagination(Math.ceil(total / PAGE_SIZE));
    attachRowActions();
}

/* ---------- 3.  PAGINATION BAR --------------------------------- */
function drawPagination(pages) {
    els.paginationCtrl.innerHTML = '';
    const maxBtn = 5;               // how many numeric buttons
    let startPg  = Math.max(0, page - Math.floor(maxBtn / 2));
    let endPg    = Math.min(pages - 1, startPg + maxBtn - 1);
    if (endPg - startPg < maxBtn - 1) startPg = Math.max(0, endPg - maxBtn + 1);

    /* Prev */
    const prev = document.createElement('button');
    prev.className = 'pagination-btn'; prev.disabled = page === 0;
    prev.textContent = 'Prev';
    prev.addEventListener('click', () => goPage(page - 1));
    els.paginationCtrl.appendChild(prev);

    /* numbers */
    for (let i = startPg; i <= endPg; i++) {
        const btn = document.createElement('button');
        btn.className = 'pagination-btn' + (i === page ? ' active' : '');
        btn.textContent = i + 1;
        btn.addEventListener('click', () => goPage(i));
        els.paginationCtrl.appendChild(btn);
    }

    /* Next */
    const next = document.createElement('button');
    next.className = 'pagination-btn'; next.disabled = page === pages - 1;
    next.textContent = 'Next';
    next.addEventListener('click', () => goPage(page + 1));
    els.paginationCtrl.appendChild(next);
}

function goPage(newPage) {
    page = newPage;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- 4.  MODAL (unchanged logic) ------------------------ */
function attachEventListeners() {
    els.addRecordBtn.addEventListener('click', () => openModal('Add New Record'));
    els.closeModal.addEventListener('click', closeModal);
    els.cancelRecord.addEventListener('click', closeModal);
    els.saveRecord.addEventListener('click', handleSave);
    els.recordType.addEventListener('change', toggleAmountField);

    /* filters work on current page (local) */
    els.typeFilter.addEventListener('change', filterLocal);
    els.searchInput.addEventListener('input', filterLocal);
    els.dateFilter.addEventListener('change', filterLocal);
    els.customerFilter.addEventListener('change', filterLocal);
}

function openModal(title, record = null) {
    els.modalTitle.textContent = title;
    els.recordForm.reset();
    delete els.recordForm.dataset.editId;
    if (record) {
        els.recordForm.dataset.editId = record.id;
        document.getElementById('recordDate').value = record.date.substr(0,10);
        document.getElementById('recordTime').value = record.time;
        document.getElementById('recordCustomer').value = record.customerName;
        document.getElementById('recordFacilitator').value = record.facilitator;
        document.getElementById('recordCreatedBy').value = record.createdBy;
        document.getElementById('recordAmount').value = record.amount;
        if (record.invoiceNo) {
            els.recordType.value = 'invoice';
            document.getElementById('documentNo').value = record.invoiceNo;
        } else if (record.cashSaleNo) {
            els.recordType.value = 'cashSale';
            document.getElementById('documentNo').value = record.cashSaleNo;
        } else {
            els.recordType.value = 'quotation';
            document.getElementById('documentNo').value = record.quotationNo;
        }
        toggleAmountField();
    }
    els.recordModal.style.display = 'flex';
}

function closeModal() {
    els.recordModal.style.display = 'none';
}

function toggleAmountField() {
    els.amountField.style.display = els.recordType.value === 'invoice' ? 'none' : 'flex';
}

async function handleSave() {
    if (!els.recordForm.checkValidity()) 
        return alert('Please fill in all required fields');
    
    const type  = els.recordType.value;
    const docNo = document.getElementById('documentNo').value;

    const payload = {
        date        : document.getElementById('recordDate').value,
        time        : document.getElementById('recordTime').value,
        customerName: document.getElementById('recordCustomer').value,
        facilitator : document.getElementById('recordFacilitator').value,
        amount      : +document.getElementById('recordAmount').value,
        createdBy   : document.getElementById('recordCreatedBy').value
    };

    // Add document type dynamically
    if (type === 'invoice')   payload.invoiceNo   = docNo;
    if (type === 'cashSale')  payload.cashSaleNo  = docNo;
    if (type === 'quotation') payload.quotationNo = docNo;

    const id  = els.recordForm.dataset.editId;
    const url = id 
        ? `https://malexoffice-bkdt.onrender.com/api/records/${id}` 
        : `https://malexoffice-bkdt.onrender.com/api/records`;

    try {
        const res = await fetch(url, {
            method : id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(payload)
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to save record");

        closeModal();
        fetchAllRecords();
        alert('Record saved!');
        
    } catch (e) {
        alert(e.message);
    }
}


async function editRecord(id) {
    const rec = fullData.find(r => r.id === id);
    if (rec) openModal('Edit Record', rec);
}

async function deleteRecord(id) {
    const confirmed = confirm('Delete this record? This action cannot be undone.');
    if (!confirmed) return;

    const API = 'https://malexoffice-bkdt.onrender.com/api/records';

    try {
        const res = await fetch(`${API}/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || res.statusText);
        }

        alert('Record deleted!');
        fetchAllRecords(); // Refresh table/list

    } catch (err) {
        alert(`Error: ${err.message}`);
    }
}


/* ---------- 5.  LOCAL FILTER (current page only) -------------- */
function filterLocal() {
    const typeVal   = els.typeFilter.value;
    const searchVal = els.searchInput.value.toLowerCase();
    const dateVal   = els.dateFilter.value;
    const custVal   = els.customerFilter.value;

    let filtered = fullData;

    if (typeVal !== 'all') {
        filtered = filtered.filter(r =>
            (typeVal==='invoice'   && r.invoiceNo)  ||
            (typeVal==='cashSale'  && r.cashSaleNo)||
            (typeVal==='quotation' && r.quotationNo));
    }
    if (searchVal) {
        filtered = filtered.filter(r =>
            r.customerName.toLowerCase().includes(searchVal) ||
            (r.invoiceNo||r.cashSaleNo||r.quotationNo).toLowerCase().includes(searchVal) ||
            r.facilitator.toLowerCase().includes(searchVal) ||
            r.createdBy.toLowerCase().includes(searchVal));
    }
    if (dateVal) filtered = filtered.filter(r => r.date.startsWith(dateVal));
    if (custVal !== 'all') filtered = filtered.filter(r => r.customerName === custVal);

    /* after filtering, reset to first page and re-paginate */
    fullData = filtered;   // now the filtered set becomes the data
    page = 0;
    renderPage();
}

/* ---------- helpers -------------------------------------------- */
function attachRowActions() {
    document.querySelectorAll('.action-edit').forEach(btn =>
        btn.addEventListener('click', () => editRecord(btn.dataset.id)));
    document.querySelectorAll('.action-delete').forEach(btn =>
        btn.addEventListener('click', () => deleteRecord(btn.dataset.id)));
}