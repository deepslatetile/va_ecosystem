let fleetData = [];
let currentAircraftId = null;

const modal = document.getElementById('aircraftModal');
const modalTitle = document.getElementById('modalTitle');
const aircraftForm = document.getElementById('aircraftForm');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelAircraftBtn');

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
    }, 5000);

    alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function loadFleetData() {
    try {
        const response = await fetch('/api/get/about_us?group=fleet');
        if (!response.ok) throw new Error('Не удалось загрузить данные о флоте');

        fleetData = await response.json();
        renderFleetTable();

    } catch (error) {
        console.error('Ошибка загрузки флота:', error);
        showAlert('Не удалось загрузить данные о флоте: ' + error.message, 'error');
    }
}

function renderFleetTable() {
    const tbody = document.getElementById('fleetTableBody');

    if (fleetData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-cell">
                    <i class="fas fa-plane-slash"></i>
                    <p>Воздушные суда не найдены. Добавьте первое судно!</p>
                </td>
            </tr>
        `;
        return;
    }

    fleetData.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    tbody.innerHTML = fleetData.map(aircraft => `
        <tr>
            <td>${aircraft.name}</td>
            <td>${getAircraftTypeLabel(aircraft.fleet_type)}</td>
            <td><code>${aircraft.registration_number || 'N/A'}</code></td>
            <td>${aircraft.capacity || 'N/A'}</td>
            <td>${aircraft.first_flight || 'N/A'}</td>
            <td>
                <span class="status-badge ${aircraft.is_active ? 'badge-active' : 'badge-inactive'}">
                    ${aircraft.is_active ? 'Активен' : 'Неактивен'}
                </span>
             </td>
            <td>
                <div class="action-buttons">
                    <button onclick="editAircraft(${aircraft.id})" class="btn-small btn-edit">
                        <i class="fas fa-edit"></i> Редактировать
                    </button>
                    <button onclick="toggleAircraftStatus(${aircraft.id}, ${aircraft.is_active})" 
                            class="btn-small btn-toggle ${aircraft.is_active ? '' : 'inactive'}">
                        <i class="fas fa-power-off"></i> ${aircraft.is_active ? 'Деактивировать' : 'Активировать'}
                    </button>
                    <button onclick="deleteAircraft(${aircraft.id})" class="btn-small btn-delete">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
             </td>
         </tr>
    `).join('');
}

function getAircraftTypeLabel(type) {
    const types = {
        'narrow-body': 'Узкофюзеляжный',
        'wide-body': 'Широкофюзеляжный',
        'regional': 'Региональный',
        'cargo': 'Грузовой'
    };
    return types[type] || type;
}

function openModal(isEdit = false) {
    modal.style.display = 'flex';
    modalTitle.textContent = isEdit ? 'Редактировать воздушное судно' : 'Добавить воздушное судно';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.style.display = 'none';
    currentAircraftId = null;
    aircraftForm.reset();
    document.body.style.overflow = 'auto';
}

function editAircraft(id) {
    const aircraft = fleetData.find(a => a.id === id);
    if (!aircraft) return;

    currentAircraftId = id;

    document.getElementById('aircraftId').value = aircraft.id;
    document.getElementById('aircraftName').value = aircraft.name || '';
    document.getElementById('fleetType').value = aircraft.fleet_type || '';
    document.getElementById('registrationNumber').value = aircraft.registration_number || '';
    document.getElementById('capacity').value = aircraft.capacity || '';
    document.getElementById('firstFlight').value = aircraft.first_flight || '';
    document.getElementById('displayOrder').value = aircraft.display_order || 0;
    document.getElementById('aircraftDescription').value = aircraft.description || '';
    document.getElementById('aircraftImage').value = aircraft.image || '';
    document.getElementById('aircraftStatus').value = aircraft.is_active ? 'true' : 'false';

    openModal(true);
}

async function toggleAircraftStatus(id, currentStatus) {
    if (!confirm(`Вы уверены, что хотите ${currentStatus ? 'деактивировать' : 'активировать'} это воздушное судно?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/put/about_us/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !currentStatus })
        });

        if (response.ok) {
            showAlert(`Воздушное судно ${currentStatus ? 'деактивировано' : 'активировано'} успешно!`, 'success');
            loadFleetData();
        } else {
            const error = await response.json();
            showAlert('Не удалось обновить воздушное судно: ' + (error.error || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Ошибка обновления воздушного судна:', error);
        showAlert('Ошибка обновления воздушного судна: ' + error.message, 'error');
    }
}

async function deleteAircraft(id) {
    if (!confirm('Вы уверены, что хотите удалить это воздушное судно? Это действие необратимо.')) {
        return;
    }

    try {
        const response = await fetch(`/api/delete/about_us/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Воздушное судно успешно удалено!', 'success');
            loadFleetData();
        } else {
            const error = await response.json();
            showAlert('Не удалось удалить воздушное судно: ' + (error.error || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления воздушного судна:', error);
        showAlert('Ошибка удаления воздушного судна: ' + error.message, 'error');
    }
}

aircraftForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData);

    if (data.capacity) data.capacity = parseInt(data.capacity);
    if (data.first_flight) data.first_flight = parseInt(data.first_flight);
    if (data.display_order) data.display_order = parseInt(data.display_order);
    data.is_active = data.is_active === 'true';

    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

    try {
        let response;
        if (currentAircraftId) {
            response = await fetch(`/api/put/about_us/${currentAircraftId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch('/api/post/about_us', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (response.ok) {
            showAlert(`Воздушное судно ${currentAircraftId ? 'обновлено' : 'создано'} успешно!`, 'success');
            closeModal();
            loadFleetData();
        } else {
            const error = await response.json();
            showAlert('Не удалось сохранить воздушное судно: ' + (error.error || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Ошибка сохранения воздушного судна:', error);
        showAlert('Ошибка сохранения воздушного судна: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Сохранить';
    }
});

document.addEventListener('DOMContentLoaded', function () {
    loadFleetData();

    document.getElementById('addAircraftBtn').addEventListener('click', () => openModal(false));
    document.getElementById('refreshBtn').addEventListener('click', loadFleetData);

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });
});