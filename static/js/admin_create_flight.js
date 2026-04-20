let seatmaps = [];
let boardingStyles = [];
let availableServices = [];

async function loadConfigurations() {
    try {
        const seatmapsResponse = await fetch('/api/get/flight_configs/cabin_layout');
        if (seatmapsResponse.ok) {
            const seatmapsData = await seatmapsResponse.json();
            seatmaps = seatmapsData.configs || [];
            populateSeatmaps();
        }

        const boardingResponse = await fetch('/api/get/flight_configs/boarding_style');
        if (boardingResponse.ok) {
            const boardingData = await boardingResponse.json();
            boardingStyles = boardingData.configs || [];
            populateBoardingStyles();
        } else {
            console.error('Не удалось загрузить стили посадки:', boardingResponse.status);
            document.getElementById('boarding_pass_default').innerHTML = '<option value="">Ошибка загрузки стилей посадки</option>';
        }

        const servicesResponse = await fetch('/api/get/flight_configs/service');
        if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            availableServices = servicesData.configs || [];
            populateServices();
        }

    } catch (error) {
        console.error('Ошибка загрузки конфигураций:', error);
        showAlert('Ошибка загрузки данных конфигурации', 'error');
    }
}

function populateSeatmaps() {
    const select = document.getElementById('seatmap');
    select.innerHTML = '<option value="">Выберите или введите свой вариант...</option>';

    if (seatmaps.length === 0) {
        select.innerHTML += '<option value="custom">Введите свою схему мест...</option>';
        return;
    }

    seatmaps.forEach(seatmap => {
        const option = document.createElement('option');
        option.value = seatmap.name;
        const seats = seatmap.data?.seats || 'N/A';
        const layout = seatmap.data?.layout || 'N/A';
        option.textContent = `${seatmap.name} (${seats} мест, ${layout})`;
        select.appendChild(option);
    });

    select.innerHTML += '<option value="custom">Введите свою схему мест...</option>';
}

function populateBoardingStyles() {
    const select = document.getElementById('boarding_pass_default');
    select.innerHTML = '<option value="">Выберите стиль посадочного талона...</option>';

    if (boardingStyles.length === 0) {
        select.innerHTML = '<option value="">Нет доступных стилей посадки</option>';
        return;
    }

    boardingStyles.forEach(style => {
        const option = document.createElement('option');
        option.value = style.name;

        if (style.type === 'boarding_style') {
            const drawFunc = style.data?.draw_function || 'default';
            option.textContent = `${style.name} (${drawFunc})`;
        }
        else {
            option.textContent = style.name;
        }

        select.appendChild(option);
    });
}

function populateServices() {
    const container = document.getElementById('servicesCheckboxes');
    container.innerHTML = '';

    if (availableServices.length === 0) {
        container.innerHTML = '<div class="loading-text">Нет доступных услуг. Создайте первую услугу!</div>';
        return;
    }

    availableServices.forEach(service => {
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item';

        const price = service.data?.price || 0;
        const category = service.data?.category || 'general';

        checkboxItem.innerHTML = `
            <input type="checkbox" id="service_${service.id}" name="services" value="${service.name}" data-price="${price}">
            <label for="service_${service.id}">
                ${service.name}
                <br><small style="color: #8fa3d8;">${service.description || ''}</small>
            </label>
            <span class="service-price">$${price.toFixed(2)}</span>
        `;

        container.appendChild(checkboxItem);
    });
}

function setupComboInputs() {
    document.getElementById('status').addEventListener('change', function () {
        const customInput = document.getElementById('status_custom');
        if (this.value === 'custom') {
            customInput.style.display = 'block';
            customInput.required = true;
        } else {
            customInput.style.display = 'none';
            customInput.required = false;
        }
    });

    document.getElementById('meal').addEventListener('change', function () {
        const customInput = document.getElementById('meal_custom');
        if (this.value === 'custom') {
            customInput.style.display = 'block';
        } else {
            customInput.style.display = 'none';
        }
    });

    document.getElementById('seatmap').addEventListener('change', function () {
        const customInput = document.getElementById('seatmap_custom');
        if (this.value === 'custom') {
            customInput.style.display = 'block';
            customInput.required = true;
        } else {
            customInput.style.display = 'none';
            customInput.required = false;
        }
    });

    document.getElementById('boarding_pass_default').addEventListener('change', function () {
        const customInput = document.getElementById('boarding_pass_custom');
        if (this.value === 'custom') {
            customInput.style.display = 'block';
            customInput.required = true;
        } else {
            customInput.style.display = 'none';
            customInput.required = false;
        }
    });
}

