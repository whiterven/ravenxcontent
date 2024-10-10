document.addEventListener('DOMContentLoaded', function() {
    // Fetch user data and populate the profile
    fetchUserData();

    // Set up event listeners
    document.getElementById('profile-form').addEventListener('submit', updateProfile);
});

function fetchUserData() {
    fetch('/api/user-data')
        .then(response => response.json())
        .then(data => {
            populateUserData(data);
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            showAlert('Error loading user data. Please try again.', 'danger');
        });
}

function populateUserData(data) {
    // Populate header
    document.getElementById('user-fullname').textContent = data.fullName;

    // Populate profile section
    document.getElementById('profile-fullname').textContent = data.fullName;
    document.getElementById('profile-email').textContent = data.email;
    document.getElementById('member-since').textContent = new Date(data.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('subscription-plan').textContent = data.subscriptionPlan;

    // Populate form fields
    document.getElementById('fullName').value = data.fullName;
    document.getElementById('email').value = data.email;
}

function updateProfile(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    // Basic form validation
    if (data.password !== data.confirmPassword) {
        showAlert('Passwords do not match.', 'danger');
        return;
    }

    fetch('/api/update-profile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showAlert('Profile updated successfully!', 'success');
            fetchUserData(); // Refresh user data
        } else {
            showAlert(result.message || 'Error updating profile.', 'danger');
        }
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        showAlert('An error occurred while updating your profile.', 'danger');
    });
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;

    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);

    // Automatically remove the alert after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}