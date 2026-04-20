async function loadUserProfile() {
    try {
        const userResponse = await fetch('/api/auth/me');
        if (userResponse.ok) {
            const user = await userResponse.json();
            document.getElementById('userUsername').textContent = user.nickname;
            document.getElementById('userId').textContent = user.id;
            document.getElementById('userCreatedAt').textContent = new Date(user.created_at * 1000).toLocaleDateString();
            document.getElementById('userMiles').textContent = user.miles.toLocaleString();
            document.getElementById('userGroup').textContent = user.user_group + ' | ' + user.subgroup;

            if (user.pfp) {
                document.getElementById('userAvatar').innerHTML = `<img src="${user.pfp}" alt="Аватар" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'">`;
            }
        } else {
            if (userResponse.status === 401) {
                window.location.href = '/login';
                return;
            }
        }

    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        document.getElementById('SOCIALNWKStatus').textContent = 'Ошибка загрузки статуса подключения';
        document.getElementById('VIRTUALNWKStatus').textContent = 'Ошибка загрузки статуса подключения';
    }
}

function updateSOCIALNWKUI(SOCIALNWK) {
    console.log("Данные подключения SOCIALNWK:", SOCIALNWK);

    if (SOCIALNWK.connected) {
        document.getElementById('SOCIALNWKStatus').textContent = 'Подключён';
        document.getElementById('SOCIALNWKConnectBtn').style.display = 'none';
        document.getElementById('SOCIALNWKDisconnectBtn').style.display = 'block';
        document.getElementById('SOCIALNWKDetails').style.display = 'block';

        document.getElementById('SOCIALNWKUsername').textContent = `ID пользователя: ${SOCIALNWK.provider_user_id}`;

        if (SOCIALNWK.connected_at) {
            document.getElementById('SOCIALNWKConnectedSince').textContent = new Date(SOCIALNWK.connected_at * 1000).toLocaleDateString();
        }
    } else {
        document.getElementById('SOCIALNWKStatus').textContent = 'Не подключён';
        document.getElementById('SOCIALNWKConnectBtn').style.display = 'block';
        document.getElementById('SOCIALNWKDisconnectBtn').style.display = 'none';
        document.getElementById('SOCIALNWKDetails').style.display = 'none';
    }
}

function updateVIRTUALNWKUI(VIRTUALNWK) {
    console.log("Данные подключения VIRTUALNWK:", VIRTUALNWK);

    if (VIRTUALNWK.connected) {
        document.getElementById('VIRTUALNWKStatus').textContent = 'Подключён';
        document.getElementById('VIRTUALNWKConnectBtn').style.display = 'none';
        document.getElementById('VIRTUALNWKDisconnectBtn').style.display = 'block';
        document.getElementById('VIRTUALNWKDetails').style.display = 'block';

        if (VIRTUALNWK.connected_at) {
            document.getElementById('VIRTUALNWKConnectedSince').textContent = new Date(VIRTUALNWK.connected_at * 1000).toLocaleDateString();
        }
    } else {
        document.getElementById('VIRTUALNWKStatus').textContent = 'Не подключён';
        document.getElementById('VIRTUALNWKConnectBtn').style.display = 'block';
        document.getElementById('VIRTUALNWKDisconnectBtn').style.display = 'none';
        document.getElementById('VIRTUALNWKDetails').style.display = 'none';
    }
}

