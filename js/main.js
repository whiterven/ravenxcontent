(function ($) {
    "use strict";
    
    // Dropdown on mouse hover
    $(document).ready(function () {
        function toggleNavbarMethod() {
            if ($(window).width() > 992) {
                $('.navbar .dropdown').on('mouseover', function () {
                    $('.dropdown-toggle', this).trigger('click');
                }).on('mouseout', function () {
                    $('.dropdown-toggle', this).trigger('click').blur();
                });
            } else {
                $('.navbar .dropdown').off('mouseover').off('mouseout');
            }
        }
        toggleNavbarMethod();
        $(window).resize(toggleNavbarMethod);
    });
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });

    // Portfolio isotope and filter
    var portfolioIsotope = $('.portfolio-container').isotope({
        itemSelector: '.portfolio-item',
        layoutMode: 'fitRows'
    });
    $('#portfolio-flters li').on('click', function () {
        $("#portfolio-flters li").removeClass('active');
        $(this).addClass('active');
        portfolioIsotope.isotope({filter: $(this).data('filter')});
    });

    // Team carousel
    $(".team-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        margin: 30,
        dots: false,
        loop: true,
        nav : true,
        navText : [
            '<i class="fa fa-angle-left" aria-hidden="true"></i>',
            '<i class="fa fa-angle-right" aria-hidden="true"></i>'
        ],
        responsive: {
            0:{
                items:1
            },
            576:{
                items:1
            },
            768:{
                items:2
            },
            992:{
                items:3
            }
        }
    });

    // Testimonials carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1500,
        margin: 30,
        dots: true,
        loop: true,
        center: true,
        responsive: {
            0:{
                items:1
            },
            576:{
                items:1
            },
            768:{
                items:2
            },
            992:{
                items:3
            }
        }
    });

    // Blog functionality
    let currentPostId = null;
    const posts = {
        1: {
            title: "The Future of AI in Content Creation",
            content: "Full content of the post goes here...",
            image: "img/blog-1.jpg",
            likes: 15,
            comments: 7,
            liked: false
        },
        2: {
            title: "5 Ways to Optimize Your Content Strategy",
            content: "Full content of the post goes here...",
            image: "img/blog-2.jpg",
            likes: 23,
            comments: 12,
            liked: false
        },
        3: {
            title: "SEO Best Practices for AI-Generated Content",
            content: "Full content of the post goes here...",
            image: "img/blog-3.jpg",
            likes: 18,
            comments: 9,
            liked: false
        }
    };

    function isAuthenticated() {
        // This function should check if the user is authenticated
        // For now, we'll just return true for demonstration purposes
        return true;
    }

    window.showFullPost = function(postId) {
        if (!posts[postId]) {
            console.error('Post not found');
            return;
        }

        currentPostId = postId;
        const post = posts[postId];

        $('#fullPostModalLabel').text(post.title);
        $('#fullPostImage').attr('src', post.image);
        $('#fullPostContent').html(post.content);

        const likeButton = $('#likeFullPostBtn');
        likeButton.html(`<i class="far fa-heart"></i> ${post.liked ? 'Unlike' : 'Like'} (${post.likes})`);

        $('#fullPostModal').modal('show');
    }

    window.likePost = function(postId) {
        if (!isAuthenticated()) {
            alert('Please log in to like posts.');
            return;
        }

        const post = posts[postId];
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;

        $(`#likes-${postId}`).text(post.likes);

        const likeButton = $(`[onclick="likePost(${postId})"]`);
        likeButton.html(`<i class="far fa-heart"></i> ${post.likes}`);
    }

    window.likeFullPost = function() {
        if (currentPostId) {
            likePost(currentPostId);
            const likeButton = $('#likeFullPostBtn');
            likeButton.html(`<i class="far fa-heart"></i> ${posts[currentPostId].liked ? 'Unlike' : 'Like'} (${posts[currentPostId].likes})`);
        }
    }

    window.showComments = function(postId) {
        if (!isAuthenticated()) {
            alert('Please log in to view and post comments.');
            return;
        }

        currentPostId = postId;
        const post = posts[postId];
        const commentsList = $('#commentsList');
        commentsList.html('<p>Loading comments...</p>');
        // Here you would normally fetch comments from a server
        // For demonstration, we'll just show a placeholder
        setTimeout(() => {
            commentsList.html(`
                <div class="comment">
                    <strong>User1:</strong> Great post!
                </div>
                <div class="comment">
                    <strong>User2:</strong> Very informative, thanks!
                </div>
            `);
        }, 1000);

        $('#commentsModal').modal('show');
    }

    window.showFullPostComments = function() {
        if (currentPostId) {
            showComments(currentPostId);
        }
    }

    window.sharePost = function() {
        // Implement share functionality (e.g., copy link, share to social media)
        alert('Share functionality to be implemented');
    }

    $('#commentForm').submit(function(e) {
        e.preventDefault();
        if (!isAuthenticated()) {
            alert('Please log in to post comments.');
            return;
        }
        const commentText = $('#commentText').val();
        // Here you would normally send the comment to a server
        alert(`Comment submitted: ${commentText}`);
        $('#commentText').val('');
        // Update the comments count
        if (currentPostId) {
            posts[currentPostId].comments++;
            $(`#comments-${currentPostId}`).text(posts[currentPostId].comments);
        }
    });
    
})(jQuery);

