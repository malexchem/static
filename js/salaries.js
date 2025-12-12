const API_BASE = 'https://malexoffice-bkdt.onrender.com/api';

// DOM elements
let employeesTableBody, salaryCycleTableBody, salaryHistoryTableBody;
let employeeModal, salaryDetailsModal, startCycleModal;
let addEmployeeBtn, startSalaryCycleBtn, processPayrollBtn;
let selectAllCheckbox, selectAllBtn, deselectAllBtn, employeeSearch;

let currentSalaryCycle = null;
let employees = [];
let salaryDistributionChart = null;
let commissionChart = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    loadEmployees();
    loadCurrentSalaryCycle();
    loadSalaryHistory();
    setupEventListeners();
    updateDashboardTotals();
});

// Initialize DOM elements safely
function initializeDOMElements() {
    employeesTableBody = document.getElementById('employeesTableBody');
    salaryCycleTableBody = document.getElementById('salaryCycleTableBody');
    salaryHistoryTableBody = document.getElementById('salaryHistoryTableBody');
    employeeModal = document.getElementById('employeeModal');
    salaryDetailsModal = document.getElementById('salaryDetailsModal');
    startCycleModal = document.getElementById('startCycleModal');
    addEmployeeBtn = document.getElementById('addEmployeeBtn');
    startSalaryCycleBtn = document.getElementById('startSalaryCycleBtn');
    processPayrollBtn = document.getElementById('processPayrollBtn');
    selectAllCheckbox = document.getElementById('selectAllCheckbox');
    selectAllBtn = document.getElementById('selectAllBtn');
    deselectAllBtn = document.getElementById('deselectAllBtn');
    employeeSearch = document.getElementById('employeeSearch');

}

// Load employees from API
async function loadEmployees() {
    try {
        showLoading('employeesTableBody', 'Loading employees...');
        
        const res = await fetch(`${API_BASE}/employees`);
        const data = await res.json();
        
        if (data.success) {
            employees = data.data;
            renderEmployees(employees);
            updateDashboardTotals();
        }
    } catch (err) {
        console.error('Failed to load employees', err);
        showError('employeesTableBody', 'Failed to load employees');
    }
}

// Load current salary cycle
async function loadCurrentSalaryCycle() {
    try {
        const res = await fetch(`${API_BASE}/salary-cycles/current`);
        
        if (res.status === 404) {
            // No active cycle found - this is normal
            console.log('No active salary cycle found');
            hideCurrentCycleSection();
            return;
        }
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.success) {
            currentSalaryCycle = data.data;
            showCurrentCycleSection();
            loadSalaryCycleEmployees();
        } else {
            hideCurrentCycleSection();
        }
    } catch (err) {
        console.error('Failed to load current salary cycle', err);
        hideCurrentCycleSection();
    }
}

function showCurrentCycleSection() {
    const section = document.getElementById('currentCycleSection');
    if (section) {
        document.getElementById('cycleMonth').textContent = currentSalaryCycle.cycleName;
        section.style.display = 'block';
        
        // Re-initialize cycle-specific event listeners
        initializeCycleEventListeners();
    }
}

function hideCurrentCycleSection() {
    const section = document.getElementById('currentCycleSection');
    if (section) {
        section.style.display = 'none';
    }
}

// Load salary history
async function loadSalaryHistory() {
    try {
        showLoading('salaryHistoryTableBody', 'Loading salary history...');
        
        const currentYear = new Date().getFullYear();
        const res = await fetch(`${API_BASE}/salary-payments?year=${currentYear}`);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.success) {
            renderSalaryHistory(data.data);
        }
    } catch (err) {
        console.error('Failed to load salary history', err);
        showError('salaryHistoryTableBody', 'Failed to load salary history');
    }
}