async function loadSOCIALNWKConnection() {
    try {
        console.log("Загрузка подключения SOCIALNWK...");
        document.getElementById('SOCIALNWKStatus').textContent = 'Проверка...';

        const SOCIALNWKResponse = await fetch('/auth/SOCIALNWK/connection');
        if (SOCIALNWKResponse.ok) {
            const SOCIALNWK = await SOCIALNWKResponse.json();
            console.log("Ответ подключения SOCIALNWK:", SOCIALNWK);
            updateSOCIALNWKUI(SOCIALNWK);

            if (SOCIALNWK.connected) {
                console.log("Загрузка информации о пользователе SOCIALNWK...");
                const userinfoResponse = await fetch('/auth/SOCIALNWK/userinfo');
                if (userinfoResponse.ok) {
                    const userinfo = await userinfoResponse.json();
                    console.log("Ответ userinfo SOCIALNWK:", userinfo);

                    if (userinfo.SOCIALNWK_user) {
                        const SOCIALNWKUser = userinfo.SOCIALNWK_user;
                        const username = SOCIALNWKUser.global_name || SOCIALNWKUser.username || `Пользователь #${SOCIALNWKUser.id}`;
                        document.getElementById('SOCIALNWKUsername').textContent = username;

                        if (SOCIALNWKUser.avatar && !document.querySelector('#userAvatar img')) {
                            const avatarUrl = `https://cdn.SOCIALNWKapp.com/avatars/${SOCIALNWKUser.id}/${SOCIALNWKUser.avatar}.png`;
                            document.getElementById('userAvatar').innerHTML = `<img src="${avatarUrl}" alt="Аватар SOCIALNWK" style="width: 100%; height: 100%; object-fit: cover;">`;
                        }
                    }
                } else {
                    console.log("Не удалось загрузить userinfo SOCIALNWK:", userinfoResponse.status);
                }
            }
        } else {
            console.log("Не удалось загрузить подключение SOCIALNWK:", SOCIALNWKResponse.status);
            document.getElementById('SOCIALNWKStatus').textContent = 'Не подключён';
        }
    } catch (error) {
        console.error('Ошибка загрузки подключения SOCIALNWK:', error);
        document.getElementById('SOCIALNWKStatus').textContent = 'Ошибка загрузки подключения';
    }
}

async function loadVIRTUALNWKConnection() {
    try {
        console.log("Загрузка подключения VIRTUALNWK...");
        document.getElementById('VIRTUALNWKStatus').textContent = 'Проверка...';

        const VIRTUALNWKResponse = await fetch('/auth/VIRTUALNWK/connection');
        if (VIRTUALNWKResponse.ok) {
            const VIRTUALNWK = await VIRTUALNWKResponse.json();
            console.log("Ответ подключения VIRTUALNWK:", VIRTUALNWK);
            updateVIRTUALNWKUI(VIRTUALNWK);

            if (VIRTUALNWK.connected) {
                console.log("Загрузка информации о пользователе VIRTUALNWK...");
                const userinfoResponse = await fetch('/auth/VIRTUALNWK/userinfo');
                if (userinfoResponse.ok) {
                    const userinfo = await userinfoResponse.json();
                    console.log("Ответ userinfo VIRTUALNWK:", userinfo);

                    if (userinfo.VIRTUALNWK_user) {
                        const VIRTUALNWKUser = userinfo.VIRTUALNWK_user;
                        const username = VIRTUALNWKUser.name || VIRTUALNWKUser.nickname || VIRTUALNWKUser.preferred_username || `Пользователь #${VIRTUALNWKUser.id}`;
                        document.getElementById('VIRTUALNWKUsername').textContent = username;
                    }
                } else {
                    console.log("Не удалось загрузить userinfo VIRTUALNWK:", userinfoResponse.status);
                }
            }
        } else {
            console.log("Не удалось загрузить подключение VIRTUALNWK:", VIRTUALNWKResponse.status);
            document.getElementById('VIRTUALNWKStatus').textContent = 'Не подключён';
        }
    } catch (error) {
        console.error('Ошибка загрузки подключения VIRTUALNWK:', error);
        document.getElementById('VIRTUALNWKStatus').textContent = 'Ошибка загрузки подключения';
    }
}

async function resetPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('passwordMessage');

    // Валидация
    if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage('Пожалуйста, заполните все поля', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('Новый пароль должен содержать не менее 6 символов', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('Новые пароли не совпадают', 'error');
        return;
    }

    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(result.message, 'success');
            // Очищаем поля формы
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showMessage(result.error || 'Не удалось изменить пароль', 'error');
        }
    } catch (error) {
        console.error('Ошибка сброса пароля:', error);
        showMessage('Ошибка изменения пароля', 'error');
    }
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('passwordMessage');
    messageDiv.textContent = message;
    messageDiv.className = type === 'success' ? 'alert alert-success' : 'alert alert-error';
    messageDiv.style.display = 'block';

    // Скрываем сообщение через 5 секунд
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

