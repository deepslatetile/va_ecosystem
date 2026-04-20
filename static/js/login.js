document.addEventListener('DOMContentLoaded', function () {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const authForms = document.querySelectorAll('.auth-form');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const targetTab = this.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            authForms.forEach(form => {
                form.classList.remove('active');
                if (form.id === targetTab + 'Form') {
                    form.classList.add('active');
                }
            });
        });
    });

    document.getElementById('loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        handleLogin();
    });

    document.getElementById('registerForm').addEventListener('submit', function (e) {
        e.preventDefault();
        handleRegister();
    });
});

async function handleLogin() {
    const formData = {
        username: document.getElementById('loginUsername').value,
        password: document.getElementById('loginPassword').value
    };

    const submitBtn = document.querySelector('#loginForm .auth-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Вход выполнен успешно! Перенаправление...', 'success');

            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect');

            setTimeout(() => {
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                } else {
                    window.location.href = '/';
                }
            }, 1000);
        } else {
            showMessage('Ошибка входа: ' + (result.error || 'Неверные учетные данные'), 'error');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        showMessage('Ошибка входа. Пожалуйста, попробуйте снова.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleRegister() {
    const formData = {
        nickname: document.getElementById('regNickname').value,
        password: document.getElementById('regPassword').value,
        user_group: 'PAX',
        subgroup: ''
    };

    if (formData.password !== document.getElementById('regConfirmPassword').value) {
        showMessage('Пароли не совпадают!', 'error');
        return;
    }

    if (formData.password.length < 6) {
        showMessage('Пароль должен содержать не менее 6 символов!', 'error');
        return;
    }

    const submitBtn = document.querySelector('#registerForm .auth-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание аккаунта...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/auth/post/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Регистрация успешна! Пожалуйста, войдите с новым аккаунтом.', 'success');

            setTimeout(() => {
                document.querySelector('[data-tab="login"]').click();
                document.getElementById('loginUsername').value = formData.nickname;
                document.getElementById('regNickname').value = '';
                document.getElementById('regPassword').value = '';
                document.getElementById('regConfirmPassword').value = '';
            }, 1500);
        } else {

            showMessage('Ошибка регистрации: ' + (result.error || 'Пожалуйста, попробуйте снова'), 'error');
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showMessage('Ошибка регистрации. Пожалуйста, попробуйте снова.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showMessage(message, type) {
    const existingMessage = document.querySelector('.auth-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        ${message}
    `;

    const authCard = document.querySelector('.auth-card');
    authCard.parentNode.insertBefore(messageDiv, authCard);

    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 10000);
}