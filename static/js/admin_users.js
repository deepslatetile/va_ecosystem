let currentPage = 1;
const perPage = 20;
let currentUserId = null;

document.addEventListener('DOMContentLoaded', function () {
    loadStats();
    loadUsers();
});

async function loadStats() {
    try {
        const response = await fetch('/admin/api/users/stats');
        if (!response.ok) {
            throw new Error('Не удалось загрузить статистику');
        }

        const stats = await response.json();
        displayStats(stats);

    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        document.getElementById('statsGrid').innerHTML = '<div class="alert alert-error">Ошибка загрузки статистики</div>';
    }
}

function displayStats(stats) {
    const statsGrid = document.getElementById('statsGrid');

    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${stats.total_users}</div>
            <div class="stat-label">Всего пользователей</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.active_users}</div>
            <div class="stat-label">Активных пользователей</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.hq_users}</div>
            <div class="stat-label">Пользователей HQ</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.staff_users}</div>
            <div class="stat-label">Персонал</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.passenger_users}</div>
            <div class="stat-label">Пассажиры</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.total_miles}</div>
            <div class="stat-label">Всего миль</div>
        </div>
    `;
}

async function loadUsers(page = 1) {
    currentPage = page;
    const container = document.getElementById('usersContainer');
    container.innerHTML = '<div class="loading">Загрузка пользователей...</div>';

    const search = document.getElementById('searchFilter').value;
    const group = document.getElementById('groupFilter').value;
    const status = document.getElementById('statusFilter').value;

    try {
        const params = new URLSearchParams({
            page: page,
            per_page: perPage,
            ...(search && { search: search }),
            ...(group && { group: group }),
            ...(status && { status: status })
        });

        const response = await fetch(`/admin/api/users?${params}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить пользователей');
        }

        const data = await response.json();
        displayUsers(data);

    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        container.innerHTML = '<div class="alert alert-error">Ошибка загрузки пользователей: ' + error.message + '</div>';
    }
}

function displayUsers(data) {
    const container = document.getElementById('usersContainer');
    const pagination = document.getElementById('pagination');

    if (data.users.length === 0) {
        container.innerHTML = '<div class="loading">Пользователи не найдены</div>';
        pagination.innerHTML = '';
        return;
    }

    container.innerHTML = data.users.map(user => `
        <div class="user-item" onclick="openUserModal(${user.id})">
            <div class="user-header">
                <div class="user-name">${user.nickname}</div>
                <div class="user-id">ID: ${user.id}</div>
            </div>
            <div class="user-details">
                <div class="user-detail">
                    <span class="detail-label">Виртуальный ID:</span>
                    <span>${user.virtual_id || 'Н/Д'}</span>
                </div>
                <div class="user-detail">
                    <span class="detail-label">Группа:</span>
                    <span class="user-group-${user.user_group.toLowerCase()}">${user.user_group}</span>
                </div>
                <div class="user-detail">
                    <span class="detail-label">Мили:</span>
                    <span>${user.miles}</span>
                </div>
                <div class="user-detail">
                    <span class="detail-label">Статус:</span>
                    <span class="status-${user.status || 'active'}">${user.status === 'active' ? 'Активен' : 'Неактивен'}</span>
                </div>
                <div class="user-detail">
                    <span class="detail-label">Создан:</span>
                    <span>${new Date(user.created_at * 1000).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    `).join('');

    pagination.innerHTML = `
        <button onclick="loadUsers(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Предыдущая
        </button>
        <span class="pagination-info">
            Страница ${currentPage} из ${data.total_pages}
        </span>
        <button onclick="loadUsers(${currentPage + 1})" ${currentPage >= data.total_pages ? 'disabled' : ''}>
            Следующая <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

function clearFilters() {
    document.getElementById('searchFilter').value = '';
    document.getElementById('groupFilter').value = '';
    document.getElementById('statusFilter').value = '';
    loadUsers(1);
}

async function openUserModal(userId) {
    currentUserId = userId;
    const modal = document.getElementById('userModal');
    const modalBody = document.getElementById('modalBody');

    try {
        const response = await fetch(`/admin/api/users/${userId}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить данные пользователя');
        }

        const user = await response.json();
        displayUserModal(user);

    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        alert('Ошибка загрузки данных пользователя: ' + error.message);
    }
}