// Set up event listeners safely
function setupEventListeners() {
    // Employee modal - these elements should always exist
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => {
            document.getElementById('employeeModalTitle').textContent = 'Add New Employee';
            document.getElementById('employeeForm').reset();
            employeeModal.style.display = 'flex';
        });
    }
    
    // Modal close buttons
    const closeEmployeeModal = document.getElementById('closeEmployeeModal');
    const cancelEmployee = document.getElementById('cancelEmployee');
    const closeCycleModal = document.getElementById('closeCycleModal');
    const cancelStartCycle = document.getElementById('cancelStartCycle');
    const closeSalaryModal = document.getElementById('closeSalaryModal');
    const cancelSalaryDetails = document.getElementById('cancelSalaryDetails');
    
    if (closeEmployeeModal) closeEmployeeModal.addEventListener('click', () => employeeModal.style.display = 'none');
    if (cancelEmployee) cancelEmployee.addEventListener('click', () => employeeModal.style.display = 'none');
    if (closeCycleModal) closeCycleModal.addEventListener('click', () => startCycleModal.style.display = 'none');
    if (cancelStartCycle) cancelStartCycle.addEventListener('click', () => startCycleModal.style.display = 'none');
    if (closeSalaryModal) closeSalaryModal.addEventListener('click', () => salaryDetailsModal.style.display = 'none');
    if (cancelSalaryDetails) cancelSalaryDetails.addEventListener('click', () => salaryDetailsModal.style.display = 'none');
    
    // Form submissions
    const saveEmployeeBtn = document.getElementById('saveEmployee');
    const confirmStartCycle = document.getElementById('confirmStartCycle');
    const saveSalaryDetailsBtn = document.getElementById('saveSalaryDetails');
    
    if (saveEmployeeBtn) saveEmployeeBtn.addEventListener('click', saveEmployee);
    if (confirmStartCycle) confirmStartCycle.addEventListener('click', startSalaryCycle);
    if (saveSalaryDetailsBtn) saveSalaryDetailsBtn.addEventListener('click', saveSalaryDetails);
    
    // Salary cycle modal
    if (startSalaryCycleBtn) {
        startSalaryCycleBtn.addEventListener('click', () => {
            // Set default payment date to end of current month
            const today = new Date();
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            document.getElementById('paymentDate').value = lastDay.toISOString().split('T')[0];
            
            startCycleModal.style.display = 'flex';
        });
    }
    
    // Initialize cycle-specific listeners if cycle section is visible
    if (document.getElementById('currentCycleSection')?.style.display !== 'none') {
        initializeCycleEventListeners();
    }
    
    // Filters and search - check if elements exist
    const positionFilter = document.getElementById('positionFilter');
    const statusFilter = document.getElementById('statusFilter');
    const historyMonthFilter = document.getElementById('historyMonthFilter');
    const historyYearFilter = document.getElementById('historyYearFilter');
    
    if (positionFilter) positionFilter.addEventListener('change', filterEmployees);
    if (statusFilter) statusFilter.addEventListener('change', filterEmployees);
    if (historyMonthFilter) historyMonthFilter.addEventListener('change', filterSalaryHistory);
    if (historyYearFilter) historyYearFilter.addEventListener('change', filterSalaryHistory);
    if (employeeSearch) employeeSearch.addEventListener('input', filterSalaryCycleEmployees);
    
    // Real-time calculation
    const editCommission = document.getElementById('editCommission');
    const editAllowances = document.getElementById('editAllowances');
    const editDeductions = document.getElementById('editDeductions');
    
    if (editCommission) editCommission.addEventListener('input', updateTotalSalary);
    if (editAllowances) editAllowances.addEventListener('input', updateTotalSalary);
    if (editDeductions) editDeductions.addEventListener('input', updateTotalSalary);
}

// Initialize cycle-specific event listeners
function initializeCycleEventListeners() {
    // Process payroll button
    if (processPayrollBtn) {
        processPayrollBtn.addEventListener('click', processPayroll);
    }
    
    // Bulk actions
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', toggleSelectAll);
    }
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllEmployees);
    }
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', deselectAllEmployees);
    }
    
    // Update select all checkbox
    updateSelectAllCheckbox();
}