document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    const navLinks = document.querySelectorAll('.dashboard-sidebar nav a');
    const sections = document.querySelectorAll('.dashboard-section');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            sections.forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(targetSection).classList.add('active');
            navLinks.forEach(navLink => {
                navLink.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    // Overview Chart
    const overviewCtx = document.getElementById('overviewChart').getContext('2d');
    new Chart(overviewCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Content Created',
                data: [120, 190, 300, 500, 800, 1234],
                borderColor: 'rgb(255, 170, 23)',
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

    // Analytics Chart
    const analyticsCtx = document.getElementById('analyticsChart').getContext('2d');
    new Chart(analyticsCtx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'User Engagement',
                data: [65, 59, 80, 81, 56, 55, 40],
                backgroundColor: 'rgba(255, 170, 23, 0.6)'
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

    // Content Management
    const contentTableBody = document.getElementById('contentTableBody');
    const contentData = [
        { title: 'Welcome Post', type: 'Blog', created: '2023-06-01', status: 'Published' },
        { title: 'AI in Marketing', type: 'Whitepaper', created: '2023-06-05', status: 'Draft' },
        { title: 'Customer Success Story', type: 'Case Study', created: '2023-06-10', status: 'Review' }
    ];

    function renderContentTable() {
        contentTableBody.innerHTML = '';
        contentData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.title}</td>
                <td>${item.type}</td>
                <td>${item.created}</td>
                <td>${item.status}</td>
                <td>
                    <button class="btn btn-sm btn-edit">Edit</button>
                    <button class="btn btn-sm btn-delete">Delete</button>
                </td>
            `;
            contentTableBody.appendChild(row);
        });
    }

    renderContentTable();

    // Team Management
    const teamTableBody = document.getElementById('teamTableBody');
    const teamData = [
        { name: 'John Doe', role: 'Admin', email: 'john@ravenx.com', status: 'Active' },
        { name: 'Jane Smith', role: 'Editor', email: 'jane@ravenx.com', status: 'Active' },
        { name: 'Bob Johnson', role: 'Viewer', email: 'bob@ravenx.com', status: 'Invited' }
    ];

    function renderTeamTable() {
        teamTableBody.innerHTML = '';
        teamData.forEach(member => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${member.name}</td>
                <td>${member.role}</td>
                <td>${member.email}</td>
                <td>${member.status}</td>
                <td>
                    <button class="btn btn-sm btn-edit">Edit</button>
                    <button class="btn btn-sm btn-delete">Remove</button>
                </td>
            `;
            teamTableBody.appendChild(row);
        });
    }

    renderTeamTable();

    // Settings Form
    const settingsForm = document.getElementById('settingsForm');
    settingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Settings saved successfully!');
    });

    // New Content Button
    const newContentBtn = document.getElementById('newContentBtn');
    newContentBtn.addEventListener('click', function() {
        alert('New content creation form will be implemented here.');
    });

    // Invite Team Member Button
    const inviteTeamMember = document.getElementById('inviteTeamMember');
    inviteTeamMember.addEventListener('click', function() {
        alert('Team member invitation form will be implemented here.');
    });
});