function displayUserModal(user) {
    const modalBody = document.getElementById('modalBody');

    modalBody.innerHTML = `
        <form id="userForm">
            <div class="form-group">
                <label for="userId">ID пользователя:</label>
                <input type="text" id="userId" value="${user.id}" readonly>
            </div>

            <div class="form-group">
                <label for="nickname">Никнейм:</label>
                <input type="text" id="nickname" name="nickname" value="${user.nickname}" required>
            </div>

            <div class="form-group">
                <label for="virtualId">Виртуальный ID:</label>
                <input type="number" id="virtualId" name="virtual_id" value="${user.virtual_id || ''}">
            </div>

            <div class="form-group">
                <label for="socialId">Социальный ID:</label>
                <input type="number" id="socialId" name="social_id" value="${user.social_id || ''}">
            </div>

            <div class="form-group">
                <label for="miles">Мили:</label>
                <input type="number" id="miles" name="miles" value="${user.miles}" required>
            </div>

            <div class="form-group">
                <label for="userGroup">Группа пользователя:</label>
                <select id="userGroup" name="user_group" required>
                    <option value="PAX" ${user.user_group === 'PAX' ? 'selected' : ''}>Пассажир</option>
                    <option value="STF" ${user.user_group === 'STF' ? 'selected' : ''}>Персонал</option>
                    <option value="HQ" ${user.user_group === 'HQ' ? 'selected' : ''}>HQ</option>
                </select>
            </div>

            <div class="form-group">
                <label for="subgroup">Подгруппа:</label>
                <input type="text" id="subgroup" name="subgroup" value="${user.subgroup}" required>
            </div>

            <div class="form-group">
                <label for="link">Ссылка:</label>
                <input type="text" id="link" name="link" value="${user.link || ''}">
            </div>

            <div class="form-group">
                <label for="status">Статус:</label>
                <select id="status" name="status">
                    <option value="active" ${(user.status || 'active') === 'active' ? 'selected' : ''}>Активен</option>
                    <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Неактивен</option>
                </select>
            </div>

            <div class="form-group">
                <label for="metadata">Метаданные:</label>
                <textarea id="metadata" name="metadata">${user.metadata || ''}</textarea>
            </div>

            <div class="form-group">
                <label for="pending">Ожидание:</label>
                <input type="text" id="pending" name="pending" value="${user.pending || ''}">
            </div>

            <div class="form-group">
                <label>Создан:</label>
                <input type="text" value="${new Date(user.created_at * 1000).toLocaleString()}" readonly>
            </div>

            <div class="user-actions">
                <button type="button" class="reset-password-btn" onclick="showResetPasswordModal(${user.id})">
                    <i class="fas fa-key"></i> Сбросить пароль
                </button>
                <button type="button" class="delete-btn" onclick="deleteUser(${user.id})">
                    <i class="fas fa-trash"></i> Удалить пользователя
                </button>
                <button type="button" class="cancel-btn" onclick="closeModal()">Отмена</button>
                <button type="submit" class="save-btn">Сохранить изменения</button>
            </div>
        </form>
    `;

    document.getElementById('userForm').addEventListener('submit', saveUserChanges);
    document.getElementById('userModal').style.display = 'block';
}

