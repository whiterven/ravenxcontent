// Initialize socket connection
const socket = io.connect('https://' + document.domain + ':' + location.port, {
    transports: ['websocket'],
    secure: true
});

// DOM elements
const userFullnameElement = document.getElementById('user-fullname');
const navbarCollapse = document.getElementById('navbarCollapse');
const contentForm = document.getElementById('contentForm');
const generateBtn = document.querySelector('button[type="submit"]');
const resultContainer = document.createElement('div');
resultContainer.id = 'resultContainer';

// Function to update user information
function updateUserInfo() {
    fetch('/api/dashboard')
        .then(response => response.json())
        .then(data => {
            if (data.user_info) {
                userFullnameElement.textContent = data.user_info.full_name;
                setupUserDropdown(data.user_info);
            }
        })
        .catch(error => console.error('Error fetching user info:', error));
}

// Function to set up user dropdown
function setupUserDropdown(userInfo) {
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'dropdown-menu';
    dropdownMenu.innerHTML = `
        <a class="dropdown-item" href="/profile">Profile</a>
        <a class="dropdown-item" href="/billing">Billing</a>
        <div class="dropdown-divider"></div>
        <a class="dropdown-item" href="/signout">Sign Out</a>
    `;

    const userInfoContainer = userFullnameElement.closest('.d-lg-flex');
    userInfoContainer.classList.add('dropdown');
    userInfoContainer.appendChild(dropdownMenu);

    userInfoContainer.addEventListener('click', function(e) {
        e.preventDefault();
        this.classList.toggle('show');
        dropdownMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!userInfoContainer.contains(e.target)) {
            userInfoContainer.classList.remove('show');
            dropdownMenu.classList.remove('show');
        }
    });
}

// Function to update navigation menu
function updateNavMenu() {
    const navItems = [
        { href: '/dashboard', text: 'Dashboard' },
        { href: '/content', text: 'Generate Content' },
        { href: '/blog', text: 'Blog' }
    ];

    navbarCollapse.querySelector('.navbar-nav').innerHTML = navItems.map(item => 
        `<a href="${item.href}" class="nav-item nav-link">${item.text}</a>`
    ).join('');
}

// Function to handle content generation
function handleContentGeneration(e) {
    e.preventDefault();
    const formData = new FormData(contentForm);
    const jsonData = Object.fromEntries(formData.entries());

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    resultContainer.innerHTML = '<p>Content generation has started. Please wait...</p>';

    fetch('/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Generation started:', data);
        socket.emit('join', { room: data.request_id });
    })
    .catch(error => {
        console.error('Error:', error);
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Content';
        resultContainer.innerHTML = '<p>An error occurred while starting the generation process.</p>';
    });
}

// Socket event handlers
socket.on('connect', function() {
    console.log('Connected to server');
});

socket.on('disconnect', function() {
    console.log('Disconnected from server');
});

socket.on('generation_progress', function(data) {
    console.log('Progress update:', data);
    resultContainer.innerHTML += `<p>${data.message}</p>`;
});

socket.on('generation_complete', function(data) {
    console.log('Generation complete:', data);
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Content';
    
    const formattedContent = formatContent(data.result.final_output);
    
    resultContainer.innerHTML = `
      <div class="generated-content">
        <h3>Generated Content:</h3>
        <div class="content-actions">
          <button onclick="copyToClipboard()" class="btn btn-outline-primary btn-sm">
            <i class="fas fa-copy"></i> Copy
          </button>
          <button onclick="shareContent()" class="btn btn-outline-primary btn-sm">
            <i class="fas fa-share-alt"></i> Share
          </button>
        </div>
        <div id="formattedContent">${formattedContent}</div>
      </div>
    `;
    
    if (data.result.task_outputs && data.result.task_outputs.length > 0) {
      const taskOutputs = data.result.task_outputs.map(task => 
        `<h4>Task ${task.task_id}:</h4><div class="task-output">${formatContent(task.output)}</div>`
      ).join('');
      resultContainer.innerHTML += `
        <div class="task-outputs">
          <h3>Task Outputs:</h3>
          ${taskOutputs}
        </div>
      `;
    }
});

socket.on('generation_error', function(data) {
    console.error('Generation error:', data);
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Content';
    resultContainer.innerHTML = `<p>Error: ${data.error}</p>`;
});

// Helper functions
function formatContent(content) {
    return content
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\* \*\*(.+?)\*\*/g, '<li><strong>$1</strong></li>')
        .replace(/### (.+)/g, '<h3>$1</h3>')
        .replace(/## (.+)/g, '<h2>$1</h2>')
        .replace(/\n/g, '<br>')
        .replace(/<br><br>/g, '</p><p>');
}

function copyToClipboard() {
    const content = document.getElementById('formattedContent').innerText;
    navigator.clipboard.writeText(content).then(() => {
        alert('Content copied to clipboard!');
    }, (err) => {
        console.error('Could not copy text: ', err);
        alert('Failed to copy content');
    });
}

function shareContent() {
    const content = document.getElementById('formattedContent').innerText;
    if (navigator.share) {
        navigator.share({
            title: 'Generated Content',
            text: content
        }).then(() => {
            console.log('Content shared successfully');
        }).catch((error) => {
            console.error('Error sharing content:', error);
            alert('Failed to share content');
        });
    } else {
        alert('Sharing is not supported on this device');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    updateUserInfo();
    updateNavMenu();
    if (contentForm) {
        contentForm.addEventListener('submit', handleContentGeneration);
        contentForm.parentNode.insertBefore(resultContainer, contentForm.nextSibling);
    }
});

// Socket connection handlers
socket.on('connect', function() {
    console.log('Connected to server');
});

socket.on('disconnect', function() {
    console.log('Disconnected from server');
});