// Render employees table
function renderEmployees(employeesList) {
    if (!employeesTableBody) return;
    
    employeesTableBody.innerHTML = '';
    
    if (employeesList.length === 0) {
        employeesTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: var(--gray-dark);">
                    No employees found
                </td>
            </tr>
        `;
        return;
    }
    
    employeesList.forEach(employee => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${employee.firstName} ${employee.lastName}</td>
            <td>${formatPosition(employee.position)}</td>
            <td>Ksh ${employee.basicSalary?.toLocaleString() || '0'}</td>
            <td>${employee.commissionRate || 0}%</td>
            <td>${formatPaymentMethod(employee.paymentMethod)}</td>
            <td><span class="status-badge status-${employee.status}">${employee.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit btn-sm" data-id="${employee._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete btn-sm" data-id="${employee._id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        employeesTableBody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            editEmployee(id);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            deleteEmployee(id);
        });
    });
}

// Save employee (add or edit)
async function saveEmployee() {
    const form = document.getElementById('employeeForm');
    
    if (!form.checkValidity()) {
        alert('Please fill in all required fields');
        return;
    }
    
    const id = document.getElementById('saveEmployee').getAttribute('data-id');
    const isEdit = id !== null;
    
    const employeeData = {
        firstName: document.getElementById('employeeFirstName').value,
        lastName: document.getElementById('employeeLastName').value,
        position: document.getElementById('employeePosition').value,
        basicSalary: parseFloat(document.getElementById('employeeSalary').value) || 0,
        commissionRate: parseFloat(document.getElementById('employeeCommission').value) || 0,
        paymentMethod: document.getElementById('employeePaymentMethod').value,
        email: document.getElementById('employeeEmail').value,
        phone: document.getElementById('employeePhone').value
    };
    
    try {
        let response;
        
        if (isEdit) {
            response = await fetch(`${API_BASE}/employees/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(employeeData)
            });
        } else {
            response = await fetch(`${API_BASE}/employees`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(employeeData)
            });
        }
        
        const data = await response.json();
        
        if (data.success) {
            employeeModal.style.display = 'none';
            document.getElementById('saveEmployee').removeAttribute('data-id');
            loadEmployees();
            
            // If there's an active salary cycle, refresh it
            if (currentSalaryCycle) {
                loadCurrentSalaryCycle();
            }
            
            alert(isEdit ? 'Employee updated successfully!' : 'Employee created successfully!');
        } else {
            alert(data.error || 'Error saving employee');
        }
    } catch (err) {
        console.error('Error saving employee', err);
        alert('Network error occurred');
    }
}

// Edit employee
function editEmployee(id) {
    const employee = employees.find(emp => emp._id === id);
    
    if (employee) {
        document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
        document.getElementById('employeeFirstName').value = employee.firstName || '';
        document.getElementById('employeeLastName').value = employee.lastName || '';
        document.getElementById('employeePosition').value = employee.position || '';
        document.getElementById('employeeSalary').value = employee.basicSalary || 0;
        document.getElementById('employeeCommission').value = employee.commissionRate || 0;
        document.getElementById('employeePaymentMethod').value = employee.paymentMethod || '';
        document.getElementById('employeeEmail').value = employee.email || '';
        document.getElementById('employeePhone').value = employee.phone || '';
        
        document.getElementById('saveEmployee').setAttribute('data-id', id);
        employeeModal.style.display = 'flex';
    }
}