async function saveUserChanges(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        nickname: formData.get('nickname'),
        virtual_id: formData.get('virtual_id') ? parseInt(formData.get('virtual_id')) : null,
        social_id: formData.get('social_id') ? parseInt(formData.get('social_id')) : null,
        miles: parseInt(formData.get('miles')),
        user_group: formData.get('user_group'),
        subgroup: formData.get('subgroup'),
        link: formData.get('link'),
        status: formData.get('status'),
        metadata: formData.get('metadata'),
        pending: formData.get('pending')
    };

    try {
        const response = await fetch(`/admin/api/users/${currentUserId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Не удалось обновить пользователя');
        }

        closeModal();
        loadUsers(currentPage);
        loadStats();
        alert('Пользователь успешно обновлён!');

    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        alert('Ошибка обновления пользователя: ' + error.message);
    }
}

function showResetPasswordModal(userId) {
    document.getElementById('resetUserId').value = userId;
    document.getElementById('resetPasswordModal').style.display = 'block';
}

function closeResetPasswordModal() {
    document.getElementById('resetPasswordModal').style.display = 'none';
    document.getElementById('resetPasswordForm').reset();
    document.getElementById('resetPasswordMessage').style.display = 'none';
}

async function resetUserPassword(event) {
    event.preventDefault();

    const userId = document.getElementById('resetUserId').value;
    const newPassword = document.getElementById('resetNewPassword').value;
    const confirmPassword = document.getElementById('resetConfirmPassword').value;
    const messageDiv = document.getElementById('resetPasswordMessage');

    // Валидация
    if (!newPassword || !confirmPassword) {
        showResetPasswordMessage('Пожалуйста, заполните все поля', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showResetPasswordMessage('Новый пароль должен содержать не менее 6 символов', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showResetPasswordMessage('Новые пароли не совпадают', 'error');
        return;
    }

    try {
        const response = await fetch(`/admin/api/users/${userId}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                new_password: newPassword
            })
        });

        const result = await response.json();

        if (response.ok) {
            showResetPasswordMessage(result.message, 'success');
            setTimeout(() => {
                closeResetPasswordModal();
                closeModal();
            }, 2000);
        } else {
            showResetPasswordMessage(result.error || 'Не удалось сбросить пароль', 'error');
        }
    } catch (error) {
        console.error('Ошибка сброса пароля:', error);
        showResetPasswordMessage('Ошибка сброса пароля', 'error');
    }
}

function showResetPasswordMessage(message, type) {
    const messageDiv = document.getElementById('resetPasswordMessage');
    messageDiv.textContent = message;
    messageDiv.className = type === 'success' ? 'alert alert-success' : 'alert alert-error';
    messageDiv.style.display = 'block';
}

async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя? Это действие необратимо.')) {
        return;
    }

    try {
        const response = await fetch(`/admin/api/users/${userId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Не удалось удалить пользователя');
        }

        closeModal();
        loadUsers(currentPage);
        loadStats();
        alert('Пользователь успешно удалён!');

    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        alert('Ошибка удаления пользователя: ' + error.message);
    }
}

function showCreateUserModal() {
    document.getElementById('createUserModal').style.display = 'block';
}

function closeCreateUserModal() {
    document.getElementById('createUserModal').style.display = 'none';
    document.getElementById('createUserForm').reset();
}

async function createUser(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        nickname: formData.get('nickname'),
        password: formData.get('password'),
        user_group: formData.get('user_group'),
        subgroup: formData.get('subgroup'),
        virtual_id: formData.get('virtual_id') ? parseInt(formData.get('virtual_id')) : null,
        social_id: formData.get('social_id') ? parseInt(formData.get('social_id')) : null,
        status: formData.get('status')
    };

    try {
        const response = await fetch('/api/post/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Не удалось создать пользователя');
        }

        closeCreateUserModal();
        loadUsers(1);
        loadStats();
        alert('Пользователь успешно создан!');

    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
        alert('Ошибка создания пользователя: ' + error.message);
    }
}

function closeModal() {
    document.getElementById('userModal').style.display = 'none';
    currentUserId = null;
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('createUserForm').addEventListener('submit', createUser);
    document.getElementById('resetPasswordForm').addEventListener('submit', resetUserPassword);

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.onclick = function () {
            document.getElementById('userModal').style.display = 'none';
            document.getElementById('createUserModal').style.display = 'none';
            document.getElementById('resetPasswordModal').style.display = 'none';
            currentUserId = null;
        }
    });

    window.onclick = function (event) {
        if (event.target === document.getElementById('userModal')) {
            closeModal();
        }
        if (event.target === document.getElementById('createUserModal')) {
            closeCreateUserModal();
        }
        if (event.target === document.getElementById('resetPasswordModal')) {
            closeResetPasswordModal();
        }
    }
});