// Establish WebSocket connection
const socket = io.connect('http://' + document.domain + ':' + location.port);

// DOM Elements
const userFullname = document.getElementById('user-fullname');
const totalContent = document.getElementById('total-content');
const activeProjects = document.getElementById('active-projects');
const accountStatus = document.getElementById('account-status');
const contentForm = document.getElementById('contentForm');
const generateBtn = document.querySelector('#contentForm button[type="submit"]');
const outputContainer = document.getElementById('outputContainer');

// User profile dropdown
const profileDropdown = document.createElement('div');
profileDropdown.className = 'profile-dropdown';
profileDropdown.innerHTML = `
    <button class="profile-btn">Profile</button>
    <div class="dropdown-content">
        <a href="/settings">Settings</a>
        <a href="/signout">Sign Out</a>
    </div>
`;
document.querySelector('.navbar-nav').appendChild(profileDropdown);

// Initialize dashboard chart
let contentChart;

// Function to update user information
function updateUserInfo(data) {
    userFullname.textContent = data.fullname;
    totalContent.textContent = data.totalContent;
    activeProjects.textContent = data.activeProjects;
    accountStatus.textContent = data.accountStatus;
}

// Function to update content generation chart
function updateContentChart(data) {
    if (contentChart) {
        contentChart.destroy();
    }

    const ctx = document.getElementById('contentChart').getContext('2d');
    contentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Content Generated',
                data: data.values,
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Function to display generated content
function displayGeneratedContent(content) {
    outputContainer.innerHTML = `
        <h3>Generated Content</h3>
        <div class="generated-content">
            ${content}
        </div>
    `;
    outputContainer.style.display = 'block';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Request initial user data and chart data
    socket.emit('request_user_data');
    socket.emit('request_chart_data');

    // Handle content form submission
    if (contentForm) {
        contentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(contentForm);
            const data = Object.fromEntries(formData.entries());

            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';

            socket.emit('generate_content', data);
        });
    }
});

// WebSocket event handlers
socket.on('connect', () => {
    console.log('WebSocket connected');
});

socket.on('user_data', (data) => {
    updateUserInfo(data);
});

socket.on('chart_data', (data) => {
    updateContentChart(data);
});

socket.on('generation_started', (data) => {
    console.log('Content generation started:', data.request_id);
});

socket.on('generation_progress', (data) => {
    console.log('Generation progress:', data.progress);
    // Update progress bar or status message here
});

socket.on('generation_complete', (data) => {
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Content';
    displayGeneratedContent(data.result.final_output);
});

socket.on('generation_error', (data) => {
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Content';
    alert('Error generating content: ' + data.error);
});

// Profile dropdown functionality
document.querySelector('.profile-btn').addEventListener('click', () => {
    document.querySelector('.dropdown-content').classList.toggle('show');
});

