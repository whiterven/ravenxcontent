document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    const copyButton = document.getElementById('copy-content');
    if (copyButton) {
        copyButton.addEventListener('click', copyContent);
    }

    const downloadButton = document.getElementById('download-content');
    if (downloadButton) {
        downloadButton.addEventListener('click', downloadContent);
    }

    const signoutLink = document.getElementById('signout-link');
    if (signoutLink) {
        signoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            signOut();
        });
    }
}

function copyContent() {
    const contentBody = document.getElementById('content-body');
    if (contentBody) {
        const textArea = document.createElement('textarea');
        textArea.value = contentBody.innerText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Content copied to clipboard!');
    }
}

function downloadContent() {
    const contentBody = document.getElementById('content-body');
    const title = document.querySelector('h2').innerText;
    if (contentBody) {
        const content = contentBody.innerText;
        const blob = new Blob([content], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
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