function getComboValue(selectId, customInputId) {
    const select = document.getElementById(selectId);

    if (selectId === 'boarding_pass_default') {
        return select.value;
    }

    const customInput = document.getElementById(customInputId);
    if (select.value === 'custom' && customInput.value.trim()) {
        return customInput.value.trim();
    }
    return select.value;
}

document.getElementById('previewBtn').addEventListener('click', function () {
    const formData = new FormData(document.getElementById('createFlightForm'));
    const previewSection = document.getElementById('previewSection');
    const previewContent = document.getElementById('flightPreview');

    const status = getComboValue('status', 'status_custom');
    const meal = getComboValue('meal', 'meal_custom');
    const seatmap = getComboValue('seatmap', 'seatmap_custom');
    const boardingPass = getComboValue('boarding_pass_default', 'boarding_pass_custom');
    const routeType = document.getElementById('route_type').value;

    if (!formData.get('flight_number') || !formData.get('aircraft')) {
        showAlert('Пожалуйста, заполните номер рейса и тип воздушного судна', 'error');
        return;
    }

    const selectedServices = Array.from(document.querySelectorAll('input[name="services"]:checked'))
        .map(checkbox => {
            const price = checkbox.getAttribute('data-price');
            return `${checkbox.value} ($${price})`;
        });

    // Определяем отображение маршрута
    let departureDisplay = formData.get('departure') || 'N/A';
    let arrivalDisplay = formData.get('arrival') || 'N/A';

    if (routeType === 'ptfs') {
        const ptfsDeparture = formData.get('ptfs_departure');
        const ptfsArrival = formData.get('ptfs_arrival');

        if (ptfsDeparture) departureDisplay = `${departureDisplay} (${ptfsDeparture})`;
        if (ptfsArrival) arrivalDisplay = `${arrivalDisplay} (${ptfsArrival})`;
    }

    // Форматируем время
    const departureDateTime = new Date(formData.get('datetime'));
    const departureTimeFormatted = departureDateTime.toLocaleString();

    const arrivalDateTime = new Date(formData.get('arrival_time'));
    const arrivalTimeFormatted = arrivalDateTime.toLocaleString();

    let previewHTML = `
        <div class="preview-item">
            <span class="preview-label">Номер рейса:</span>
            <span class="preview-value">${formData.get('flight_number') || 'N/A'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Воздушное судно:</span>
            <span class="preview-value">${formData.get('aircraft') || 'N/A'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Маршрут (${routeType}):</span>
            <span class="preview-value">${departureDisplay} → ${arrivalDisplay}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Время вылета:</span>
            <span class="preview-value">${departureTimeFormatted || 'N/A'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Время прилёта:</span>
            <span class="preview-value">${arrivalTimeFormatted || 'N/A'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Статус:</span>
            <span class="preview-value">${status || 'N/A'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Тип маршрута:</span>
            <span class="preview-value">${routeType === 'ptfs' ? 'PTFS (с кодами)' : 'Реальный (только названия аэропортов)'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Код вылета PTFS:</span>
            <span class="preview-value">${formData.get('ptfs_departure') || 'N/A'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Код прилёта PTFS:</span>
            <span class="preview-value">${formData.get('ptfs_arrival') || 'N/A'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Питание на борту:</span>
            <span class="preview-value">${meal || 'N/A'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Схема мест:</span>
            <span class="preview-value">${seatmap || 'N/A'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Стиль посадочного талона:</span>
            <span class="preview-value">${boardingPass || 'N/A'}</span>
        </div>
    `;

    if (selectedServices.length > 0) {
        previewHTML += `
            <div class="preview-item">
                <span class="preview-label">Услуги:</span>
                <span class="preview-value">${selectedServices.join(', ')}</span>
            </div>
        `;
    }

    previewHTML += `
        <div class="preview-item">
            <span class="preview-label">Быстрые действия:</span>
            <span class="preview-value">
                <button type="button" class="btn-small" onclick="createSOCIALNWKWebhook()" style="margin-top: 5px;">
                    <i class="fab fa-SOCIALNWK"></i> Создать уведомление SOCIALNWK
                </button>
            </span>
        </div>
    `;

    previewContent.innerHTML = previewHTML;
    previewSection.style.display = 'block';

    previewSection.scrollIntoView({ behavior: 'smooth' });
});