async function updSOCIALNWKManually() {
    try {
        const SOCIALNWKId = document.getElementById('manual_SOCIALNWK_id').value; // убраны скобки ()

        // Проверка на пустое значение
        if (!SOCIALNWKId.trim()) {
            alert('Пожалуйста, введите SOCIALNWK ID');
            return;
        }

        const response = await fetch('/api/put/user/0', {
            method: 'PUT',
            body: JSON.stringify({ // Добавлен JSON.stringify
                'manual': true,
                'social_id': SOCIALNWKId
            }),
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            alert('Аккаунт SOCIALNWK успешно обновлён!');
            await loadSOCIALNWKConnection();
            await loadUserProfile();
        } else {
            const error = await response.json();
            alert('Не удалось обновить аккаунт SOCIALNWK: ' + error.error);
        }
    } catch (error) {
        console.error('Ошибка обновления SOCIALNWK:', error);
        alert('Ошибка обновления аккаунта SOCIALNWK');
    }
}


document.addEventListener('DOMContentLoaded', function () {
    console.log("Страница профиля загружена, инициализация...");

    // Initialize event listeners
    if (document.getElementById('SOCIALNWKDisconnectBtn')) {
        document.getElementById('SOCIALNWKDisconnectBtn').addEventListener('click', async function () {
            if (confirm('Вы уверены, что хотите отключить аккаунт SOCIALNWK?')) {
                try {
                    const response = await fetch('/auth/SOCIALNWK/disconnect', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });

                    if (response.ok) {
                        alert('Аккаунт SOCIALNWK успешно отключён!');
                        await loadSOCIALNWKConnection();
                        await loadUserProfile();
                    } else {
                        const error = await response.json();
                        alert('Не удалось отключить аккаунт SOCIALNWK: ' + error.error);
                    }
                } catch (error) {
                    console.error('Ошибка отключения SOCIALNWK:', error);
                    alert('Ошибка отключения аккаунта SOCIALNWK');
                }
            }
        });
    }

    if (document.getElementById('VIRTUALNWKDisconnectBtn')) {
        document.getElementById('VIRTUALNWKDisconnectBtn').addEventListener('click', async function () {
            if (confirm('Вы уверены, что хотите отключить аккаунт VIRTUALNWK? Ваш виртуальный ID будет сброшен.')) {
                try {
                    const response = await fetch('/auth/VIRTUALNWK/disconnect', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });

                    if (response.ok) {
                        alert('Аккаунт VIRTUALNWK успешно отключён!');
                        await loadVIRTUALNWKConnection();
                        await loadUserProfile();
                    } else {
                        const error = await response.json();
                        alert('Не удалось отключить аккаунт VIRTUALNWK: ' + error.error);
                    }
                } catch (error) {
                    console.error('Ошибка отключения VIRTUALNWK:', error);
                    alert('Ошибка отключения аккаунта VIRTUALNWK');
                }
            }
        });
    }

    if (document.getElementById('resetPasswordBtn')) {
        document.getElementById('resetPasswordBtn').addEventListener('click', resetPassword);
    }

    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').addEventListener('click', async function () {
            if (confirm('Вы уверены, что хотите выйти?')) {
                try {
                    const response = await fetch('/api/auth/logout', {
                        method: 'POST'
                    });

                    if (response.ok) {
                        window.location.href = '/';
                    } else {
                        alert('Не удалось выйти');
                    }
                } catch (error) {
                    console.error('Ошибка выхода:', error);
                    alert('Ошибка выхода');
                }
            }
        });
    }

    if (document.getElementById('myBookingsBtn')) {
        document.getElementById('myBookingsBtn').addEventListener('click', function () {
            window.location.href = '/my-bookings';
        });
    }

    // Check URL parameters for success/error messages
    checkUrlParameters();

    // Load profile data
    loadUserProfile();
    loadSOCIALNWKConnection();
    loadVIRTUALNWKConnection();

    // Setup alerts auto-hide
    setupAlerts();
});

function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success === 'SOCIALNWK_linked' || success === 'VIRTUALNWK_linked') {
        console.log(`Успех: ${success}, перезагрузка подключений...`);
        loadSOCIALNWKConnection();
        loadVIRTUALNWKConnection();
        loadUserProfile();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function setupAlerts() {
    setTimeout(() => {
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(alert => {
            alert.style.opacity = '0';
            alert.style.transition = 'opacity 0.5s ease';
            setTimeout(() => alert.remove(), 500);
        });
    }, 5000);
}