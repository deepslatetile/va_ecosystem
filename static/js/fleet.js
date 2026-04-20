let aircraftList = [];

async function loadFleetData() {
    try {
        const container = document.getElementById('fleetContainer');
        container.innerHTML = `
            <div class="loading-container">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Загрузка информации о флоте...</p>
            </div>
        `;

        const response = await fetch('/api/get/about_us?group=fleet&active=true');
        if (!response.ok) {
            throw new Error('Не удалось загрузить данные о флоте');
        }

        aircraftList = await response.json();
        renderFleet();

    } catch (error) {
        console.error('Ошибка загрузки флота:', error);
        const container = document.getElementById('fleetContainer');
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Не удалось загрузить информацию о флоте. Пожалуйста, попробуйте позже.</p>
            </div>
        `;
    }
}

function renderFleet() {
    const container = document.getElementById('fleetContainer');

    if (aircraftList.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-plane-slash"></i>
                <p>Воздушные суда не найдены.</p>
            </div>
        `;
        return;
    }

    const typeFilter = document.getElementById('typeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    let filteredAircraft = aircraftList;

    if (typeFilter !== 'all') {
        filteredAircraft = filteredAircraft.filter(aircraft =>
            aircraft.fleet_type === typeFilter
        );
    }

    if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
            filteredAircraft = filteredAircraft.filter(aircraft => aircraft.is_active);
        } else if (statusFilter === 'maintenance') {
            filteredAircraft = filteredAircraft.filter(aircraft => !aircraft.is_active);
        }
    }

    if (filteredAircraft.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>Воздушные суда, соответствующие вашим фильтрам, не найдены.</p>
                <button onclick="resetFilters()" class="btn-secondary" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Сбросить фильтры
                </button>
            </div>
        `;
        return;
    }

    filteredAircraft.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    container.innerHTML = filteredAircraft.map(aircraft => `
        <div class="fleet-card">
            <div class="fleet-image">
                ${aircraft.image ?
            `<img src="${aircraft.image}" alt="${aircraft.name}" loading="lazy">` :
            `<div class="placeholder"><i class="fas fa-plane"></i></div>`
        }
            </div>
            <div class="fleet-content">
                <h3 class="fleet-title">${aircraft.name}</h3>
                <div class="fleet-registration">
                    <i class="fas fa-hashtag"></i>
                    <span>${aircraft.registration_number || 'Н/Д'}</span>
                </div>
                <div class="fleet-details">
                    <div class="detail-item">
                        <span class="label">Тип:</span>
                        <span>${getAircraftTypeLabel(aircraft.fleet_type)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Вместимость:</span>
                        <span>${aircraft.capacity ? aircraft.capacity + ' пассажиров' : 'Н/Д'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Первый полёт:</span>
                        <span>${aircraft.first_flight || 'Н/Д'}</span>
                    </div>
                </div>
                ${aircraft.description ? `
                    <div class="fleet-description">
                        ${aircraft.description}
                    </div>
                ` : ''}
                <div class="fleet-status ${aircraft.is_active ? 'status-active' : 'status-maintenance'}">
                    ${aircraft.is_active ? 'В эксплуатации' : 'На обслуживании'}
                </div>
            </div>
        </div>
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

function resetFilters() {
    document.getElementById('typeFilter').value = 'all';
    document.getElementById('statusFilter').value = 'all';
    renderFleet();
}

document.addEventListener('DOMContentLoaded', function () {
    loadFleetData();
    document.getElementById('typeFilter').addEventListener('change', renderFleet);
    document.getElementById('statusFilter').addEventListener('change', renderFleet);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
});