function formatDateTime(datetimeString) {
    if (!datetimeString) return 'N/A';
    try {
        const date = new Date(datetimeString);
        return date.toLocaleString();
    } catch (e) {
        return datetimeString;
    }
}

document.getElementById('createFlightForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);

    const status = getComboValue('status', 'status_custom');
    const meal = getComboValue('meal', 'meal_custom');
    const seatmap = getComboValue('seatmap', 'seatmap_custom');
    const boardingPass = getComboValue('boarding_pass_default', 'boarding_pass_custom');
    const routeType = document.getElementById('route_type').value;

    const departureDateTime = new Date(formData.get('datetime'));
    const datetime = Math.floor(departureDateTime.getTime() / 1000);

    const arrivalDateTime = new Date(formData.get('arrival_time'));
    const arrival_time = Math.floor(arrivalDateTime.getTime() / 1000);

    const flightData = {
        flight_number: formData.get('flight_number'),
        departure: formData.get('departure'),
        arrival: formData.get('arrival'),
        datetime: datetime,
        arrival_time: arrival_time,
        status: status,
        seatmap: seatmap,
        aircraft: formData.get('aircraft'),
        meal: meal,
        pax_service: JSON.stringify(Array.from(document.querySelectorAll('input[name="services"]:checked'))
            .map(checkbox => checkbox.value)),
        boarding_pass_default: boardingPass,
        ptfs_departure: formData.get('ptfs_departure'),
        ptfs_arrival: formData.get('ptfs_arrival'),
        route_type: routeType
    };

    const requiredFields = [
        'flight_number', 'departure', 'arrival', 'datetime',
        'arrival_time', 'status', 'seatmap', 'aircraft', 'boarding_pass_default', 'route_type'
    ];

    const missingFields = requiredFields.filter(field => {
        if (field === 'datetime') return !formData.get('datetime');
        if (field === 'arrival_time') return !formData.get('arrival_time');
        return !flightData[field];
    });

    if (missingFields.length > 0) {
        showAlert(`Пожалуйста, заполните все обязательные поля: ${missingFields.join(', ')}`, 'error');
        return;
    }

    if (departureDateTime <= new Date()) {
        showAlert('Время вылета должно быть в будущем', 'error');
        return;
    }

    // Проверка времени прибытия
    if (arrival_time <= datetime) {
        showAlert('Время прибытия должно быть позже времени вылета', 'error');
        return;
    }

    const createBtn = document.getElementById('createBtn');
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание...';

    try {
        const response = await fetch('/api/post/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(flightData)
        });

        if (response.ok) {
            showAlert('Рейс успешно создан!', 'success');
            document.getElementById('createFlightForm').reset();
            document.getElementById('previewSection').style.display = 'none';

            const now = new Date();
            const departureTime = new Date(now.getTime() + 60 * 60 * 1000);
            const arrivalTime = new Date(now.getTime() + 90 * 60 * 1000);

            document.getElementById('datetime').value = departureTime.toISOString().slice(0, 16);
            document.getElementById('arrival_time').value = arrivalTime.toISOString().slice(0, 16);
            document.getElementById('status').value = 'Scheduled';
            document.getElementById('meal').value = 'Standard Meal Service';
            document.getElementById('route_type').value = 'ptfs';

            document.getElementById('status_custom').style.display = 'none';
            document.getElementById('meal_custom').style.display = 'none';
            document.getElementById('seatmap_custom').style.display = 'none';
            document.getElementById('boarding_pass_custom').style.display = 'none';

        } else {
            const error = await response.json();
            showAlert('Не удалось создать рейс: ' + (error.error || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Ошибка создания рейса:', error);
        showAlert('Ошибка создания рейса: ' + error.message, 'error');
    } finally {
        createBtn.disabled = false;
        createBtn.innerHTML = '<i class="fas fa-plus"></i> Создать рейс';
    }
});

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

function createSOCIALNWKWebhook() {
    const formData = new FormData(document.getElementById('createFlightForm'));

    const routeType = document.getElementById('route_type').value;
    const flightData = {
        flight_number: formData.get('flight_number'),
        departure: formData.get('departure'),
        arrival: formData.get('arrival'),
        datetime: formData.get('datetime'),
        arrival_time: formData.get('arrival_time'),
        status: getComboValue('status', 'status_custom'),
        seatmap: getComboValue('seatmap', 'seatmap_custom'),
        aircraft: formData.get('aircraft'),
        meal: getComboValue('meal', 'meal_custom'),
        boarding_pass: getComboValue('boarding_pass_default', 'boarding_pass_custom'),
        ptfs_departure: formData.get('ptfs_departure'),
        ptfs_arrival: formData.get('ptfs_arrival'),
        route_type: routeType,
        timestamp: Date.now()
    };

    const selectedServices = Array.from(document.querySelectorAll('input[name="services"]:checked'))
        .map(checkbox => checkbox.value);

    if (selectedServices.length > 0) {
        flightData.services = selectedServices;
    }

    if (!flightData.flight_number || !flightData.departure || !flightData.arrival) {
        showAlert('Пожалуйста, заполните номер рейса, аэропорт вылета и прилёта перед созданием webhook', 'error');
        return;
    }

    const encodedData = encodeURIComponent(JSON.stringify(flightData));

    window.open(`/admin/webhooks?flight_data=${encodedData}`, '_blank');
}

function setupServiceCreation() {
    // Обработчик создания сервиса
    const createServiceModal = document.getElementById('createServiceModal');
    const closeBtn = createServiceModal.querySelector('.close');
    const cancelBtn = document.getElementById('cancelServiceBtn');

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            createServiceModal.style.display = 'none';
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            createServiceModal.style.display = 'none';
        });
    }

    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(event) {
        if (event.target === createServiceModal) {
            createServiceModal.style.display = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    console.log("Страница создания рейса загружена, инициализация...");

    loadConfigurations();
    setupComboInputs();
    setupServiceCreation();

    const now = new Date();
    const departureTime = new Date(now.getTime() + 60 * 60 * 1000);
    const arrivalTime = new Date(now.getTime() + 90 * 60 * 1000);

    document.getElementById('datetime').value = departureTime.toISOString().slice(0, 16);
    document.getElementById('arrival_time').value = arrivalTime.toISOString().slice(0, 16);
    document.getElementById('status').value = 'Scheduled';
    document.getElementById('meal').value = 'Standard Meal Service';
    document.getElementById('route_type').value = 'ptfs';

    console.log("Страница создания рейса успешно инициализирована");

    const formActions = document.querySelector('.form-actions');
    const webhookBtn = document.createElement('button');
    webhookBtn.type = 'button';
    webhookBtn.id = 'webhookBtn';
    webhookBtn.className = 'btn-secondary';
    webhookBtn.innerHTML = '<i class="fab fa-SOCIALNWK"></i> SOCIALNWK Webhook';
    webhookBtn.style.marginLeft = '10px';
    webhookBtn.addEventListener('click', createSOCIALNWKWebhook);

    const previewBtn = document.getElementById('previewBtn');
    previewBtn.parentNode.insertBefore(webhookBtn, previewBtn.nextSibling);
});