// Delete employee
async function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        try {
            const response = await fetch(`${API_BASE}/employees/${id}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                loadEmployees();
                
                // If there's an active salary cycle, refresh it
                if (currentSalaryCycle) {
                    loadCurrentSalaryCycle();
                }
                
                alert('Employee deleted successfully!');
            } else {
                alert(data.error || 'Error deleting employee');
            }
        } catch (err) {
            console.error('Error deleting employee', err);
            alert('Network error occurred');
        }
    }
}

// Start a new salary cycle
async function startSalaryCycle() {
    const form = document.getElementById('startCycleForm');
    
    if (!form.checkValidity()) {
        alert('Please fill in all required fields');
        return;
    }
    
    const month = parseInt(document.getElementById('salaryMonth').value);
    const year = parseInt(document.getElementById('salaryYear').value);
    const paymentDate = document.getElementById('paymentDate').value;
    const includeAll = document.getElementById('includeAllEmployees').checked;
    
    const cycleData = {
        month,
        year,
        paymentDate,
        includeAllEmployees: includeAll
    };
    
    try {
        const response = await fetch(`${API_BASE}/salary-cycles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cycleData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            startCycleModal.style.display = 'none';
            loadCurrentSalaryCycle();
            alert('Salary cycle started successfully!');
        } else {
            alert(data.error || 'Error starting salary cycle');
        }
    } catch (err) {
        console.error('Error starting salary cycle', err);
        alert('Network error occurred');
    }
}

// Load employees into the current salary cycle
function loadSalaryCycleEmployees() {
    if (!currentSalaryCycle || !salaryCycleTableBody) return;
    
    salaryCycleTableBody.innerHTML = '';
    
    if (!currentSalaryCycle.employees || currentSalaryCycle.employees.length === 0) {
        salaryCycleTableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 20px; color: var(--gray-dark);">
                    No employees in this salary cycle
                </td>
            </tr>
        `;
        return;
    }
    
    currentSalaryCycle.employees.forEach(entry => {
        const employee = entry.employee || {};
        const total = (entry.basicSalary || 0) + (entry.commission || 0) + (entry.allowances || 0) - (entry.deductions || 0);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="employee-checkbox" data-id="${entry._id}" ${entry.status === 'pending' ? 'checked' : ''}></td>
            <td>${employee.firstName || ''} ${employee.lastName || ''}</td>
            <td>${formatPosition(employee.position)}</td>
            <td>Ksh ${(entry.basicSalary || 0).toLocaleString()}</td>
            <td>
                Ksh ${(entry.commission || 0).toLocaleString()}
            </td>
            <td>Ksh ${(entry.allowances || 0).toLocaleString()}</td>
            <td>Ksh ${(entry.deductions || 0).toLocaleString()}</td>
            <td>Ksh ${total.toLocaleString()}</td>
            <td><span class="status-badge status-${entry.status || 'pending'}">${entry.status || 'pending'}</span></td>
            <button class="btn btn-edit btn-sm edit-commission" data-id="${entry._id}">
                    <i class="fas fa-edit"></i>
            </button>
        `;
        salaryCycleTableBody.appendChild(row);
    });
    
    // Add event listeners to checkboxes and edit buttons
    document.querySelectorAll('.employee-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            // Note: In a real implementation, you might want to update the backend
            // when an employee is selected/deselected
        });
    });
    
    document.querySelectorAll('.edit-commission').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const entryId = e.currentTarget.getAttribute('data-id');
            editSalaryDetails(entryId);
        });
    });
    
    updateSelectAllCheckbox();
}

// Edit salary details for an employee in the current cycle
function editSalaryDetails(entryId) {
    if (!currentSalaryCycle || !currentSalaryCycle.employees) return;
    
    const entry = currentSalaryCycle.employees.find(emp => emp._id === entryId);
    
    if (entry) {
        const employee = entry.employee || {};
        
        document.getElementById('salaryEmployeeName').textContent = `${employee.firstName || ''} ${employee.lastName || ''}`;
        document.getElementById('salaryEmployeePosition').textContent = formatPosition(employee.position);
        document.getElementById('editBasicSalary').value = entry.basicSalary || 0;
        document.getElementById('editCommission').value = entry.commission || 0;
        document.getElementById('editAllowances').value = entry.allowances || 0;
        document.getElementById('editDeductions').value = entry.deductions || 0;
        document.getElementById('editTotalSalary').value = (entry.basicSalary || 0) + (entry.commission || 0) + (entry.allowances || 0) - (entry.deductions || 0);
        document.getElementById('salaryNotes').value = entry.notes || '';
        
        document.getElementById('saveSalaryDetails').setAttribute('data-id', entryId);
        salaryDetailsModal.style.display = 'flex';
    }
}

