document.addEventListener('DOMContentLoaded', function() {
    const signUpForm = document.querySelector('form[action="/signup"]');
    const signInForm = document.querySelector('form[action="/signin"]');

    if (signUpForm) {
        signUpForm.addEventListener('submit', handleSignUp);
    }

    if (signInForm) {
        signInForm.addEventListener('submit', handleSignIn);
    }
});

function handleSignUp(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    fetch('/signup', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/dashboard';
        } else {
            displayError(form, data.message || 'An error occurred during sign up');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayError(form, 'An unexpected error occurred');
    });
}

function handleSignIn(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    fetch('/signin', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = data.redirect || '/dashboard';
        } else {
            displayError(form, data.message || 'Invalid email or password');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        displayError(form, 'An unexpected error occurred');
    });
}

function displayError(form, message) {
    let errorDiv = form.querySelector('.error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message alert alert-danger mt-3';
        form.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
}

function clearError(form) {
    const errorDiv = form.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}