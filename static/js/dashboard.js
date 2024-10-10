document.addEventListener('DOMContentLoaded', function() {
    fetchDashboardData();
    setupEventListeners();
});

function fetchDashboardData() {
    fetch('/api/dashboard')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            updateUserStatistics(data.user_statistics);
            updateRecentContent(data.recent_content);
            updateContentChart(data.content_analytics);
            updateAccountSettings(data.user_info);
            updateUserFullName(data.user_info.full_name);
        })
        .catch(error => {
            console.error('Error fetching dashboard data:', error);
            displayErrorMessage('Failed to load dashboard data. Please try refreshing the page.');
        });
}

function updateUserStatistics(statistics) {
    if (statistics) {
        document.getElementById('total-content').textContent = statistics.total_content || '0';
        document.getElementById('active-projects').textContent = statistics.active_projects || '0';
        document.getElementById('account-status').textContent = statistics.account_status || 'N/A';
    }
}

function updateRecentContent(content) {
    const recentContentContainer = document.getElementById('recent-content');
    if (recentContentContainer) {
        recentContentContainer.innerHTML = '';
        if (Array.isArray(content) && content.length > 0) {
            content.forEach(item => {
                const contentHtml = `
                    <div class="bg-light p-4 mb-4">
                        <div class="d-flex align-items-center mb-3">
                            <h5 class="text-uppercase m-0">${escapeHtml(item.title)}</h5>
                            <span class="badge badge-primary ml-auto">${escapeHtml(item.type)}</span>
                        </div>
                        <p class="m-0">Generated on: <span class="text-primary">${escapeHtml(item.date)}</span></p>
                        <a href="/view-content/${item.id}" class="btn btn-sm btn-outline-primary mt-2">View Content</a>
                    </div>
                `;
                recentContentContainer.innerHTML += contentHtml;
            });
        } else {
            recentContentContainer.innerHTML = '<p>No recent content available.</p>';
        }
    }
}

function updateContentChart(analyticsData) {
    const ctx = document.getElementById('contentChart');
    if (ctx && analyticsData && analyticsData.labels && analyticsData.data) {
        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: analyticsData.labels,
                datasets: [{
                    label: 'Content Generated',
                    data: analyticsData.data,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } else {
        console.error('Invalid analytics data or missing chart element');
    }
}

function updateAccountSettings(userInfo) {
    if (userInfo) {
        document.getElementById('fullName').value = userInfo.full_name || '';
        document.getElementById('email').value = userInfo.email || '';
    }
}

function updateUserFullName(fullName) {
    const userFullNameElement = document.getElementById('user-fullname');
    if (userFullNameElement) {
        userFullNameElement.textContent = fullName || 'User';
    }
}

function setupEventListeners() {
    const accountSettingsForm = document.getElementById('account-settings-form');
    if (accountSettingsForm) {
        accountSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateAccountSettingsOnServer(new FormData(accountSettingsForm));
        });
    }

    const signoutLink = document.getElementById('signout-link');
    if (signoutLink) {
        signoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            signOut();
        });
    }
}

function updateAccountSettingsOnServer(formData) {
    fetch('/api/update-account', {
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
            alert('Account settings updated successfully');
            updateUserFullName(formData.get('fullName'));
        } else {
            alert(data.message || 'Failed to update account settings');
        }
    })
    .catch(error => {
        console.error('Error updating account settings:', error);
        alert('An error occurred while updating account settings. Please try again.');
    });
}

function signOut() {
    fetch('/signout', {
        method: 'POST'
    })
    .then(response => {
        if (response.ok) {
            window.location.href = '/';
        } else {
            throw new Error('Signout failed');
        }
    })
    .catch(error => {
        console.error('Error signing out:', error);
        alert('An error occurred while signing out. Please try again.');
    });
}

function displayErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = message;
    document.body.insertBefore(errorDiv, document.body.firstChild);
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}