// Update total salary in real-time
function updateTotalSalary() {
    const basicSalary = parseFloat(document.getElementById('editBasicSalary').value) || 0;
    const commission = parseFloat(document.getElementById('editCommission').value) || 0;
    const allowances = parseFloat(document.getElementById('editAllowances').value) || 0;
    const deductions = parseFloat(document.getElementById('editDeductions').value) || 0;
    
    const total = basicSalary + commission + allowances - deductions;
    document.getElementById('editTotalSalary').value = total;
}

// Save salary details
async function saveSalaryDetails() {
    if (!currentSalaryCycle) return;
    
    const entryId = document.getElementById('saveSalaryDetails').getAttribute('data-id');
    
    const updateData = {
        commission: parseFloat(document.getElementById('editCommission').value) || 0,
        allowances: parseFloat(document.getElementById('editAllowances').value) || 0,
        deductions: parseFloat(document.getElementById('editDeductions').value) || 0,
        notes: document.getElementById('salaryNotes').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/salary-cycles/${currentSalaryCycle._id}/employees/${entryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            salaryDetailsModal.style.display = 'none';
            currentSalaryCycle = data.data;
            loadSalaryCycleEmployees();
            updateDashboardTotals();
            alert('Salary details updated successfully!');
        } else {
            alert(data.error || 'Error updating salary details');
        }
    } catch (err) {
        console.error('Error updating salary details', err);
        alert('Network error occurred');
    }
}

// Process payroll
async function processPayroll() {
    if (!currentSalaryCycle) return;
    
    if (confirm(`Process payroll for ${currentSalaryCycle.employees?.length || 0} employees?`)) {
        try {
            const response = await fetch(`${API_BASE}/salary-cycles/${currentSalaryCycle._id}/process`, {
                method: 'PUT'
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(data.message || 'Payroll processed successfully');
                currentSalaryCycle = null;
                hideCurrentCycleSection();
                loadSalaryHistory();
                updateDashboardTotals();
            } else {
                alert(data.error || 'Error processing payroll');
            }
        } catch (err) {
            console.error('Error processing payroll', err);
            alert('Network error occurred');
        }
    }
}

// Render salary history
/*function renderSalaryHistory(payments) {
    if (!salaryHistoryTableBody) return;
    
    salaryHistoryTableBody.innerHTML = '';
    
    if (!payments || payments.length === 0) {
        salaryHistoryTableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 20px; color: var(--gray-dark);">
                    No salary payments found
                </td>
            </tr>
        `;
        return;
    }
    
    payments.forEach(payment => {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        
        const employee = payment.employee || {};
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${monthNames[payment.month - 1]} ${payment.year}</td>
            <td>${employee.firstName || ''} ${employee.lastName || ''}</td>
            <td>Ksh ${(payment.basicSalary || 0).toLocaleString()}</td>
            <td>Ksh ${(payment.commission || 0).toLocaleString()}</td>
            <td>Ksh ${(payment.allowances || 0).toLocaleString()}</td>
            <td>Ksh ${(payment.deductions || 0).toLocaleString()}</td>
            <td>Ksh ${(payment.totalAmount || 0).toLocaleString()}</td>
            <td><span class="status-badge status-${payment.status}">${payment.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-view btn-sm" data-id="${payment._id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        `;
        salaryHistoryTableBody.appendChild(row);
    });
}*/

// Render salary history with monthly grouping
function renderSalaryHistory(payments) {
    const container = document.getElementById('salaryHistoryContainer');
    if (!container) return;
    
    // Group payments by month-year
    const groupedPayments = {};
    
    if (payments && payments.length > 0) {
        payments.forEach(payment => {
            const key = `${payment.year}-${payment.month}`;
            if (!groupedPayments[key]) {
                groupedPayments[key] = [];
            }
            groupedPayments[key].push(payment);
        });
    }
    
    // Clear container
    container.innerHTML = '';
    
    // If no payments, show empty state
    if (Object.keys(groupedPayments).length === 0) {
        container.innerHTML = `
            <div class="no-history">
                <i class="fas fa-file-invoice-dollar"></i>
                <h4>No Salary History Available</h4>
                <p>Process payroll to see salary history</p>
            </div>
        `;
        return;
    }
    
    // Sort months in descending order (newest first)
    const sortedMonths = Object.keys(groupedPayments).sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
    });
    
    // Create monthly groups
    sortedMonths.forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        const monthPayments = groupedPayments[monthKey];
        
        // Calculate monthly totals
        const monthlyTotals = calculateMonthlyTotals(monthPayments);
        
        // Create month group element
        const monthGroup = document.createElement('div');
        monthGroup.className = 'monthly-salary-group';
        monthGroup.innerHTML = createMonthGroupHTML(year, month, monthPayments, monthlyTotals);
        
        container.appendChild(monthGroup);
    });
    
    // Add event listeners for expand/collapse
    document.querySelectorAll('.month-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const monthGroup = this.closest('.monthly-salary-group');
            monthGroup.classList.toggle('collapsed');
        });
    });
}

