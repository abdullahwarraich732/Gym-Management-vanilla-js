    // =========================================================================================
        // 8. DATA STRUCTURE & LOCAL STORAGE MANAGEMENT
        // =========================================================================================

        const LS_KEYS = {
            MEMBERS: 'gym_members',
            FEES: 'gym_fees',
            FINANCE: 'gym_finance',
            SETTINGS: 'gym_settings'
        };

        const loadData = (key) => {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        };

        const saveData = (key, data) => {
            localStorage.setItem(key, JSON.stringify(data));
        };

        let members = loadData(LS_KEYS.MEMBERS);
        let fees = loadData(LS_KEYS.FEES);
        let financeRecords = loadData(LS_KEYS.FINANCE);
        
        // Default settings
        let settings = loadData(LS_KEYS.SETTINGS);
        if (Array.isArray(settings) || !settings || Object.keys(settings).length === 0) {
            settings = {
                darkMode: false,
                currencySymbol: '$',
                gymName: 'GYM MANAGER',
                gymAddress: '123 Fitness Ave',
                gymContact: '555-1234'
            };
            saveData(LS_KEYS.SETTINGS, settings);
        }

        // Helper to format currency
        const formatCurrency = (amount) => {
            const symbol = settings.currencySymbol || '$';
            // Ensure amount is treated as a number
            const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
            if (isNaN(numAmount)) return symbol + '0.00';
            return symbol + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numAmount);
        };

        const showToast = (message, type = 'success') => {
            const toastElement = document.getElementById('liveToast');
            const toastBody = document.getElementById('toastBody');
            const toast = new bootstrap.Toast(toastElement);

            toastElement.className = 'toast align-items-center text-white border-0';
            toastElement.classList.add(`bg-${type}`);
            toastBody.textContent = message;

            toast.show();
        };

        // =========================================================================================
        // UI Navigation and Initial Load
        // =========================================================================================
        const applySettings = () => {
            document.getElementById('appBody').classList.toggle('dark-mode', settings.darkMode);
            document.getElementById('gymNameDisplay').textContent = settings.gymName;
            
            // Update currency symbols in modals
            document.getElementById('feeCurrencySymbol1').textContent = settings.currencySymbol;
            document.getElementById('feeCurrencySymbol2').textContent = settings.currencySymbol;

            updateDashboard(); // Re-render dashboard with new currency
        };

        const showSection = (sectionId) => {
            document.querySelectorAll('.page-section').forEach(section => {
                section.style.display = 'none';
            });
            document.getElementById(sectionId).style.display = 'block';

            document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
                link.classList.remove('active');
            });
            const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            if (sectionId === 'dashboard') {
                updateDashboard();
                generateAdvancedAnalytics(true); // Load quick charts on dashboard
            } else if (sectionId === 'reports') {
                generateMonthlyReport();
                generateAdvancedAnalytics(); // Load full charts on reports page
            }
        };

        document.addEventListener('DOMContentLoaded', () => {
            applySettings();
            
            const today = new Date().toISOString().split('T')[0];
            const currentYearMonth = new Date().toISOString().slice(0, 7);
            
            // Set default values for date inputs where needed
            document.getElementById('joiningDate').value = today;
            document.getElementById('recordDate').value = today;
            document.getElementById('datePaid').value = today;
            document.getElementById('manualFeeDatePaid').value = today;
            document.getElementById('feeMonthFilter').value = currentYearMonth;
            document.getElementById('reportMonthYear').value = currentYearMonth;

            showSection('dashboard');
        });

        // =========================================================================================
        // 2. MEMBER MANAGEMENT (FIXED: Ensure loadMemberList runs after save)
        // =========================================================================================

        document.getElementById('memberForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const id = document.getElementById('memberIdToEdit').value;
            const isEditing = !!id;
            
            const memberData = {
                id: isEditing ? id : Date.now().toString(),
                fullName: document.getElementById('fullName').value,
                phoneNumber: document.getElementById('phoneNumber').value,
                cnic: document.getElementById('cnic').value,
                address: document.getElementById('address').value,
                joiningDate: document.getElementById('joiningDate').value,
                membershipPlan: document.getElementById('membershipPlan').value,
                // Ensure monthlyFee is stored as a number
                monthlyFee: parseFloat(document.getElementById('monthlyFee').value) || 0,
                status: document.getElementById('status').value,
                notes: document.getElementById('notes').value
            };
            
            if (isEditing) {
                const index = members.findIndex(m => m.id === id);
                if (index !== -1) {
                    members[index] = memberData;
                    showToast('Member updated successfully.', 'info');
                }
            } else {
                members.push(memberData);
                showToast('Member added successfully!');
            }
            
            saveData(LS_KEYS.MEMBERS, members);
            loadMemberList(); // Crucial: Reload list immediately
            updateDashboard(); // Update counts
            
            // Close modal and reset form
            const modalElement = document.getElementById('addMemberModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                 modal.hide();
            }
            // Clear the form fields explicitly, especially hidden ID for next entry
            e.target.reset();
            document.getElementById('memberIdToEdit').value = ''; 
        });

        const loadMemberList = () => {
            const tableBody = document.getElementById('memberListTableBody');
            const searchTerm = document.getElementById('memberSearch').value.toLowerCase();
            const filterStatus = document.getElementById('memberFilterStatus').value;
            
            let filteredMembers = members.filter(member => {
                const matchesSearch = member.fullName.toLowerCase().includes(searchTerm) || 
                                      member.phoneNumber.includes(searchTerm);
                const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
                return matchesSearch && matchesStatus;
            });

            tableBody.innerHTML = '';
            
            if (filteredMembers.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No members found.</td></tr>';
                return;
            }

            filteredMembers.forEach(member => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = member.id.slice(-4);
                row.insertCell().textContent = member.fullName;
                row.insertCell().textContent = member.phoneNumber;
                row.insertCell().textContent = member.joiningDate;
                row.insertCell().textContent = formatCurrency(member.monthlyFee);
                
                const statusCell = row.insertCell();
                const statusBadge = document.createElement('span');
                statusBadge.textContent = member.status;
                statusBadge.classList.add('badge', member.status === 'Active' ? 'bg-success' : 'bg-danger');
                statusCell.appendChild(statusBadge);

                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `
                    <button class="btn btn-sm btn-info me-1" onclick="viewMemberProfile('${member.id}')" title="View Profile"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-warning me-1" onclick="editMember('${member.id}')" title="Edit Member"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-${member.status === 'Active' ? 'danger' : 'success'}" onclick="toggleMemberStatus('${member.id}', '${member.status}')" title="${member.status === 'Active' ? 'Deactivate' : 'Activate'} Member">
                        <i class="fas fa-${member.status === 'Active' ? 'user-slash' : 'user-check'}"></i>
                    </button>
                `;
            });
        };

        const editMember = (id) => {
            const member = members.find(m => m.id === id);
            if (!member) return;

            // Reset form first for a clean state
            document.getElementById('memberForm').reset();

            // Set modal title and hidden ID
            document.getElementById('addMemberModalLabel').textContent = 'Edit Member: ' + member.fullName;
            document.getElementById('memberIdToEdit').value = member.id;

            // Populate form fields
            document.getElementById('fullName').value = member.fullName;
            document.getElementById('phoneNumber').value = member.phoneNumber;
            document.getElementById('cnic').value = member.cnic;
            document.getElementById('address').value = member.address;
            document.getElementById('joiningDate').value = member.joiningDate;
            document.getElementById('membershipPlan').value = member.membershipPlan;
            document.getElementById('monthlyFee').value = member.monthlyFee;
            document.getElementById('status').value = member.status;
            document.getElementById('notes').value = member.notes;

            const modal = new bootstrap.Modal(document.getElementById('addMemberModal'));
            modal.show();
        };

        const toggleMemberStatus = (id, currentStatus) => {
            if (!confirm(`Are you sure you want to ${currentStatus === 'Active' ? 'DEACTIVATE' : 'ACTIVATE'} this member?`)) {
                return;
            }

            const member = members.find(m => m.id === id);
            if (member) {
                member.status = currentStatus === 'Active' ? 'Inactive' : 'Active';
                saveData(LS_KEYS.MEMBERS, members);
                loadMemberList();
                updateDashboard();
                showToast(`Member status updated to ${member.status}.`, member.status === 'Active' ? 'success' : 'danger');
            }
        };


        // =========================================================================================
        // 3. MEMBER PROFILE / INVOICE GENERATION
        // =========================================================================================

        let currentProfileMemberId = null; 

        const viewMemberProfile = (id) => {
            const member = members.find(m => m.id === id);
            if (!member) return;
            currentProfileMemberId = id;

            document.getElementById('profileName').textContent = member.fullName;
            document.getElementById('profilePhone').textContent = member.phoneNumber || 'N/A';
            document.getElementById('profileCnic').textContent = member.cnic || 'N/A';
            document.getElementById('profileAddress').textContent = member.address || 'N/A';
            document.getElementById('profileJoiningDate').textContent = member.joiningDate;
            document.getElementById('profileMonthlyFee').textContent = formatCurrency(member.monthlyFee);
            document.getElementById('profilePlan').textContent = member.membershipPlan;
            
            const statusBadge = document.getElementById('profileStatus');
            statusBadge.textContent = member.status;
            statusBadge.className = 'badge';
            statusBadge.classList.add(member.status === 'Active' ? 'bg-success' : 'bg-danger');

            loadMemberFeeHistory(id);

            document.getElementById('manualFeeMemberId').value = id;

            const modal = new bootstrap.Modal(document.getElementById('memberProfileModal'));
            modal.show();
        };

        const loadMemberFeeHistory = (memberId) => {
            const memberFees = fees.filter(f => f.memberId === memberId).sort((a, b) => {
                const dateA = new Date(a.year, a.monthIndex, 1);
                const dateB = new Date(b.year, b.monthIndex, 1);
                return dateB - dateA;
            });
            const tableBody = document.getElementById('profileFeeHistoryTableBody');
            tableBody.innerHTML = '';

            let totalBilled = 0;
            let totalReceived = 0;

            if (memberFees.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No fee records found.</td></tr>';
            } else {
                memberFees.forEach(fee => {
                    totalBilled += fee.amount;
                    if (fee.status === 'Paid') {
                        totalReceived += fee.amount;
                    }

                    const monthName = new Date(fee.year, fee.monthIndex, 1).toLocaleString('default', { month: 'long' });
                    const row = tableBody.insertRow();
                    row.insertCell().textContent = `${monthName}, ${fee.year}`;
                    row.insertCell().textContent = formatCurrency(fee.amount);
                    
                    const statusCell = row.insertCell();
                    statusCell.innerHTML = `<span class="badge bg-${fee.status === 'Paid' ? 'success' : 'danger'}">${fee.status}</span>`;
                    
                    row.insertCell().textContent = fee.datePaid || '---';
                    row.insertCell().textContent = fee.paymentMethod || '---';
                    row.insertCell().textContent = fee.notes || '---';

                    const actionsCell = row.insertCell();
                    actionsCell.innerHTML = `
                        ${fee.status === 'Unpaid' ? `<button class="btn btn-sm btn-success me-1" onclick="openMarkPaidModal('${fee.id}', true)" title="Mark Paid"><i class="fas fa-money-bill-wave"></i></button>` : ''}
                        <button class="btn btn-sm btn-danger" onclick="deleteFeeRecord('${fee.id}')" title="Delete Record"><i class="fas fa-trash-alt"></i></button>
                    `;
                });
            }

            const outstanding = totalBilled - totalReceived;
            document.getElementById('profileBilled').textContent = formatCurrency(totalBilled);
            document.getElementById('profileReceived').textContent = formatCurrency(totalReceived);
            document.getElementById('profileOutstanding').textContent = formatCurrency(outstanding);
        };

        const deleteFeeRecord = (feeId) => {
            if (confirm('Are you sure you want to permanently delete this fee record? This action cannot be undone.')) {
                fees = fees.filter(f => f.id !== feeId);
                saveData(LS_KEYS.FEES, fees);
                loadMemberFeeHistory(currentProfileMemberId);
                loadFeesDueTable();
                updateDashboard();
                showToast('Fee record deleted.', 'danger');
            }
        };

        document.getElementById('addFeeRecordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const memberId = document.getElementById('manualFeeMemberId').value;
            const monthYear = document.getElementById('manualFeeMonthYear').value;
            const amount = parseFloat(document.getElementById('manualFeeAmount').value);
            const isPaid = document.getElementById('manualFeeIsPaid').checked;

            if (!monthYear || isNaN(amount) || amount <= 0) {
                showToast('Please fill in valid Month/Year and Amount.', 'warning');
                return;
            }

            const [year, month] = monthYear.split('-').map(s => parseInt(s));
            const monthIndex = month - 1;

            const newFeeRecord = {
                id: Date.now().toString(),
                memberId: memberId,
                monthIndex: monthIndex,
                year: year,
                amount: amount,
                status: isPaid ? 'Paid' : 'Unpaid',
                datePaid: isPaid ? document.getElementById('manualFeeDatePaid').value : null,
                paymentMethod: isPaid ? document.getElementById('manualFeePaymentMethod').value : null,
                notes: isPaid ? document.getElementById('manualFeeNotes').value : null,
                isManual: true
            };

            const isDuplicate = fees.some(f => 
                f.memberId === memberId && 
                f.monthIndex === newFeeRecord.monthIndex && 
                f.year === newFeeRecord.year
            );

            if (isDuplicate) {
                showToast(`Fee for ${new Date(year, monthIndex).toLocaleString('default', { month: 'long', year: 'numeric' })} already exists.`, 'warning');
                return;
            }

            fees.push(newFeeRecord);
            saveData(LS_KEYS.FEES, fees);

            e.target.reset();
            document.getElementById('manualFeePaymentDetails').style.display = 'none'; // Hide details after submission
            const modal = bootstrap.Modal.getInstance(document.getElementById('addFeeRecordModal'));
            modal.hide();

            loadMemberFeeHistory(memberId);
            loadFeesDueTable();
            updateDashboard();
            showToast('Manual fee record added successfully.', 'success');
        });

        document.getElementById('manualFeeIsPaid').addEventListener('change', (e) => {
            document.getElementById('manualFeePaymentDetails').style.display = e.target.checked ? 'block' : 'none';
        });

        const generateInvoice = (memberId, feeId = null) => {
            const member = members.find(m => m.id === memberId);
            if (!member) return;

            let invoiceFees = fees.filter(f => f.memberId === memberId && f.status === 'Unpaid');
            let invoiceTitle = "TAX INVOICE / FEE DUE";

            if (feeId) {
                const specificFee = fees.find(f => f.id === feeId);
                if (!specificFee) return;
                invoiceFees = [specificFee];
                invoiceTitle = `FEE INVOICE FOR ${new Date(specificFee.year, specificFee.monthIndex).toLocaleString('default', { month: 'long', year: 'numeric' })}`;
            }


            const totalAmount = invoiceFees.reduce((sum, f) => sum + f.amount, 0);

            const invoiceBody = invoiceFees.map((fee, index) => {
                const monthName = new Date(fee.year, fee.monthIndex, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                const statusText = fee.status === 'Paid' ? `PAID on ${fee.datePaid}` : 'UNPAID';
                return `
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 8px;">${index + 1}</td>
                        <td style="border: 1px solid #ccc; padding: 8px; text-align: left;">${monthName} Membership Fee (${statusText})</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">1</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">${formatCurrency(fee.amount)}</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">${formatCurrency(fee.amount)}</td>
                    </tr>
                `;
            }).join('');
            
            const invoiceHTML = `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; border: 1px solid #ccc; color: #212529;">
                    <h2 style="text-align: center; color: #007bff;">${settings.gymName}</h2>
                    <p style="text-align: center; margin-bottom: 20px;">${settings.gymAddress} | Contact: ${settings.gymContact}</p>
                    <hr>
                    <h3 style="margin-top: 20px;">${invoiceTitle}</h3>
                    <p><strong>Invoice Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Member ID:</strong> ${member.id.slice(-4)}</p>
                    <p><strong>Billed To:</strong> ${member.fullName} (${member.phoneNumber})</p>
                    <hr>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; text-align: center;">
                        <thead>
                            <tr style="background-color: #f8f8f8;">
                                <th style="border: 1px solid #ccc; padding: 8px;">#</th>
                                <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Description</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Qty</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Unit Price</th>
                                <th style="border: 1px solid #ccc; padding: 8px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>${invoiceBody}</tbody>
                        <tfoot>
                            <tr style="font-weight: bold;">
                                <td colspan="4" style="border: 1px solid #ccc; padding: 8px; text-align: right;">${feeId ? 'TOTAL AMOUNT' : 'GRAND TOTAL OUTSTANDING'}:</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">${formatCurrency(totalAmount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <p style="text-align: center; font-style: italic;">${feeId && invoiceFees[0].status === 'Paid' ? 'Payment received. Thank you!' : 'Payment due. Thank you!'}</p>
                </div>
            `;
            
            const printWindow = window.open('', '', 'height=600,width=800');
            printWindow.document.write('<html><head><title>Fee Invoice</title>');
            printWindow.document.write('</head><body style="color: #212529;">');
            printWindow.document.write(invoiceHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        };

        // =========================================================================================
        // 4. FEE MANAGEMENT (Updated: Invoice Column/Action)
        // =========================================================================================

        const generateDuesForSelectedMonth = () => {
            const monthYear = document.getElementById('feeMonthFilter').value;
            if (!monthYear) {
                showToast('Please select a Month and Year.', 'danger');
                return;
            }

            if (!confirm(`Are you sure you want to generate fee dues and invoices for all ACTIVE members for ${monthYear}?`)) {
                return;
            }

            const [yearStr, monthStr] = monthYear.split('-');
            const year = parseInt(yearStr);
            const monthIndex = parseInt(monthStr) - 1;

            let duesGeneratedCount = 0;
            const activeMembers = members.filter(m => m.status === 'Active');

            activeMembers.forEach(member => {
                const exists = fees.some(fee => 
                    fee.memberId === member.id && 
                    fee.monthIndex === monthIndex && 
                    fee.year === year
                );

                if (!exists) {
                    const newFee = {
                        id: Date.now().toString() + member.id.slice(-4) + duesGeneratedCount,
                        memberId: member.id,
                        monthIndex: monthIndex,
                        year: year,
                        amount: member.monthlyFee,
                        status: 'Unpaid',
                        datePaid: null,
                        paymentMethod: null,
                        notes: null,
                        isManual: false
                    };
                    fees.push(newFee);
                    duesGeneratedCount++;
                    // Optionally, generate an invoice immediately for each new due
                    // generateInvoice(member.id, newFee.id); 
                }
            });

            saveData(LS_KEYS.FEES, fees);
            loadFeesDueTable();
            updateDashboard();
            showToast(`${duesGeneratedCount} new fee due(s) and invoices generated for ${monthYear}.`, 'success');
        };

        const loadFeesDueTable = () => {
            const tableBody = document.getElementById('feesDueTableBody');
            const monthYearFilter = document.getElementById('feeMonthFilter').value;
            const statusFilter = document.getElementById('feeStatusFilter').value;
            
            tableBody.innerHTML = '';

            const [filterYearStr, filterMonthStr] = monthYearFilter ? monthYearFilter.split('-') : [null, null];
            const filterYear = filterYearStr ? parseInt(filterYearStr) : null;
            const filterMonthIndex = filterMonthStr ? parseInt(filterMonthStr) - 1 : null;

            let filteredFees = fees.filter(fee => {
                const isStatusMatch = statusFilter === 'all' || fee.status === statusFilter;
                
                let isMonthMatch = true;
                if (filterYear && filterMonthIndex !== null) {
                    isMonthMatch = fee.year === filterYear && fee.monthIndex === filterMonthIndex;
                }
                
                return isStatusMatch && isMonthMatch;
            });

            filteredFees.sort((a, b) => {
                if (a.status === 'Unpaid' && b.status === 'Paid') return -1;
                if (a.status === 'Paid' && b.status === 'Unpaid') return 1;
                
                const memberA = members.find(m => m.id === a.memberId)?.fullName || 'Z';
                const memberB = members.find(m => m.id === b.memberId)?.fullName || 'Z';
                return memberA.localeCompare(memberB);
            });


            if (filteredFees.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No fees found for the selected filter.</td></tr>';
                return;
            }

            filteredFees.forEach(fee => {
                const member = members.find(m => m.id === fee.memberId);
                if (!member) return;

                const monthName = new Date(fee.year, fee.monthIndex, 1).toLocaleString('default', { month: 'long' });
                
                const row = tableBody.insertRow();
                row.insertCell().textContent = member.fullName;
                row.insertCell().textContent = `${monthName}, ${fee.year}`;
                row.insertCell().textContent = formatCurrency(fee.amount);
                
                const statusCell = row.insertCell();
                statusCell.innerHTML = `<span class="badge bg-${fee.status === 'Paid' ? 'success' : 'danger'}">${fee.status}</span>`;

                const actionsCell = row.insertCell();
                if (fee.status === 'Unpaid') {
                    actionsCell.innerHTML = `<button class="btn btn-sm btn-success" onclick="openMarkPaidModal('${fee.id}')"><i class="fas fa-check"></i> Paid</button>`;
                } else {
                    actionsCell.textContent = fee.datePaid ? `Paid on ${fee.datePaid}` : 'Paid';
                }

                // New Invoice Cell
                const invoiceCell = row.insertCell();
                invoiceCell.innerHTML = `
                    <button class="btn btn-sm btn-info" onclick="generateInvoice('${member.id}', '${fee.id}')" title="View Invoice">
                        <i class="fas fa-file-invoice"></i>
                    </button>
                `;
            });
        };

        const openMarkPaidModal = (feeId, isFromProfile = false) => {
            const feeRecord = fees.find(f => f.id === feeId);
            if (!feeRecord) return;

            document.getElementById('feeToMarkPaidId').value = feeId;
            document.getElementById('datePaid').value = new Date().toISOString().split('T')[0];

            const member = members.find(m => m.id === feeRecord.memberId);
            const monthName = new Date(feeRecord.year, feeRecord.monthIndex, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
            document.getElementById('markPaidModalLabel').textContent = `Mark Paid: ${member.fullName} (${monthName})`;

            const modal = new bootstrap.Modal(document.getElementById('markPaidModal'));
            modal.show();

            document.getElementById('markPaidModal').setAttribute('data-from-profile', isFromProfile);
        };

        document.getElementById('markPaidForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const feeId = document.getElementById('feeToMarkPaidId').value;
            const datePaid = document.getElementById('datePaid').value;
            const paymentMethod = document.getElementById('paymentMethod').value;
            const notes = document.getElementById('paymentNotes').value;
            const isFromProfile = document.getElementById('markPaidModal').getAttribute('data-from-profile') === 'true';

            const feeRecord = fees.find(f => f.id === feeId);
            if (feeRecord) {
                feeRecord.status = 'Paid';
                feeRecord.datePaid = datePaid;
                feeRecord.paymentMethod = paymentMethod;
                feeRecord.notes = notes;
                
                saveData(LS_KEYS.FEES, fees);
                showToast('Fee marked as paid successfully!');
            }

            const modal = bootstrap.Modal.getInstance(document.getElementById('markPaidModal'));
            modal.hide();
            
            if (isFromProfile) {
                loadMemberFeeHistory(feeRecord.memberId);
            }
            loadFeesDueTable();
            updateDashboard();
        });


        // =========================================================================================
        // 5. INCOME & EXPENSE MANAGEMENT
        // =========================================================================================

        document.getElementById('financeRecordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const newRecord = {
                id: Date.now().toString(),
                type: document.getElementById('recordType').value,
                date: document.getElementById('recordDate').value,
                category: document.getElementById('recordCategory').value,
                description: document.getElementById('recordDescription').value,
                amount: parseFloat(document.getElementById('recordAmount').value) || 0
            };
            
            if (isNaN(newRecord.amount) || newRecord.amount <= 0) {
                showToast('Please enter a valid amount.', 'danger');
                return;
            }

            financeRecords.push(newRecord);
            saveData(LS_KEYS.FINANCE, financeRecords);
            loadFinanceRecords();
            updateDashboard();

            showToast(`${newRecord.type} record added successfully!`, newRecord.type === 'Income' ? 'success' : 'warning');
            e.target.reset();
            document.getElementById('recordDate').value = new Date().toISOString().split('T')[0];
        });

        const loadFinanceRecords = () => {
            const tableBody = document.getElementById('financeRecordsTableBody');
            tableBody.innerHTML = '';
            
            const sortedRecords = [...financeRecords].sort((a, b) => new Date(b.date) - new Date(a.date));

            if (sortedRecords.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No finance records found.</td></tr>';
                return;
            }

            sortedRecords.forEach(record => {
                const row = tableBody.insertRow();
                const amountText = formatCurrency(record.amount);
                const typeClass = record.type === 'Income' ? 'text-success' : 'text-danger';

                row.insertCell().textContent = record.date;
                row.insertCell().innerHTML = `<span class="badge bg-${record.type === 'Income' ? 'info' : 'secondary'}">${record.type}</span>`;
                row.insertCell().textContent = record.category;
                row.insertCell().textContent = record.description;
                row.insertCell().innerHTML = `<span class="${typeClass} fw-bold">${amountText}</span>`;

                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `<button class="btn btn-sm btn-danger" onclick="deleteFinanceRecord('${record.id}')"><i class="fas fa-trash-alt"></i> Delete</button>`;
            });
        };

        const deleteFinanceRecord = (recordId) => {
            if (confirm('Are you sure you want to permanently delete this finance record?')) {
                financeRecords = financeRecords.filter(r => r.id !== recordId);
                saveData(LS_KEYS.FINANCE, financeRecords);
                loadFinanceRecords();
                updateDashboard();
                showToast('Finance record deleted.', 'danger');
            }
        };


        // =========================================================================================
        // 1. DASHBOARD CALCULATIONS
        // =========================================================================================

        const updateDashboard = () => {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonthIndex = now.getMonth();
            const todayDate = now.toISOString().split('T')[0];
            const currentMonthShort = now.toLocaleString('default', { month: 'short' });

            // 1. Member Counts
            const totalMembers = members.length;
            const activeMembers = members.filter(m => m.status === 'Active').length;
            const inactiveMembers = totalMembers - activeMembers;

            // 2. Fee Calculations (Collected vs. Pending for the current month's dues)
            const currentMonthFees = fees.filter(f => f.year === currentYear && f.monthIndex === currentMonthIndex);
            
            let totalFeesCollectedThisMonthDues = 0;
            let totalPendingFeesThisMonthDues = 0;
            
            currentMonthFees.forEach(fee => {
                if (fee.status === 'Paid') {
                    totalFeesCollectedThisMonthDues += fee.amount;
                } else {
                    totalPendingFeesThisMonthDues += fee.amount;
                }
            });

            // Calculate Today's and This Month's Collection (based on datePaid)
            let todayCollection = 0;
            let totalCollectionThisMonth = 0;
            
            fees.forEach(fee => {
                if (fee.status === 'Paid' && fee.datePaid) {
                    const feeDate = new Date(fee.datePaid);
                    if (feeDate.toISOString().split('T')[0] === todayDate) {
                        todayCollection += fee.amount;
                    }
                    if (feeDate.getFullYear() === currentYear && feeDate.getMonth() === currentMonthIndex) {
                        totalCollectionThisMonth += fee.amount;
                    }
                }
            });

            // 3. Other Finance Calculations (Income/Expense)
            let otherIncomeThisMonth = 0;
            let totalExpensesThisMonth = 0;
            
            financeRecords.forEach(record => {
                const recordDate = new Date(record.date);
                if (recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonthIndex) {
                    if (record.type === 'Income') {
                        otherIncomeThisMonth += record.amount;
                    } else if (record.type === 'Expense') {
                        totalExpensesThisMonth += record.amount;
                    }
                }
            });
            
            const totalIncomeThisMonth = totalFeesCollectedThisMonthDues + otherIncomeThisMonth;
            const netResult = totalIncomeThisMonth - totalExpensesThisMonth;
            const netColor = netResult >= 0 ? 'text-success' : 'text-danger';
            const netSign = netResult >= 0 ? 'PLUS (Profit)' : 'MINUS (Loss)';

            // 4. Overdue Members
            const previousMonthsFees = fees.filter(f => {
                const feeDate = new Date(f.year, f.monthIndex, 1);
                const currentDate = new Date(currentYear, currentMonthIndex, 1);
                return feeDate < currentDate && f.status === 'Unpaid';
            });
            const overdueMemberIds = [...new Set(previousMonthsFees.map(f => f.memberId))];
            const overdueMembersCount = overdueMemberIds.length;

            // 5. Update UI
            const cardData = [
                { icon: 'fas fa-users', title: 'Total Members', value: totalMembers, color: 'primary' },
                { icon: 'fas fa-user-check', title: 'Active Members', value: activeMembers, color: 'success' },
                { icon: 'fas fa-user-slash', title: 'Inactive Members', value: inactiveMembers, color: 'danger' },
                { icon: 'fas fa-money-check-alt', title: `Fees Collected (${currentMonthShort})`, value: formatCurrency(totalFeesCollectedThisMonthDues), color: 'success' },
                { icon: 'fas fa-hourglass-half', title: `Pending Fees (${currentMonthShort})`, value: formatCurrency(totalPendingFeesThisMonthDues), color: 'warning' },
                { icon: 'fas fa-balance-scale', title: `Net Result (${currentMonthShort})`, value: `<span class="${netColor}">${netSign} ${formatCurrency(Math.abs(netResult))}</span>`, color: 'dark', isNet: true, netClass: netResult >= 0 ? 'net-profit' : 'net-loss' },
            ];

            const summaryCardsHTML = cardData.map(data => `
                <div class="col-6 col-md-4 col-lg-2">
                    <div class="card p-3 dashboard-card card-${data.color} ${data.isNet ? 'card-net-result ' + data.netClass : ''}">
                        <div class="d-flex align-items-center justify-content-between">
                            <i class="${data.icon} card-icon"></i>
                            <div class="text-end">
                                <div class="card-title-text">${data.title}</div>
                                <div class="card-value">${data.value}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('summaryCards').innerHTML = summaryCardsHTML;
            document.getElementById('todayCollection').textContent = formatCurrency(todayCollection);
            document.getElementById('monthCollection').textContent = formatCurrency(totalCollectionThisMonth);
            document.getElementById('overdueMembersCount').textContent = `${overdueMembersCount} Member${overdueMembersCount !== 1 ? 's' : ''}`;
        };


        // =========================================================================================
        // 6. MONTHLY SUMMARY / REPORTS SECTION
        // =========================================================================================

        const generateMonthlyReport = () => {
            const monthYear = document.getElementById('reportMonthYear').value;
            const reportContainer = document.getElementById('reportContainer');
            reportContainer.innerHTML = '';

            if (!monthYear) {
                reportContainer.innerHTML = '<p class="text-danger">Please select a Month and Year to generate the report.</p>';
                return;
            }

            const [yearStr, monthStr] = monthYear.split('-');
            const year = parseInt(yearStr);
            const monthIndex = parseInt(monthStr) - 1;
            const monthName = new Date(year, monthIndex).toLocaleString('default', { month: 'long', year: 'numeric' });

            const feesCollectedInMonth = fees.filter(f => {
                if (f.status === 'Paid' && f.datePaid) {
                    const datePaid = new Date(f.datePaid);
                    return datePaid.getFullYear() === year && datePaid.getMonth() === monthIndex;
                }
                return false;
            });
            
            let totalMemberFeesCollected = feesCollectedInMonth.reduce((sum, fee) => sum + fee.amount, 0);

            const recordsInMonth = financeRecords.filter(r => {
                const recordDate = new Date(r.date);
                return recordDate.getFullYear() === year && recordDate.getMonth() === monthIndex;
            });

            const incomeRecords = recordsInMonth.filter(r => r.type === 'Income');
            const expenseRecords = recordsInMonth.filter(r => r.type === 'Expense');
            
            let totalOtherIncome = incomeRecords.reduce((sum, r) => sum + r.amount, 0);
            let totalExpenses = expenseRecords.reduce((sum, r) => sum + r.amount, 0);

            const grandTotalIncome = totalMemberFeesCollected + totalOtherIncome;
            const netResult = grandTotalIncome - totalExpenses;
            const netColor = netResult >= 0 ? 'text-success' : 'text-danger';
            const netSign = netResult >= 0 ? 'PLUS (Profit)' : 'MINUS (Loss)';

            let reportHTML = `
                <h3 class="text-center mb-4 text-primary">Financial Report for ${monthName}</h3>
                
                <div class="alert alert-${netResult >= 0 ? 'success' : 'danger'} text-center fs-5 fw-bold">
                    NET RESULT: GYM IS RUNNING IN ${netSign} (${formatCurrency(Math.abs(netResult))})
                </div>

                <div class="row mb-5 g-3">
                    <div class="col-md-4"><div class="card text-white bg-primary mb-2"><div class="card-body py-2">Grand Total Income: <h4 id="reportTotalIncome">${formatCurrency(grandTotalIncome)}</h4></div></div></div>
                    <div class="col-md-4"><div class="card text-white bg-danger mb-2"><div class="card-body py-2">Total Expenses: <h4 id="reportTotalExpense">${formatCurrency(totalExpenses)}</h4></div></div></div>
                    <div class="col-md-4"><div class="card text-white bg-${netResult >= 0 ? 'success' : 'dark'} mb-2"><div class="card-body py-2">Net Result: <h4 class="${netColor} fw-bold">${formatCurrency(netResult)}</h4></div></div></div>
                </div>
                
                <h4 class="text-success"><i class="fas fa-receipt"></i> 1. Member Fees Collected</h4>
                <div class="table-responsive mb-4">
                    <table class="table table-bordered table-sm">
                        <thead class="table-light">
                            <tr><th>Member</th><th>Fee Month Due</th><th>Amount</th><th>Date Paid</th></tr>
                        </thead>
                        <tbody>
                            ${feesCollectedInMonth.length > 0 ? feesCollectedInMonth.map(fee => {
                                const memberName = members.find(m => m.id === fee.memberId)?.fullName || 'N/A';
                                const feeMonth = new Date(fee.year, fee.monthIndex).toLocaleString('default', { month: 'short', year: 'numeric' });
                                return `<tr>
                                    <td>${memberName}</td>
                                    <td>${feeMonth}</td>
                                    <td>${formatCurrency(fee.amount)}</td>
                                    <td>${fee.datePaid}</td>
                                </tr>`;
                            }).join('') : '<tr><td colspan="4" class="text-center">No member fees collected this month.</td></tr>'}
                        </tbody>
                        <tfoot>
                            <tr class="table-success fw-bold">
                                <td colspan="2">TOTAL MEMBER FEES COLLECTED</td>
                                <td colspan="2">${formatCurrency(totalMemberFeesCollected)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <h4 class="text-info"><i class="fas fa-arrow-down"></i> 2. Other Income</h4>
                <div class="table-responsive mb-4">
                    <table class="table table-bordered table-sm">
                        <thead class="table-light">
                            <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr>
                        </thead>
                        <tbody>
                            ${incomeRecords.length > 0 ? incomeRecords.map(r => `
                                <tr>
                                    <td>${r.date}</td>
                                    <td>${r.category}</td>
                                    <td>${r.description}</td>
                                    <td>${formatCurrency(r.amount)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" class="text-center">No other income recorded this month.</td></tr>'}
                        </tbody>
                        <tfoot>
                            <tr class="table-info fw-bold">
                                <td colspan="3">TOTAL OTHER INCOME</td>
                                <td>${formatCurrency(totalOtherIncome)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <h4 class="text-danger"><i class="fas fa-arrow-up"></i> 3. Expenses</h4>
                <div class="table-responsive mb-4">
                    <table class="table table-bordered table-sm">
                        <thead class="table-light">
                            <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr>
                        </thead>
                        <tbody>
                            ${expenseRecords.length > 0 ? expenseRecords.map(r => `
                                <tr>
                                    <td>${r.date}</td>
                                    <td>${r.category}</td>
                                    <td>${r.description}</td>
                                    <td>${formatCurrency(r.amount)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" class="text-center">No expenses recorded this month.</td></tr>'}
                        </tbody>
                        <tfoot>
                            <tr class="table-danger fw-bold">
                                <td colspan="3">TOTAL EXPENSES</td>
                                <td>${formatCurrency(totalExpenses)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
            
            reportContainer.innerHTML = reportHTML;
        };

        const printReport = () => { 
            const printContents = document.getElementById('reportContainer').innerHTML;
            const printWindow = window.open('', '', 'height=600,width=800');
            printWindow.document.write('<html><head><title>Monthly Financial Report</title>');
            printWindow.document.write('<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">');
            printWindow.document.write('<style>@media print { .no-print { display: none; } }</style>');
            printWindow.document.write('</head><body style="color: #212529;">');
            printWindow.document.write(printContents);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        };

        // =========================================================================================
        // ADVANCED REPORTS & ANALYTICS
        // =========================================================================================

        const generateChartData = () => {
            const dateMap = {}; // Key: YYYY-MM
            const now = new Date();
            // Initialize map for the last 6 months (and current month)
            for (let i = 0; i < 6; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const yearMonth = d.toISOString().slice(0, 7);
                const monthName = d.toLocaleString('default', { month: 'short' });
                dateMap[yearMonth] = { 
                    month: monthName,
                    year: d.getFullYear(),
                    income: 0, 
                    expense: 0,
                    newMembers: 0,
                    leftMembers: 0,
                    net: 0
                };
            }

            // Populate Income/Expense (from fees collected and finance records)
            [...fees, ...financeRecords].forEach(record => {
                let date, amount, type;

                if (record.memberId) { // Fee record
                    if (record.status !== 'Paid' || !record.datePaid) return;
                    date = record.datePaid;
                    amount = record.amount;
                    type = 'Income';
                } else { // Finance record
                    date = record.date;
                    amount = record.amount;
                    type = record.type;
                }
                
                const recordDate = new Date(date);
                const yearMonth = recordDate.toISOString().slice(0, 7);
                if (dateMap[yearMonth]) {
                    if (type === 'Income') {
                        dateMap[yearMonth].income += amount;
                    } else if (type === 'Expense') {
                        dateMap[yearMonth].expense += amount;
                    }
                }
            });

            // Populate Member Growth
            members.forEach(member => {
                const joiningDate = member.joiningDate;
                if (joiningDate) {
                    const yearMonth = joiningDate.slice(0, 7);
                    if (dateMap[yearMonth]) {
                        dateMap[yearMonth].newMembers += 1;
                    }
                }
            });

            // Final processing (convert object to array, oldest first)
            const sortedData = Object.keys(dateMap).sort().map(key => {
                const data = dateMap[key];
                data.net = data.income - data.expense;
                return data;
            });

            return sortedData.slice(-6); // Ensure we only return the last 6 months
        };

        const renderBarChart = (dataArray, containerId, valueKey1, valueKey2, label1, label2) => {
            const container = document.getElementById(containerId);
            container.innerHTML = '';
            
            if (!dataArray || dataArray.length === 0) {
                container.textContent = 'Not enough data to generate chart.';
                container.classList.add('text-center', 'mt-5', 'text-muted');
                return;
            } else {
                container.classList.remove('text-center', 'mt-5', 'text-muted');
            }


            const allValues = dataArray.flatMap(d => [d[valueKey1], d[valueKey2] || 0]);
            const maxValue = Math.max(...allValues) || 1; 
            const scale = 300 / maxValue; // Chart height is 300px

            dataArray.forEach(data => {
                const barContainer = document.createElement('div');
                barContainer.className = 'd-flex flex-column align-items-center h-100 position-relative';
                barContainer.style.width = `${100 / dataArray.length}%`;
                
                const val1 = data[valueKey1];
                const val2 = data[valueKey2] || 0;
                
                // Helper to render a single bar
                const renderBar = (val, color, isBase) => {
                    const barHeight = val * scale;
                    const bar = document.createElement('div');
                    bar.className = 'chart-bar';
                    bar.style.backgroundColor = color;
                    bar.style.height = `${barHeight}px`;
                    bar.style.marginTop = isBase ? 'auto' : '0';
                    bar.style.alignSelf = 'center';

                    const labelY = document.createElement('span');
                    labelY.className = 'chart-label-y';
                    labelY.textContent = valueKey1.includes('income') ? formatCurrency(val) : val;
                    labelY.style.color = color;
                    bar.appendChild(labelY);
                    
                    barContainer.prepend(bar);
                };

                // Income vs Expense Chart
                if (valueKey1 === 'income') {
                    // Expense bar (Red)
                    renderBar(val2, '#dc3545', false);
                    // Income bar (Green)
                    renderBar(val1, '#28a745', false);
                } else { // Member Growth Chart
                    // Inactive (Red)
                    renderBar(val2, '#dc3545', false);
                    // New Members (Blue)
                    renderBar(val1, '#007bff', false);
                }

                // X-axis label
                const labelX = document.createElement('span');
                labelX.className = 'chart-label-x';
                labelX.textContent = data.month;
                barContainer.appendChild(labelX);

                container.appendChild(barContainer);
            });
        };

        const generateAdvancedAnalytics = (isQuick = false) => {
            const data = generateChartData();
            
            if (data.length === 0) {
                if (!isQuick) {
                    document.getElementById('incomeExpenseChart').textContent = 'Not enough data for charts.';
                    document.getElementById('memberGrowthChart').textContent = 'Not enough data for charts.';
                } else {
                    document.getElementById('incomeExpenseChartQuick').textContent = 'Not enough data for quick charts.';
                    document.getElementById('memberGrowthChartQuick').textContent = 'Not enough data for quick charts.';
                }
                document.getElementById('metricAvgRevenue').textContent = formatCurrency(0);
                document.getElementById('metricMostProfitable').textContent = 'N/A';
                document.getElementById('metricTopPayer').textContent = 'N/A';
                return;
            }

            // 1. Render Charts
            const incomeContainerId = isQuick ? 'incomeExpenseChartQuick' : 'incomeExpenseChart';
            const memberContainerId = isQuick ? 'memberGrowthChartQuick' : 'memberGrowthChart';

            renderBarChart(data, incomeContainerId, 'income', 'expense', 'Income', 'Expense');
            renderBarChart(data, memberContainerId, 'newMembers', 'leftMembers', 'New', 'Inactive');


            if (!isQuick) {
                // 2. Calculate Metrics (Only run once on the full reports page)
                const totalMembersActive = members.filter(m => m.status === 'Active').length;
                const totalRevenue = fees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0) + 
                                    financeRecords.filter(r => r.type === 'Income').reduce((sum, r) => sum + r.amount, 0);

                // A. Average Revenue Per Member
                const avgRevenuePerMember = totalMembersActive > 0 ? totalRevenue / totalMembersActive : 0;
                document.getElementById('metricAvgRevenue').textContent = formatCurrency(avgRevenuePerMember);
                
                // B. Most Profitable Month
                const monthlyProfits = {};
                // Recalculate monthly profits for YTD
                [...fees, ...financeRecords].forEach(record => {
                    let date, amount, type;

                    if (record.memberId) { 
                        if (record.status !== 'Paid' || !record.datePaid) return;
                        date = record.datePaid;
                        amount = record.amount;
                        type = 'Income';
                    } else { 
                        date = record.date;
                        amount = record.amount;
                        type = record.type;
                    }
                    
                    const recordDate = new Date(date);
                    const key = `${recordDate.getFullYear()}-${recordDate.getMonth()}`;
                    
                    if (!monthlyProfits[key]) monthlyProfits[key] = 0;
                    
                    if (type === 'Income') {
                        monthlyProfits[key] += amount;
                    } else if (type === 'Expense') {
                        monthlyProfits[key] -= amount;
                    }
                });

                let maxProfit = -Infinity;
                let profitableMonth = 'N/A';

                for (const key in monthlyProfits) {
                    if (monthlyProfits[key] > maxProfit) {
                        maxProfit = monthlyProfits[key];
                        const [year, monthIndex] = key.split('-').map(Number);
                        profitableMonth = new Date(year, monthIndex).toLocaleString('default', { month: 'long', year: 'numeric' });
                    }
                }
                document.getElementById('metricMostProfitable').textContent = maxProfit > 0 ? `${profitableMonth} (${formatCurrency(maxProfit)})` : 'No Profit Yet';

                // C. Top Paying Member
                const memberPayments = {};
                fees.filter(f => f.status === 'Paid').forEach(f => {
                    memberPayments[f.memberId] = (memberPayments[f.memberId] || 0) + f.amount;
                });

                let topPayerId = null;
                let maxPaid = 0;
                for (const id in memberPayments) {
                    if (memberPayments[id] > maxPaid) {
                        maxPaid = memberPayments[id];
                        topPayerId = id;
                    }
                }
                const topPayer = members.find(m => m.id === topPayerId)?.fullName || 'N/A';
                document.getElementById('metricTopPayer').textContent = topPayer !== 'N/A' ? `${topPayer} (${formatCurrency(maxPaid)})` : 'N/A';
            }
        };

        // =========================================================================================
        // 7. SETTINGS & DARK MODE / EXPORT
        // =========================================================================================
        
        const loadSettings = () => {
            document.getElementById('darkModeToggle').checked = settings.darkMode;
            document.getElementById('gymName').value = settings.gymName;
            document.getElementById('gymAddress').value = settings.gymAddress;
            document.getElementById('gymContact').value = settings.gymContact;
            document.getElementById('currencySymbol').value = settings.currencySymbol;
        };

        document.getElementById('darkModeToggle').addEventListener('change', (e) => {
            settings.darkMode = e.target.checked;
            saveData(LS_KEYS.SETTINGS, settings);
            applySettings();
            showToast(`Dark Mode ${settings.darkMode ? 'Enabled' : 'Disabled'}.`, 'secondary');
        });

        document.getElementById('generalSettingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            settings.gymName = document.getElementById('gymName').value;
            settings.gymAddress = document.getElementById('gymAddress').value;
            settings.gymContact = document.getElementById('gymContact').value;
            settings.currencySymbol = document.getElementById('currencySymbol').value;

            saveData(LS_KEYS.SETTINGS, settings);
            applySettings();
            showToast('General settings saved!', 'info');
        });

        const exportData = (key, type) => {
            let data, filename;

            if (key === 'all') {
                data = {
                    members: members,
                    fees: fees,
                    finance: financeRecords,
                    settings: settings
                };
                filename = `gym_backup_${new Date().toISOString().slice(0, 10)}.json`;
                
            } else if (key === 'members') {
                data = members;
                filename = 'members_export.csv';
            } else if (key === 'fees') {
                data = fees;
                filename = 'fees_export.csv';
            } else if (key === 'finance') {
                data = financeRecords;
                filename = 'finance_export.csv';
            }

            let fileContent;
            let mimeType;

            if (type === 'json') {
                fileContent = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
            } else if (type === 'csv') {
                if (data.length === 0) {
                    showToast('No data to export.', 'warning');
                    return;
                }
                const header = Object.keys(data[0]).join(',');
                const rows = data.map(row => Object.values(row).map(value => 
                    `"${String(value).replace(/"/g, '""')}"`).join(','));
                
                fileContent = [header, ...rows].join('\n');
                mimeType = 'text/csv';
            }
            
            const blob = new Blob([fileContent], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast(`Data exported to ${filename} successfully.`, 'success');
        };

        const restoreData = () => {
            const fileInput = document.getElementById('importFileInput');
            const file = fileInput.files[0];

            if (!file) {
                showToast('Please select a JSON backup file.', 'warning');
                return;
            }

            if (!confirm('WARNING: Are you absolutely sure you want to restore? This will overwrite ALL current data!')) {
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const restoredData = JSON.parse(event.target.result);

                    if (restoredData.members && restoredData.fees && restoredData.finance && restoredData.settings) {
                        localStorage.setItem(LS_KEYS.MEMBERS, JSON.stringify(restoredData.members));
                        localStorage.setItem(LS_KEYS.FEES, JSON.stringify(restoredData.fees));
                        localStorage.setItem(LS_KEYS.FINANCE, JSON.stringify(restoredData.finance));
                        localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(restoredData.settings));
                        
                        // Reload data into memory
                        members = restoredData.members;
                        fees = restoredData.fees;
                        financeRecords = restoredData.finance;
                        settings = restoredData.settings;

                        applySettings();
                        showToast('Data restored successfully! Please refresh if display issues persist.', 'success');
                        showSection('dashboard');
                    } else {
                        showToast('Invalid backup file structure.', 'danger');
                    }
                } catch (e) {
                    showToast('Error parsing JSON file: ' + e.message, 'danger');
                }
            };
            reader.readAsText(file);
        };