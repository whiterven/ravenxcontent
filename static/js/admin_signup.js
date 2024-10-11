document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const passwordToggle = document.querySelectorAll('.password-toggle');

    // Password validation function
    function validatePassword(password) {
        const minLength = 8;
        const upperCase = /[A-Z]/;
        const number = /[0-9]/;
        const specialChar = /[@#$!%*?&]/;

        let isValid = password.length >= minLength && upperCase.test(password) && number.test(password) && specialChar.test(password);

        const message = `Password must be at least ${minLength} characters long, contain at least one uppercase letter, one number, and one special character (@#$!%*?&)`;

        return { isValid, message };
    }

    // Show/hide password
    passwordToggle.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const passwordField = this.previousElementSibling;
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                this.textContent = 'Hide';
            } else {
                passwordField.type = 'password';
                this.textContent = 'Show';
            }
        });
    });

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('login_email').value;
            const password = document.getElementById('login_password').value;

            fetch('/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    email: email,
                    password: password,
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    alert(data.message);
                }
            });
        });
    }

    // Handle signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const fullName = document.getElementById('signup_full_name').value;
            const email = document.getElementById('signup_email').value;
            const password = document.getElementById('signup_password').value;
            const confirmPassword = document.getElementById('signup_confirm_password').value;

            const { isValid, message } = validatePassword(password);
            if (!isValid) {
                alert(message);
                return;
            }

            fetch('/admin/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    full_name: fullName,
                    email: email,
                    password: password,
                    confirm_password: confirmPassword,
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    alert(data.message);
                }
            });
        });
    }
});