// Calculate monthly totals
function calculateMonthlyTotals(payments) {
    const totals = {
        basicSalary: 0,
        commission: 0,
        allowances: 0,
        deductions: 0,
        totalAmount: 0,
        employeeCount: payments.length
    };
    
    payments.forEach(payment => {
        totals.basicSalary += payment.basicSalary || 0;
        totals.commission += payment.commission || 0;
        totals.allowances += payment.allowances || 0;
        totals.deductions += payment.deductions || 0;
        totals.totalAmount += payment.totalAmount || 0;
    });
    
    return totals;
}

// Create HTML for a month group
function createMonthGroupHTML(year, month, payments, totals) {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    
    const monthName = monthNames[month - 1];
    
    return `
        <div class="month-header">
            <div class="month-title">${monthName} ${year}</div>
            <div class="month-summary">
                <div class="summary-item">
                    <span class="summary-label">Employees</span>
                    <span class="summary-value">${totals.employeeCount}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total Paid</span>
                    <span class="summary-value">Ksh ${totals.totalAmount.toLocaleString()}</span>
                </div>
                <button class="month-toggle">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
        </div>
        <div class="month-content">
            <table class="salary-history-table">
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Position</th>
                        <th>Basic Salary</th>
                        <th>Commission</th>
                        <th>Allowances</th>
                        <th>Deductions</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(payment => createPaymentRowHTML(payment)).join('')}
                </tbody>
            </table>
            <div class="month-footer">
                <div class="month-total">Monthly Total</div>
                <div class="month-total">Ksh ${totals.totalAmount.toLocaleString()}</div>
            </div>
        </div>
    `;
}

