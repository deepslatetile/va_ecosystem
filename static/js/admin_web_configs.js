let currentPages = [];
let pageToDelete = null;

async function loadPages(state = '-1') {
    try {
        const container = document.getElementById('pagesList');
        container.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> Загрузка страниц...</div>';

        const response = await fetch(`/api/get/web_config/state/${state}`);
        if (!response.ok) throw new Error('Не удалось загрузить страницы');

        currentPages = await response.json();
        renderPages();
    } catch (error) {
        console.error('Ошибка загрузки страниц:', error);
        showAlert('Ошибка загрузки страниц: ' + error.message, 'error');
    }
}

function renderPages() {
    const container = document.getElementById('pagesList');

    if (!currentPages || currentPages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>Страницы не найдены</h3>
                <p>Создайте первую страницу!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentPages.map(page => `
        <div class="page-item">
            <div class="page-info">
                <div class="page-name">${page.page_display}</div>
                <div class="page-details">
                    <span class="page-state ${page.state === 1 ? 'state-active' : 'state-inactive'}">
                        <i class="fas ${page.state === 1 ? 'fa-eye' : 'fa-eye-slash'}"></i>
                        ${page.state === 1 ? 'Видима' : 'Скрыта'}
                    </span>
                    <span class="page-url">/${page.page_name}</span>
                </div>
            </div>
            <div class="page-actions">
                <button class="btn-icon btn-toggle" onclick="togglePageState(${page.id}, ${page.state})"
                        title="${page.state === 1 ? 'Скрыть из навигации' : 'Показать в навигации'}">
                    <i class="fas ${page.state === 1 ? 'fa-eye-slash' : 'fa-eye'}"></i>
                    ${page.state === 1 ? 'Скрыть' : 'Показать'}
                </button>
                <button class="btn-icon btn-edit" onclick="editPage(${page.id})" title="Редактировать">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
                <button class="btn-icon btn-delete" onclick="confirmDelete(${page.id}, '${page.page_display}')" title="Удалить">
                    <i class="fas fa-trash"></i> Удалить
                </button>
            </div>
        </div>
    `).join('');
}

async function togglePageState(pageId, currentState) {
    const newState = currentState === 1 ? 0 : 1;
    const action = newState === 1 ? 'показана' : 'скрыта';

    try {
        const response = await fetch(`/api/put/web_config/${pageId}/${newState}`, {
            method: 'PUT'
        });

        if (response.ok) {
            showAlert(`Страница ${action} в навигации успешно`, 'success');
            loadPages(document.getElementById('stateFilter').value);
        } else {
            throw new Error('Не удалось обновить состояние страницы');
        }
    } catch (error) {
        console.error('Ошибка переключения состояния страницы:', error);
        showAlert('Ошибка обновления страницы: ' + error.message, 'error');
    }
}

function createPage() {
    document.getElementById('modalTitle').textContent = 'Добавить страницу';
    document.getElementById('pageForm').reset();
    document.getElementById('pageId').value = '';
    document.getElementById('pageState').value = '1';
    showModal('pageModal');
}

async function editPage(pageId) {
    try {
        const response = await fetch(`/api/get/web_config/id/${pageId}`);
        if (!response.ok) throw new Error('Не удалось загрузить страницу');

        const page = await response.json();

        document.getElementById('modalTitle').textContent = 'Редактировать страницу';
        document.getElementById('pageId').value = page.id;
        document.getElementById('pageName').value = page.page_name;
        document.getElementById('pageDisplay').value = page.page_display;
        document.getElementById('pageState').value = page.state.toString();

        showModal('pageModal');
    } catch (error) {
        console.error('Ошибка загрузки страницы:', error);
        showAlert('Ошибка загрузки страницы: ' + error.message, 'error');
    }
}

async function savePage(formData) {
    const pageId = document.getElementById('pageId').value;
    const isEdit = !!pageId;

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

    try {
        const url = isEdit
            ? `/api/put/page_content/${formData.page_name}`
            : '/api/post/web_config/';

        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showAlert(`Страница ${isEdit ? 'обновлена' : 'создана'} успешно`, 'success');
            hideModal('pageModal');
            loadPages(document.getElementById('stateFilter').value);
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Не удалось сохранить страницу');
        }
    } catch (error) {
        console.error('Ошибка сохранения страницы:', error);
        showAlert('Ошибка сохранения страницы: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить';
    }
}

function confirmDelete(pageId, pageName) {
    pageToDelete = pageId;
    document.getElementById('deletePageName').textContent = pageName;
    showModal('deleteModal');
}

async function deletePage() {
    if (!pageToDelete) return;

    const deleteBtn = document.getElementById('confirmDeleteBtn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Удаление...';

    try {
        const response = await fetch(`/api/delete/web_config/${pageToDelete}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Страница успешно удалена', 'success');
            hideModal('deleteModal');
            loadPages(document.getElementById('stateFilter').value);
        } else {
            throw new Error('Не удалось удалить страницу');
        }
    } catch (error) {
        console.error('Ошибка удаления страницы:', error);
        showAlert('Ошибка удаления страницы: ' + error.message, 'error');
    } finally {
        pageToDelete = null;
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Удалить страницу';
    }
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showAlert(message, type) {
    const alertsContainer = document.getElementById('adminAlerts');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    alertsContainer.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transition = 'opacity 0.5s ease';
        setTimeout(() => alert.remove(), 500);
    }, 4000);
}

document.addEventListener('DOMContentLoaded', function () {
    loadPages();
    document.getElementById('stateFilter').addEventListener('change', function () {
        loadPages(this.value);
    });
    document.getElementById('createPageBtn').addEventListener('click', createPage);
    document.getElementById('pageForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = {
            page_name: document.getElementById('pageName').value.trim(),
            page_display: document.getElementById('pageDisplay').value.trim(),
            state: parseInt(document.getElementById('pageState').value)
        };

        if (!formData.page_name) {
            showAlert('Пожалуйста, введите URL страницы', 'error');
            return;
        }

        if (!formData.page_display) {
            showAlert('Пожалуйста, введите отображаемое имя', 'error');
            return;
        }

        savePage(formData);
    });

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function () {
            const modal = this.closest('.modal');
            hideModal(modal.id);
        });
    });

    document.getElementById('cancelBtn').addEventListener('click', function () {
        hideModal('pageModal');
    });

    document.getElementById('cancelDeleteBtn').addEventListener('click', function () {
        hideModal('deleteModal');
    });

    document.getElementById('confirmDeleteBtn').addEventListener('click', deletePage);

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                hideModal(this.id);
            }
        });
    });
});