// Close the dropdown if the user clicks outside of it
window.addEventListener('click', (event) => {
    if (!event.target.matches('.profile-btn')) {
        const dropdowns = document.getElementsByClassName('dropdown-content');
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
});

// billing.js

document.addEventListener('DOMContentLoaded', function() {
    // Load user's billing information
    loadBillingInfo();

    // Add event listeners
    document.getElementById('change-plan-btn').addEventListener('click', changePlan);
    document.getElementById('update-payment-btn').addEventListener('click', updatePaymentMethod);
});

function loadBillingInfo() {
    // Simulated data - in a real application, this would be fetched from a server
    const billingInfo = {
        currentPlan: 'Premium',
        billingCycle: 'Monthly',
        nextBillingDate: 'June 15, 2023',
        paymentMethod: {
            type: 'Visa',
            lastFour: '1234',
            expiryDate: '12/2025'
        },
        billingHistory: [
            { date: '2023-05-15', description: 'Monthly subscription', amount: '$49.99', invoice: 'INV-001' },
            { date: '2023-04-15', description: 'Monthly subscription', amount: '$49.99', invoice: 'INV-002' },
            { date: '2023-03-15', description: 'Monthly subscription', amount: '$49.99', invoice: 'INV-003' }
        ]
    };

    // Update current plan information
    document.getElementById('current-plan').textContent = billingInfo.currentPlan;
    document.getElementById('billing-cycle').textContent = billingInfo.billingCycle;
    document.getElementById('next-billing-date').textContent = billingInfo.nextBillingDate;

    // Update payment method information
    const paymentMethodInfo = document.getElementById('payment-method-info');
    paymentMethodInfo.querySelector('p:nth-child(2)').textContent = `${billingInfo.paymentMethod.type} ending in ${billingInfo.paymentMethod.lastFour}`;
    paymentMethodInfo.querySelector('p:nth-child(3)').textContent = `Expires ${billingInfo.paymentMethod.expiryDate}`;

    // Populate billing history
    const billingHistoryTable = document.getElementById('billing-history');
    billingInfo.billingHistory.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.description}</td>
            <td>${entry.amount}</td>
            <td><a href="#" onclick="downloadInvoice('${entry.invoice}')">Download</a></td>
        `;
        billingHistoryTable.appendChild(row);
    });
}

function changePlan() {
    // In a real application, this would open a modal or redirect to a plan selection page
    alert('Changing plan functionality would be implemented here. This might open a modal with plan options or redirect to a plan selection page.');
}

function updatePaymentMethod() {
    // In a real application, this would open a form to update payment details
    alert('Updating payment method functionality would be implemented here. This might open a form to enter new payment details.');
}

function downloadInvoice(invoiceId) {
    // In a real application, this would trigger a download of the invoice PDF
    alert(`Downloading invoice ${invoiceId}. In a real application, this would initiate the download of a PDF invoice.`);
}

// Function to format currency (for demonstration purposes)
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Function to format dates (for demonstration purposes)
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Function to handle subscription cancellation
function cancelSubscription() {
    if (confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
        // In a real application, this would send a request to the server to cancel the subscription
        alert('Your subscription has been canceled. We're sorry to see you go!');
        // Update UI to reflect cancellation
        document.getElementById('current-plan').textContent = 'Canceled';
        document.getElementById('change-plan-btn').textContent = 'Reactivate Subscription';
    }
}

// Function to handle reactivating a canceled subscription
function reactivateSubscription() {
    // In a real application, this would open a modal or redirect to a page to choose a new plan
    alert('To reactivate your subscription, please choose a new plan.');
    // This could then call the changePlan() function or similar
}

// Event delegation for dynamically created elements
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'cancel-subscription-btn') {
        cancelSubscription();
    } else if (e.target && e.target.id === 'reactivate-subscription-btn') {
        reactivateSubscription();
    }
});

// Function to refresh billing data (simulated)
function refreshBillingData() {
    // In a real application, this would fetch fresh data from the server
    console.log('Refreshing billing data...');
    loadBillingInfo(); // For now, just reload the same data
    alert('Billing information has been refreshed.');
}

// Add a refresh button to the UI programmatically
function addRefreshButton() {
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh Billing Data';
    refreshButton.className = 'btn btn-secondary mt-3';
    refreshButton.onclick = refreshBillingData;
    document.querySelector('.col-lg-8').appendChild(refreshButton);
}

// Call this function when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    addRefreshButton();
    // ... other initialization code ...
});