// Create HTML for a payment row
function createPaymentRowHTML(payment) {
    const employee = payment.employee || {};
    
    return `
        <tr>
            <td>${employee.firstName || ''} ${employee.lastName || ''}</td>
            <td>${formatPosition(employee.position)}</td>
            <td>Ksh ${(payment.basicSalary || 0).toLocaleString()}</td>
            <td>Ksh ${(payment.commission || 0).toLocaleString()}</td>
            <td>Ksh ${(payment.allowances || 0).toLocaleString()}</td>
            <td>Ksh ${(payment.deductions || 0).toLocaleString()}</td>
            <td>Ksh ${(payment.totalAmount || 0).toLocaleString()}</td>
            <td><span class="status-badge status-${payment.status}">${payment.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-view btn-sm" data-id="${payment._id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Filter salary history by year
function filterSalaryHistory() {
    const yearFilter = document.getElementById('historyYearFilter')?.value || 'all';
    
    // In a real implementation, you would refetch data from the API
    // For now, we'll just show/hide based on the selected year
    const monthGroups = document.querySelectorAll('.monthly-salary-group');
    
    monthGroups.forEach(group => {
        const yearText = group.querySelector('.month-title').textContent;
        const year = yearText.split(' ')[1];
        
        if (yearFilter === 'all' || year === yearFilter) {
            group.style.display = '';
        } else {
            group.style.display = 'none';
        }
    });
    
    // Show empty state if no groups are visible
    const visibleGroups = document.querySelectorAll('.monthly-salary-group[style=""]');
    const container = document.getElementById('salaryHistoryContainer');
    
    if (visibleGroups.length === 0 && container) {
        container.innerHTML = `
            <div class="no-history">
                <i class="fas fa-file-invoice-dollar"></i>
                <h4>No Salary History for ${yearFilter}</h4>
                <p>No payroll records found for the selected year</p>
            </div>
        `;
    }
}

// Update dashboard totals
async function updateDashboardTotals() {
    try {
        // Calculate basic totals from employees data
        const totalSalary = employees
            .filter(emp => emp.status === 'active')
            .reduce((sum, emp) => sum + (emp.basicSalary || 0), 0);
        
        const employeesThisMonth = currentSalaryCycle ? (currentSalaryCycle.employees?.length || 0) : 0;
        const avgSalary = employeesThisMonth > 0 ? totalSalary / employeesThisMonth : 0;
        
        // Try to get commission stats from API
        let totalCommissions = 0;
        try {
            const statsRes = await fetch(`${API_BASE}/salary-payments/stats`);
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                if (statsData.success) {
                    const currentMonth = new Date().getMonth() + 1;
                    const currentMonthStats = statsData.data.monthlyStats?.find(s => s._id === currentMonth);
                    totalCommissions = currentMonthStats ? currentMonthStats.totalCommission : 0;
                }
            }
        } catch (err) {
            console.log('Could not load commission stats, using default value');
        }
        
        // Update UI
        updateFinancialCard('income', totalSalary);
        updateFinancialCard('expense', totalCommissions);
        updateFinancialCard('profit', employeesThisMonth, false); // Not a currency value
        updateFinancialCard('balance', avgSalary);
        
        // Update charts
        updateCharts();
        
    } catch (err) {
        console.error('Error updating dashboard totals', err);
        // Set default values
        updateFinancialCard('income', 0);
        updateFinancialCard('expense', 0);
        updateFinancialCard('profit', 0, false);
        updateFinancialCard('balance', 0);
    }
}

function updateFinancialCard(type, value, isCurrency = true) {
    const card = document.querySelector(`.financial-card.${type} .financial-value`);
    if (card) {
        card.innerText = isCurrency ? `Ksh ${Math.round(value).toLocaleString()}` : value.toString();
    }
}

// Update charts
function updateCharts() {
    updateSalaryDistributionChart();
    updateCommissionChart();
}

function updateSalaryDistributionChart() {
    const salaryCtx = document.getElementById('salaryDistributionChart');
    if (!salaryCtx) return;
    
    // Group employees by position
    const positions = {};
    employees.forEach(emp => {
        if (emp.status === 'active') {
            const position = formatPosition(emp.position);
            if (!positions[position]) {
                positions[position] = 0;
            }
            positions[position] += (emp.basicSalary || 0);
        }
    });
    
    // Destroy existing chart if it exists
    if (salaryDistributionChart) {
        salaryDistributionChart.destroy();
    }
    
    salaryDistributionChart = new Chart(salaryCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(positions),
            datasets: [{
                label: 'Salary by Position',
                data: Object.values(positions),
                backgroundColor: 'rgba(30, 136, 229, 0.7)',
                borderColor: 'rgb(30, 136, 229)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Ksh ' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function updateCommissionChart() {
    const commissionCtx = document.getElementById('commissionChart');
    if (!commissionCtx) return;
    
    // For now, use a simple demo chart since we don't have real commission data
    // In a real app, you'd fetch this from the API
    const demoData = {
        'Sales Team': 15000,
        'Management': 5000,
        'Technicians': 8000
    };
    
    // Destroy existing chart if it exists
    if (commissionChart) {
        commissionChart.destroy();
    }
    
    commissionChart = new Chart(commissionCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(demoData),
            datasets: [{
                data: Object.values(demoData),
                backgroundColor: [
                    'rgba(30, 136, 229, 0.7)',
                    'rgba(76, 175, 80, 0.7)',
                    'rgba(255, 152, 0, 0.7)',
                    'rgba(244, 67, 54, 0.7)',
                    'rgba(156, 39, 176, 0.7)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        }
    });
}

// Helper functions
function formatPosition(position) {
    const positions = {
        'manager': 'Manager',
        'sales': 'Sales Executive',
        'technician': 'Technician',
        'admin': 'Administrator',
        'driver': 'Driver',
        'other': 'Other'
    };
    
    return positions[position] || position;
}

function formatPaymentMethod(method) {
    const methods = {
        'bank': 'Bank Transfer',
        'mpesa': 'M-Pesa',
        'cash': 'Cash'
    };
    
    return methods[method] || method;
}

// Utility functions for loading states
function showLoading(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 20px; color: var(--gray-dark);">
                    <i class="fas fa-spinner fa-spin"></i> ${message}
                </td>
            </tr>
        `;
    }
}

