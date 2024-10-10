document.addEventListener('DOMContentLoaded', function() {
    fetchBillingData();
    setupEventListeners();
});

function fetchBillingData() {
    fetch('/api/billing')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            updateBillingInfo(data);
            updatePaymentMethod(data.paymentMethod);
            updateBillingHistory(data.billingHistory);
        })
        .catch(error => {
            console.error('Error fetching billing data:', error);
            displayErrorMessage('Failed to load billing data. Please try refreshing the page.');
        });
}

function updateBillingInfo(data) {
    document.getElementById('current-plan').textContent = data.currentPlan;
    document.getElementById('billing-cycle').textContent = data.billingCycle;
    document.getElementById('next-billing-date').textContent = data.nextBillingDate;
}

function updatePaymentMethod(paymentMethod) {
    const paymentMethodInfo = document.getElementById('payment-method-info');
    const cardLogo = document.getElementById('card-logo');
    const cardNumber = document.getElementById('card-number');
    const cardExpiry = document.getElementById('card-expiry');

    if (paymentMethod) {
        cardLogo.src = `/static/img/${paymentMethod.type.toLowerCase()}-logo.png`;
        cardLogo.alt = paymentMethod.type;
        cardNumber.textContent = `${paymentMethod.type} ending in ${paymentMethod.last4}`;
        cardExpiry.textContent = `Expires ${paymentMethod.expiryDate}`;
    } else {
        paymentMethodInfo.innerHTML = '<p>No payment method on file</p>';
    }
}

function updateBillingHistory(billingHistory) {
    const billingHistoryBody = document.getElementById('billing-history');
    billingHistoryBody.innerHTML = '';

    billingHistory.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.description}</td>
            <td>$${item.amount.toFixed(2)}</td>
            <td><a href="/download-invoice/${item.invoiceId}" class="btn btn-sm btn-outline-primary">Download</a></td>
        `;
        billingHistoryBody.appendChild(row);
    });
}

function setupEventListeners() {
    const changePlanBtn = document.getElementById('change-plan-btn');
    if (changePlanBtn) {
        changePlanBtn.addEventListener('click', handleChangePlan);
    }

    const updatePaymentBtn = document.getElementById('update-payment-btn');
    if (updatePaymentBtn) {
        updatePaymentBtn.addEventListener('click', showUpdatePaymentModal);
    }

    const updatePaymentForm = document.getElementById('update-payment-form');
    if (updatePaymentForm) {
        updatePaymentForm.addEventListener('submit', handleUpdatePaymentMethod);
    }
}

function handleChangePlan() {
    // Implement plan change logic here
    console.log('Changing plan...');
    // You might want to redirect to a plan selection page or show a modal
}

function showUpdatePaymentModal() {
    $('#updatePaymentModal').modal('show');
}

function handleUpdatePaymentMethod(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    fetch('/api/update-payment-method', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('Payment method updated successfully');
            $('#updatePaymentModal').modal('hide');
            fetchBillingData(); // Refresh the billing data
        } else {
            alert(data.message || 'Failed to update payment method');
        }
    })
    .catch(error => {
        console.error('Error updating payment method:', error);
        alert('An error occurred while updating the payment method. Please try again.');
    });
}

function displayErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = message;
    document.querySelector('.container').insertBefore(errorDiv, document.querySelector('.container').firstChild);
}