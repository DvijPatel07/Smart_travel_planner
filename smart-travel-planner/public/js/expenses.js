// Back button functionality
function goBack() {
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('trip_id');
    if (tripId) {
        window.location.href = `trip.html?id=${tripId}`;
    } else {
        window.location.href = 'dashboard.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // NOTE: API_URL, checkAuth, and getAuthHeaders must be defined in auth.js
    // and loaded *before* this script.
    
    // Initial check for authentication
    if (typeof checkAuth === 'function') {
        checkAuth();
    } else {
        console.error('checkAuth() not found. Ensure auth.js loads before expenses.js');
    }
    
    let latestTripId = null;

    async function fetchLatestTrip() {
        try {
            // CORRECTED: Use the API_URL variable for the full path
            const response = await fetch(`${API_URL}/trips.php?action=list`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            console.log("Trips response:", data);

            // Ensure 'trips' key and correct array
            if (data.success && Array.isArray(data.trips) && data.trips.length > 0 && data.trips[0].id) {
                latestTripId = data.trips[0].id;
                fetchExpenses();
            } else {
                // Assuming an element with ID 'error-message' or similar exists for trip fetching status
                const tripErrorDiv = document.querySelector('.error-fetching-trips') || document.getElementById('error-message');
                if (tripErrorDiv) {
                    tripErrorDiv.textContent = 'No trips found for your account.';
                    // You might need to change the ID or class based on your actual HTML
                }
                latestTripId = null;
            }
        } catch (error) {
            console.error('Error fetching trips:', error);
            // Update the UI element that showed 'Error fetching trips.'
            const tripErrorDiv = document.querySelector('.error-fetching-trips') || document.getElementById('error-message');
            if (tripErrorDiv) {
                tripErrorDiv.textContent = 'Error fetching trips.';
            }
        }
    }

    async function fetchExpenses() {
        if (!latestTripId) return;
        // CORRECTED: Use the API_URL variable for the full path
        const response = await fetch(`${API_URL}/expenses.php?action=trip-expenses&trip_id=${latestTripId}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        const expensesListContainer = document.getElementById('expenses-list');
        if (!expensesListContainer) return;


        if (!data.success) {
            expensesListContainer.innerHTML = `<p>${data.message}</p>`;
            return;
        }

        if (!Array.isArray(data.expenses) || data.expenses.length === 0) {
            expensesListContainer.innerHTML = '<p>No expenses added yet.</p>';
            return;
        }

        let tableHTML = `<table id="expenses-table"><thead>
            <tr><th>Description</th><th>Amount</th><th>Paid By</th><th>Date</th></tr>
            </thead><tbody>`;
        data.expenses.forEach(expense => {
            tableHTML += `<tr>
                <td>${expense.description}</td>
                <td>₹${parseFloat(expense.amount).toFixed(2)}</td>
                <td>${expense.paid_by_name}</td>
                <td>${new Date(expense.created_at).toLocaleDateString()}</td>
            </tr>`;
        });
        tableHTML += '</tbody></table>';
        expensesListContainer.innerHTML = tableHTML;
    }

    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!latestTripId) {
                alert('You must create a trip first.');
                return;
            }

            const description = document.getElementById('description').value.trim();
            const amount = parseFloat(document.getElementById('amount').value);
            if (!description || isNaN(amount) || amount <= 0) {
                alert('Please enter valid description and amount.');
                return;
            }

            const postData = {
                trip_id: latestTripId,
                description,
                amount
            };

            // CORRECTED: Use the API_URL variable for the full path
            const response = await fetch(`${API_URL}/expenses.php?action=add`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });
            const data = await response.json();
            alert(data.message);
            if (data.success) {
                document.getElementById('description').value = '';
                document.getElementById('amount').value = '';
                fetchExpenses();
            }
        });
    }

    fetchLatestTrip();
});