function showError(elementId, message = 'Error loading data') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 20px; color: var(--error);">
                    <i class="fas fa-exclamation-triangle"></i> ${message}
                </td>
            </tr>
        `;
    }
}

// Toggle select all employees in salary cycle
function toggleSelectAll() {
    if (!selectAllCheckbox) return;
    
    const checkboxes = document.querySelectorAll('.employee-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// Select all employees
function selectAllEmployees() {
    if (!selectAllCheckbox) return;
    
    selectAllCheckbox.checked = true;
    toggleSelectAll();
}

// Deselect all employees
function deselectAllEmployees() {
    if (!selectAllCheckbox) return;
    
    selectAllCheckbox.checked = false;
    toggleSelectAll();
}

// Update select all checkbox state
function updateSelectAllCheckbox() {
    if (!selectAllCheckbox || !currentSalaryCycle) return;
    
    const checkboxes = document.querySelectorAll('.employee-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(checkbox => checkbox.checked);
    selectAllCheckbox.checked = allChecked;
}

// Filter employees in salary cycle
function filterSalaryCycleEmployees() {
    if (!employeeSearch || !currentSalaryCycle) return;
    
    const searchTerm = employeeSearch.value.toLowerCase();
    const rows = salaryCycleTableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const name = row.cells[1].textContent.toLowerCase();
        const position = row.cells[2].textContent.toLowerCase();
        
        if (name.includes(searchTerm) || position.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Filter employees table
function filterEmployees() {
    const positionFilter = document.getElementById('positionFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    
    const rows = employeesTableBody?.querySelectorAll('tr');
    if (!rows) return;
    
    rows.forEach(row => {
        if (row.cells.length < 6) return;
        
        const position = row.cells[1].textContent.toLowerCase();
        const status = row.cells[5].querySelector('.status-badge')?.textContent.toLowerCase() || '';
        
        const positionMatch = positionFilter === 'all' || position.includes(positionFilter);
        const statusMatch = statusFilter === 'all' || status === statusFilter;
        
        if (positionMatch && statusMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Filter salary history
function filterSalaryHistory() {
    const monthFilter = document.getElementById('historyMonthFilter')?.value || 'all';
    const yearFilter = document.getElementById('historyYearFilter')?.value || 'all';
    
    const rows = salaryHistoryTableBody?.querySelectorAll('tr');
    if (!rows) return;
    
    rows.forEach(row => {
        if (row.cells.length < 2) return;
        
        const dateText = row.cells[0].textContent;
        const parts = dateText.split(' ');
        if (parts.length < 2) return;
        
        const month = parts[0].toLowerCase();
        const year = parts[1];
        
        const monthMatch = monthFilter === 'all' || month === monthFilter;
        const yearMatch = yearFilter === 'all' || year === yearFilter;
        
        if (monthMatch && yearMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}