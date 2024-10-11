document.addEventListener('DOMContentLoaded', function() {
    // Common function to fetch data from API
    function fetchData(url, callback) {
        fetch(url)
            .then(response => response.json())
            .then(data => callback(data))
            .catch(error => console.error('Error fetching data:', error));
    }

    // Common function to create pagination
    function createPagination(totalPages, currentPage, elementId, clickHandler) {
        const paginationElement = document.getElementById(elementId);
        if (!paginationElement) return;

        let paginationHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }
        paginationElement.innerHTML = paginationHTML;

        paginationElement.addEventListener('click', function(e) {
            e.preventDefault();
            if (e.target.tagName === 'A') {
                const page = parseInt(e.target.getAttribute('data-page'));
                clickHandler(page);
            }
        });
    }

    // Dashboard functionality
    if (window.location.pathname === '/admin') {
        fetchData('/api/admin/dashboard', function(data) {
            document.getElementById('totalUsers').textContent = data.total_users;
            document.getElementById('totalContent').textContent = data.total_content;
            document.getElementById('revenue').textContent = '$' + data.revenue.toFixed(2);

            const recentSignupsList = document.getElementById('recentSignups');
            recentSignupsList.innerHTML = '';
            data.recent_signups.forEach(user => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = `${user.full_name} (${user.email})`;
                recentSignupsList.appendChild(li);
            });
        });
    }

    // User Management functionality
    if (window.location.pathname === '/admin/users') {
        function loadUsers(page = 1) {
            fetchData(`/api/admin/users?page=${page}`, function(data) {
                const userTable = document.getElementById('userTable').getElementsByTagName('tbody')[0];
                userTable.innerHTML = '';
                data.users.forEach(user => {
                    const row = userTable.insertRow();
                    row.innerHTML = `
                        <td>${user.id}</td>
                        <td>${user.full_name}</td>
                        <td>${user.email}</td>
                        <td>${user.plan}</td>
                        <td>${user.status}</td>
                        <td>
                            <button class="btn btn-sm btn-primary edit-user" data-id="${user.id}">Edit</button>
                            <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}">Delete</button>
                        </td>
                    `;
                });
                createPagination(data.total_pages, data.current_page, 'userPagination', loadUsers);
            });
        }

        loadUsers();

        // Add event listeners for edit and delete buttons
        document.getElementById('userTable').addEventListener('click', function(e) {
            if (e.target.classList.contains('edit-user')) {
                const userId = e.target.getAttribute('data-id');
                // Implement edit user functionality
                console.log('Edit user:', userId);
            } else if (e.target.classList.contains('delete-user')) {
                const userId = e.target.getAttribute('data-id');
                // Implement delete user functionality
                console.log('Delete user:', userId);
            }
        });
    }

    // Content Management functionality
    if (window.location.pathname === '/admin/content') {
        function loadContent(page = 1) {
            const contentType = document.getElementById('contentTypeFilter').value;
            const userId = document.getElementById('userIdFilter').value;
            fetchData(`/api/admin/content?page=${page}&type=${contentType}&user_id=${userId}`, function(data) {
                const contentTable = document.getElementById('contentTable').getElementsByTagName('tbody')[0];
                contentTable.innerHTML = '';
                data.content.forEach(item => {
                    const row = contentTable.insertRow();
                    row.innerHTML = `
                        <td>${item.id}</td>
                        <td>${item.title}</td>
                        <td>${item.type}</td>
                        <td>${item.user_id}</td>
                        <td>${item.created_at}</td>
                        <td>
                            <button class="btn btn-sm btn-primary edit-content" data-id="${item.id}">Edit</button>
                            <button class="btn btn-sm btn-danger delete-content" data-id="${item.id}">Delete</button>
                        </td>
                    `;
                });
                createPagination(data.total_pages, data.current_page, 'contentPagination', loadContent);
            });
        }

        loadContent();

        // Add event listeners for filters
        document.getElementById('contentTypeFilter').addEventListener('change', () => loadContent());
        document.getElementById('userIdFilter').addEventListener('input', () => loadContent());

        // Add event listeners for edit and delete buttons
        document.getElementById('contentTable').addEventListener('click', function(e) {
            if (e.target.classList.contains('edit-content')) {
                const contentId = e.target.getAttribute('data-id');
                // Implement edit content functionality
                console.log('Edit content:', contentId);
            } else if (e.target.classList.contains('delete-content')) {
                const contentId = e.target.getAttribute('data-id');
                // Implement delete content functionality
                console.log('Delete content:', contentId);
            }
        });
    }

    // Subscription Management functionality
    if (window.location.pathname === '/admin/subscriptions') {
        function loadSubscriptions(page = 1) {
            fetchData(`/api/admin/subscriptions?page=${page}`, function(data) {
                const subscriptionTable = document.getElementById('subscriptionTable').getElementsByTagName('tbody')[0];
                subscriptionTable.innerHTML = '';
                data.subscriptions.forEach(subscription => {
                    const row = subscriptionTable.insertRow();
                    row.innerHTML = `
                        <td>${subscription.id}</td>
                        <td>${subscription.customer}</td>
                        <td>${subscription.plan}</td>
                        <td>${subscription.status}</td>
                        <td>${subscription.start_date}</td>
                        <td>${subscription.end_date}</td>
                        <td>
                            <button class="btn btn-sm btn-primary edit-subscription" data-id="${subscription.id}">Edit</button>
                            <button class="btn btn-sm btn-danger cancel-subscription" data-id="${subscription.id}">Cancel</button>
                        </td>
                    `;
                });
                createPagination(data.total_pages, data.current_page, 'subscriptionPagination', loadSubscriptions);
            });
        }

        loadSubscriptions();

        // Add event listeners for edit and cancel buttons
        document.getElementById('subscriptionTable').addEventListener('click', function(e) {
            if (e.target.classList.contains('edit-subscription')) {
                const subscriptionId = e.target.getAttribute('data-id');
                // Implement edit subscription functionality
                console.log('Edit subscription:', subscriptionId);
            } else if (e.target.classList.contains('cancel-subscription')) {
                const subscriptionId = e.target.getAttribute('data-id');
                // Implement cancel subscription functionality
                console.log('Cancel subscription:', subscriptionId);
            }
        });
    }
});