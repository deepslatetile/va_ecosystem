let bookingData = {
    selectedFlight: null,
    flightDetails: null,
    passengerInfo: {},
    selectedServices: [],
    selectedSeat: null,
    selectedSeatPrice: 0,
    seatmapConfig: null,
    existingBookings: [],
    bookingId: null,
    servicePrices: {},
    boardingPassStyle: 'default',
    isEditMode: false,
    editingBookingId: null,
    editingBookingData: null
};

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month} ${hours}:${minutes}`;
}

function formatTimeFromTimestamp(timestamp) {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp * 1000);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (e) {
        return String(timestamp);
    }
}

async function getCurrentUser() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const user = await response.json();
            return user;
        }
        return -1;
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        return -1;
    }
}

function showStep(stepNumber) {
    document.querySelectorAll('.booking-step').forEach(step => {
        step.classList.remove('active');
    });
    const stepElement = document.getElementById('step' + stepNumber);
    if (stepElement) {
        stepElement.classList.add('active');
    }

    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    const stepIndicator = document.querySelector('.step[data-step="' + stepNumber + '"]');
    if (stepIndicator) {
        stepIndicator.classList.add('active');
    }

    if (stepNumber === 4) {
        loadSeatmap();
    } else if (stepNumber === 5) {
        updateConfirmationSummary();
    }
}

function nextStep(stepNumber) {
    if (stepNumber === 2 && !bookingData.selectedFlight && !bookingData.isEditMode) {
        alert('Пожалуйста, сначала выберите рейс');
        return;
    }
    if (stepNumber === 3) {
        const passengerName = document.getElementById('passengerName').value;
        const SOCIALNWKId = document.getElementById('SOCIALNWKId').value;
        const userId = document.getElementById('userId').value;

        if (!passengerName || !SOCIALNWKId || !userId) {
            alert('Пожалуйста, заполните всю обязательную информацию о пассажире');
            return;
        }

        bookingData.passengerInfo = {
            name: passengerName,
            SOCIALNWKId: SOCIALNWKId,
            userId: userId,
            specialRequests: document.getElementById('specialRequests').value
        };
        loadServices();
    }
    if (stepNumber === 4) {

    }
    if (stepNumber === 5 && !bookingData.selectedSeat) {
        alert('Пожалуйста, сначала выберите место');
        return;
    }

    showStep(stepNumber);
}

function prevStep(stepNumber) {
    showStep(stepNumber);
}


async function loadFlights() {
    const flightList = document.getElementById('flightList');
    if (!flightList) return;

    flightList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Загрузка рейсов...</p></div>';

    try {
        const response = await fetch('/api/get/schedule');

        if (!response.ok) {
            throw new Error('Не удалось загрузить рейсы');
        }

        const flights = await response.json();

        if (flights.length === 0) {
            flightList.innerHTML = '<div class="no-flights">Нет доступных рейсов</div>';
            return;
        }

        flightList.innerHTML = flights.map(flight => {
            const safeFlightNumber = flight.flight_number.replace(/'/g, "\\'");
            const isSelected = bookingData.selectedFlight === flight.flight_number;

            return `
            <div class="flight-card ${isSelected ? 'selected' : ''}" onclick="selectFlight('${safeFlightNumber}')" data-flight="${flight.flight_number}">
                <div class="flight-header">
                    <div class="flight-number">Рейс ${flight.flight_number}</div>
                    <div class="flight-status status-${flight.status.toLowerCase()}">${flight.status}</div>
                </div>
                <div class="flight-details">
                    <div class="route-info">
                        <div class="airport">${flight.display_departure || flight.departure}</div>
                        <div class="city">Вылет</div>
                    </div>
                    <div class="route-arrow">
                        <i class="fas fa-long-arrow-alt-right"></i>
                    </div>
                    <div class="route-info">
                        <div class="airport">${flight.display_arrival || flight.arrival}</div>
                        <div class="city">Прилёт</div>
                    </div>
                </div>
                <div class="time-info">
                    <div class="datetime">${formatDate(new Date(flight.datetime * 1000))}</div>
                    <div class="duration">Прилёт: ${formatTimeFromTimestamp(flight.arrival_time)}</div>
                </div>
                <div class="flight-meta">
                    <div class="meta-item">
                        <div class="meta-label">Воздушное судно</div>
                        <div class="meta-value">${flight.aircraft}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">Летят</div>
                        <div class="meta-value">${flight.flying_count || 0} пассажиров</div>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        const searchInput = document.getElementById('flightSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                const searchTerm = this.value.toLowerCase();
                const flightCards = document.querySelectorAll('.flight-card');

                flightCards.forEach(card => {
                    const text = card.textContent.toLowerCase();
                    card.style.display = text.includes(searchTerm) ? 'block' : 'none';
                });
            });
        }

    } catch (error) {
        console.error('Ошибка загрузки рейсов:', error);
        flightList.innerHTML = '<div class="error">Не удалось загрузить рейсы. Пожалуйста, попробуйте снова.</div>';
    }
}

function selectFlight(flightNumber) {
    document.querySelectorAll('.flight-card').forEach(card => {
        card.classList.remove('selected');
    });

    const selectedCard = document.querySelector('.flight-card[data-flight="' + flightNumber + '"]');
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }

    const selectFlightBtn = document.getElementById('selectFlightBtn');
    if (selectFlightBtn) {
        selectFlightBtn.disabled = false;
    }

    bookingData.selectedFlight = flightNumber;

    loadFlightDetails(flightNumber);
}

async function loadFlightDetails(flightNumber) {
    try {
        const response = await fetch('/api/get/schedule');
        if (response.ok) {
            const flights = await response.json();
            const flight = flights.find(f => f.flight_number === flightNumber);

            if (flight) {
                bookingData.flightDetails = flight;
                bookingData.boardingPassStyle = flight.boarding_pass_default || 'default';
                console.log('Данные рейса загружены:', flight);
                console.log('Стиль посадочного талона:', bookingData.boardingPassStyle);
                await loadExistingBookings(flightNumber);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки данных рейса:', error);
    }
}

async function loadExistingBookings(flightNumber) {
    try {
        const response = await fetch('/api/get/bookings_data/' + flightNumber);
        if (response.ok) {
            bookingData.existingBookings = await response.json();
            console.log('Существующие бронирования загружены:', bookingData.existingBookings);
        }
    } catch (error) {
        console.error('Ошибка загрузки существующих бронирований:', error);
    }
}

async function checkAuthStatus() {
    const user = await getCurrentUser();
    const authInfo = document.getElementById('authInfo');

    if (user && authInfo) {
        authInfo.style.display = 'block';
        bookingData.userInfo = user;
    } else {
        if (authInfo) {
            authInfo.style.display = 'none';
        }
    }
}

async function loadProfileInfo() {
    const user = await getCurrentUser();
    if (user) {
        const passengerName = document.getElementById('passengerName');
        const SOCIALNWKId = document.getElementById('SOCIALNWKId');
        const userId = document.getElementById('userId');

        console.log('Данные пользователя', user)
        console.log('Данные бронирования', bookingData)
        if (passengerName) passengerName.value = user.nickname || '';
        if (SOCIALNWKId) SOCIALNWKId.value = user.social_id || '';
        if (userId) userId.value = user.virtual_id || '';

        bookingData.userId = user.id;
        bookingData.userVirtualId = user.virtual_id;
    }
}

async function loadServices() {
    const servicesList = document.getElementById('servicesList');
    if (!servicesList) return;

    servicesList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Загрузка услуг...</p></div>';

    try {
        if (!bookingData.flightDetails || !bookingData.flightDetails.pax_service) {
            servicesList.innerHTML = '<div class="no-services">Для этого рейса нет дополнительных услуг</div>';
            return;
        }

        const servicesString = bookingData.flightDetails.pax_service;
        console.log('Строка услуг из рейса:', servicesString);

        let availableServices = [];

        if (servicesString && servicesString.trim() !== '') {
            try {
                const serviceNames = JSON.parse(servicesString);
                if (Array.isArray(serviceNames)) {
                    const servicesResponse = await fetch('/api/get/flight_configs/service');
                    if (servicesResponse.ok) {
                        const servicesData = await servicesResponse.json();
                        console.log('Все услуги из конфигурации:', servicesData);

                        availableServices = serviceNames.map(serviceName => {
                            const serviceConfig = servicesData.configs.find(config => config.name === serviceName);
                            if (serviceConfig) {
                                return {
                                    name: serviceConfig.name,
                                    price: serviceConfig.data?.price || 0,
                                    description: serviceConfig.description || ''
                                };
                            } else {
                                return {
                                    name: serviceName,
                                    price: 0,
                                    description: ''
                                };
                            }
                        });
                    } else {
                        availableServices = serviceNames.map(serviceName => ({
                            name: serviceName,
                            price: 0
                        }));
                    }
                } else {
                    const serviceNames = servicesString.split(',').map(s => s.trim()).filter(s => s !== '');
                    availableServices = serviceNames.map(serviceName => ({
                        name: serviceName,
                        price: 0
                    }));
                }
            } catch (e) {
                const serviceNames = servicesString.split(',').map(s => s.trim()).filter(s => s !== '');
                availableServices = serviceNames.map(serviceName => ({
                    name: serviceName,
                    price: 0
                }));
            }
        }

        console.log('Доступные услуги с ценами:', availableServices);

        if (availableServices.length === 0) {
            servicesList.innerHTML = '<div class="no-services">Для этого рейса нет дополнительных услуг</div>';
            return;
        }

        servicesList.innerHTML = availableServices.map(service => {
            const safeServiceName = service.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
            const isSelected = bookingData.selectedServices.some(s => s.name === service.name);

            return `
                <div class="service-item ${isSelected ? 'selected' : ''}" onclick="toggleService('${safeServiceName}', ${service.price})" data-service="${safeServiceName}">
                    <div class="service-header">
                        <div class="service-name">${service.name}</div>
                        <div class="service-price">λu ${service.price}</div>
                    </div>
                    ${service.description ? '<div class="service-description">' + service.description + '</div>' : ''}
                </div>
            `;
        }).join('');

        // Update selected services list
        updateSelectedServicesList();

    } catch (error) {
        console.error('Ошибка загрузки услуг:', error);
        servicesList.innerHTML = '<div class="error">Не удалось загрузить услуги. Пожалуйста, попробуйте снова.</div>';
    }
}

function toggleService(serviceName, servicePrice) {
    const serviceItem = document.querySelector('.service-item[data-service="' + serviceName + '"]');
    const existingServiceIndex = bookingData.selectedServices.findIndex(s => s.name === serviceName);

    if (existingServiceIndex === -1) {
        bookingData.selectedServices.push({
            name: serviceName,
            price: servicePrice
        });
        if (serviceItem) {
            serviceItem.classList.add('selected');
        }
    } else {
        bookingData.selectedServices.splice(existingServiceIndex, 1);
        if (serviceItem) {
            serviceItem.classList.remove('selected');
        }
    }

    updateSelectedServicesList();
}

function updateSelectedServicesList() {
    const selectedList = document.getElementById('selectedServicesList');
    if (!selectedList) return;

    if (bookingData.selectedServices.length === 0) {
        selectedList.innerHTML = '<p class="no-services">Услуги не выбраны</p>';
        return;
    }

    selectedList.innerHTML = bookingData.selectedServices.map(service => {
        const safeServiceName = service.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
        return `
        <div class="selected-service-item">
            <div class="service-info">
                <span class="service-name">${service.name}</span>
                <span class="service-price">λu ${service.price}</span>
            </div>
            <button class="remove-service" onclick="removeService('${safeServiceName}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        `;
    }).join('');
}

function removeService(serviceName) {
    const index = bookingData.selectedServices.findIndex(s => s.name === serviceName);
    if (index !== -1) {
        bookingData.selectedServices.splice(index, 1);

        const serviceItem = document.querySelector('.service-item[data-service="' + serviceName + '"]');
        if (serviceItem) {
            serviceItem.classList.remove('selected');
        }

        updateSelectedServicesList();
    }
}

async function loadSeatmap() {
    console.log('Загрузка схемы мест...');

    if (!bookingData.selectedFlight || !bookingData.flightDetails) {
        console.error('Рейс не выбран или отсутствуют данные рейса');
        const seatmap = document.getElementById('seatmap');
        if (seatmap) {
            seatmap.innerHTML = '<div class="error">Пожалуйста, сначала выберите рейс</div>';
        }
        return;
    }

    const seatmap = document.getElementById('seatmap');
    if (!seatmap) return;

    seatmap.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Загрузка схемы мест...</p></div>';

    try {
        const seatmapConfigName = bookingData.flightDetails.seatmap;
        console.log('Загрузка конфигурации схемы мест:', seatmapConfigName);

        if (!seatmapConfigName) {
            seatmap.innerHTML = '<div class="error">Конфигурация схемы мест недоступна для этого рейса</div>';
            return;
        }

        const configResponse = await fetch('/api/get/flight_configs/cabin_layout');
        if (!configResponse.ok) {
            throw new Error('Не удалось загрузить схемы салонов');
        }

        const configData = await configResponse.json();
        console.log('Найдены схемы салонов:', configData);

        const seatmapConfig = configData.configs.find(config => config.name === seatmapConfigName);

        if (!seatmapConfig) {
            throw new Error('Конфигурация схемы мест не найдена: ' + seatmapConfigName);
        }

        console.log('Найдена конфигурация схемы мест:', seatmapConfig);

        if (seatmapConfig.data) {
            bookingData.seatmapConfig = seatmapConfig.data;
            console.log('Распаршенная конфигурация схемы мест:', bookingData.seatmapConfig);
            renderSeatmap();
        } else {
            seatmap.innerHTML = '<div class="error">Данные конфигурации схемы мест пусты</div>';
        }

    } catch (error) {
        console.error('Ошибка загрузки схемы мест:', error);
        seatmap.innerHTML = '<div class="error">Не удалось загрузить схему мест: ' + error.message + '</div>';
    }
}

function renderSeatmap() {
    if (!bookingData.seatmapConfig) {
        console.error('Нет конфигурации схемы мест');
        const seatmap = document.getElementById('seatmap');
        if (seatmap) {
            seatmap.innerHTML = '<div class="error">Конфигурация схемы мест недоступна</div>';
        }
        return;
    }

    const seatmap = document.getElementById('seatmap');
    if (!seatmap) return;

    const config = bookingData.seatmapConfig;

    console.log('Отрисовка схемы мест с конфигурацией:', config);

    let seatmapHTML = '';

    if (!config.classes || !Array.isArray(config.classes) || config.classes.length === 0) {
        seatmap.innerHTML = '<div class="error">В конфигурации схемы мест не определены классы салона</div>';
        return;
    }

    config.classes.forEach(cabinClass => {
        seatmapHTML += '<div class="cabin-class">';

        if (!cabinClass.rows || !Array.isArray(cabinClass.rows) || cabinClass.rows.length < 2) {
            seatmapHTML += '<div class="error">Неверная конфигурация рядов</div></div>';
            return;
        }

        if (!cabinClass.seat_letters || !Array.isArray(cabinClass.seat_letters)) {
            seatmapHTML += '<div class="error">Неверная конфигурация букв мест</div></div>';
            return;
        }

        for (let row = cabinClass.rows[0]; row <= cabinClass.rows[1]; row++) {
            seatmapHTML += '<div class="seat-row">';
            seatmapHTML += '<div class="row-number">' + row + '</div>';
            seatmapHTML += '<div class="seats">';

            const aisles = cabinClass.aisles_after || [];
            const seatsPerRow = cabinClass.seat_letters.length;

            for (let i = 0; i < seatsPerRow; i++) {
                const seatLetter = cabinClass.seat_letters[i];
                const seatId = row + seatLetter;
                const seatStatus = getSeatStatus(seatId);
                const seatClass = getSeatClassType(cabinClass.name);
                const seatPrice = getSeatPrice(seatId, cabinClass);

                seatmapHTML += createSeatHTML(seatId, seatLetter, seatStatus, seatClass, seatPrice);

                if (aisles.includes(i + 1)) {
                    seatmapHTML += '<div class="aisle" title="Проход"></div>';
                }
            }

            seatmapHTML += '</div></div>';
        }

        seatmapHTML += '</div>';
    });

    seatmap.innerHTML = seatmapHTML;
    console.log('Схема мест успешно отрисована');

    // If we're in edit mode and have a selected seat, highlight it
    if (bookingData.isEditMode && bookingData.selectedSeat) {
        setTimeout(() => {
            selectSeat(bookingData.selectedSeat, bookingData.selectedSeatPrice);
        }, 100);
    }
}

function getSeatClassType(className) {
    switch (className) {
        case 'First':
            return 'first-class';
        case 'Business':
            return 'business-class';
        case 'Economy':
            return 'economy-class';
        default:
            return 'economy-class';
    }
}

function getSeatPrice(seatId, cabinClass) {
    if (cabinClass.seat_prices && cabinClass.seat_prices[seatId]) {
        return cabinClass.seat_prices[seatId];
    }
    return cabinClass.base_price || 0;
}

function getSeatStatus(seatId) {
    if (bookingData.seatmapConfig.disabled_seats &&
        bookingData.seatmapConfig.disabled_seats.includes(seatId)) {
        return 'disabled';
    }

    if (bookingData.existingBookings &&
        bookingData.existingBookings.some(booking => booking.seat === seatId)) {
        console.log('Данные бронирования', bookingData)
        // If we're editing this booking, don't mark our own seat as occupied
        if (bookingData.isEditMode && bookingData.editingBookingData &&
            bookingData.editingBookingData.seat === seatId) {
            return 'available';
        }
        return 'occupied';
    }

    return 'available';
}

function createSeatHTML(seatId, seatLetter, status, seatClass, price) {
    const priceDisplay = price > 0 ? '<div class="seat-price">λu ' + price + '</div>' : '';
    const isSelected = bookingData.isEditMode && bookingData.selectedSeat === seatId;

    return '<div class="seat ' + seatClass + ' ' + status + (isSelected ? ' selected' : '') + '" onclick="selectSeat(\'' + seatId + '\', ' + price + ')" data-seat="' + seatId + '" title="Место ' + seatId + ' - λu ' + price + '">' + seatLetter + priceDisplay + '</div>';
}

function selectSeat(seatId, price) {
    const seatElement = document.querySelector('.seat[data-seat="' + seatId + '"]');

    if (!seatElement || seatElement.classList.contains('occupied') || seatElement.classList.contains('disabled')) {
        return;
    }

    document.querySelectorAll('.seat').forEach(seat => {
        seat.classList.remove('selected');
    });

    seatElement.classList.add('selected');

    const confirmSeatBtn = document.getElementById('confirmSeatBtn');
    if (confirmSeatBtn) {
        confirmSeatBtn.disabled = false;
    }

    bookingData.selectedSeat = seatId;
    bookingData.selectedSeatPrice = price;

    updateSeatInfo(seatId, price);
}

function updateSeatInfo(seatId, price) {
    const seatDisplay = document.getElementById('selectedSeatDisplay');
    const seatDetails = document.getElementById('seatDetails');
    const priceInfo = document.getElementById('priceInfo');
    const priceAmount = document.getElementById('priceAmount');

    if (seatDisplay) seatDisplay.textContent = seatId;
    if (priceAmount) priceAmount.textContent = 'λu ' + price;
    if (priceInfo) priceInfo.style.display = 'block';

    let detailsHTML = '';
    const row = parseInt(seatId.match(/\d+/)[0]);
    const seatLetter = seatId.match(/[A-Z]/)[0];

    const cabinClass = bookingData.seatmapConfig.classes.find(cls =>
        row >= cls.rows[0] && row <= cls.rows[1]
    );

    if (cabinClass) {
        detailsHTML += '<p><strong>Класс:</strong> ' + cabinClass.name + '</p>';
    }

    if (seatDetails) {
        seatDetails.innerHTML = detailsHTML || '<p>Нет дополнительной информации</p>';
    }
}

function updateConfirmationSummary() {
    const servicesTotal = bookingData.selectedServices.reduce((total, service) => total + (service.price || 0), 0);
    const totalPrice = bookingData.selectedSeatPrice + servicesTotal;

    const flightSummary = document.getElementById('flightSummary');
    if (flightSummary && bookingData.flightDetails) {
        flightSummary.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">Рейс:</span>
                <span class="summary-value">${bookingData.flightDetails.flight_number}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Маршрут:</span>
                <span class="summary-value">${bookingData.flightDetails.display_departure || bookingData.flightDetails.departure} → ${bookingData.flightDetails.display_arrival || bookingData.flightDetails.arrival}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Вылет:</span>
                <span class="summary-value">${formatDate(new Date(bookingData.flightDetails.datetime * 1000))}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Прилёт:</span>
                <span class="summary-value">${formatTimeFromTimestamp(bookingData.flightDetails.arrival_time)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Воздушное судно:</span>
                <span class="summary-value">${bookingData.flightDetails.aircraft}</span>
            </div>
        `;
    }

    const passengerSummary = document.getElementById('passengerSummary');
    if (passengerSummary) {
        const passengerName = document.getElementById('passengerName').value;
        const SOCIALNWKId = document.getElementById('SOCIALNWKId').value;
        const userId = document.getElementById('userId').value;
        const specialRequests = document.getElementById('specialRequests').value;

        let passengerHTML = `
            <div class="summary-item">
                <span class="summary-label">Имя:</span>
                <span class="summary-value">${passengerName}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">SOCIALNWK ID:</span>
                <span class="summary-value">${SOCIALNWKId}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">VIRTUALNWK ID:</span>
                <span class="summary-value">${userId}</span>
            </div>
        `;

        if (specialRequests) {
            passengerHTML += `
                <div class="summary-item">
                    <span class="summary-label">Особые пожелания:</span>
                    <span class="summary-value">${specialRequests}</span>
                </div>
            `;
        }

        passengerSummary.innerHTML = passengerHTML;
    }

    const servicesSummary = document.getElementById('servicesSummary');
    if (servicesSummary) {
        if (bookingData.selectedServices.length > 0) {
            servicesSummary.innerHTML = bookingData.selectedServices.map(service => `
                <div class="summary-item">
                    <span class="summary-label">${service.name}:</span>
                    <span class="summary-value">λu ${service.price}</span>
                </div>
            `).join('');
        } else {
            servicesSummary.innerHTML = '<p class="no-services">Дополнительные услуги не выбраны</p>';
        }
    }

    const seatSummary = document.getElementById('seatSummary');
    if (seatSummary && bookingData.selectedSeat) {
        seatSummary.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">Место:</span>
                <span class="summary-value">${bookingData.selectedSeat}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Класс:</span>
                <span class="summary-value">${getSeatClass(bookingData.selectedSeat)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Цена места:</span>
                <span class="summary-value">λu ${bookingData.selectedSeatPrice}</span>
            </div>
        `;
    }

    const priceSummary = document.getElementById('priceSummary');
    if (priceSummary) {
        let priceHTML = `
            <div class="summary-item">
                <span class="summary-label">Цена места:</span>
                <span class="summary-value">λu ${bookingData.selectedSeatPrice}</span>
            </div>
        `;

        if (servicesTotal > 0) {
            priceHTML += `
                <div class="summary-item">
                    <span class="summary-label">Стоимость услуг:</span>
                    <span class="summary-value">λu ${servicesTotal}</span>
                </div>
            `;
        }

        priceHTML += `
            <div class="summary-item total-price">
                <span class="summary-label">Итого:</span>
                <span class="summary-value">λu ${totalPrice}</span>
            </div>
        `;

        priceSummary.innerHTML = priceHTML;
    }
}

function getSeatClass(seatId) {
    if (!bookingData.seatmapConfig || !bookingData.seatmapConfig.classes) {
        return 'Эконом';
    }

    const row = parseInt(seatId.match(/\d+/)[0]);

    if (isNaN(row)) {
        return 'Эконом';
    }

    for (const cabinClass of bookingData.seatmapConfig.classes) {
        if (cabinClass.rows && row >= cabinClass.rows[0] && row <= cabinClass.rows[1]) {
            return cabinClass.name || 'Эконом';
        }
    }

    return 'Эконом';
}

async function completeBooking() {
    const completeBtn = document.getElementById('completeBookingBtn');
    if (!completeBtn) return;

    completeBtn.disabled = true;
    completeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';

    try {
        const passengerName = document.getElementById('passengerName').value;
        const SOCIALNWKId = document.getElementById('SOCIALNWKId').value;
        const userId = document.getElementById('userId').value;
        const specialRequests = document.getElementById('specialRequests').value;

        if (!passengerName || !SOCIALNWKId || !userId) {
            throw new Error('Пожалуйста, заполните всю обязательную информацию о пассажире');
        }

        if (!bookingData.selectedSeat) {
            throw new Error('Пожалуйста, сначала выберите место');
        }

        if (bookingData.isEditMode && bookingData.editingBookingId) {
            // Update existing booking
            const updateData = {
                passenger_name: passengerName,
                seat: bookingData.selectedSeat,
                serve_class: getSeatClass(bookingData.selectedSeat),
                pax_service: bookingData.selectedServices.map(s => s.name).join(', '),
                note: specialRequests
            };

            console.log('Обновление бронирования:', bookingData.editingBookingId, updateData);

            const response = await fetch(`/api/update/booking/${bookingData.editingBookingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            const responseText = await response.text();
            console.log('Ответ обновления:', response.status, responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Не удалось распарсить JSON ответ:', e);
                throw new Error('Неверный ответ от сервера');
            }

            if (response.ok) {
                console.log('Бронирование успешно обновлено:', result);
                showSuccessStep(bookingData.editingBookingId);
            } else {
                console.error('Не удалось обновить бронирование:', result);
                throw new Error(result.error || 'Не удалось обновить бронирование');
            }
        } else {
            // Create new booking
            const user = await getCurrentUser();
            let user_id;
            if (!user) {
                user_id = -1
            } else {
                user_id = user.id
            }

            const bookingDataToSend = {
                flight_number: bookingData.selectedFlight,
                seat: bookingData.selectedSeat,
                serve_class: getSeatClass(bookingData.selectedSeat),
                pax_service: bookingData.selectedServices.map(s => s.name).join(', '),
                user_id: user_id,
                boarding_pass: bookingData.boardingPassStyle,
                note: specialRequests,
                passenger_name: passengerName,
                social_id: SOCIALNWKId,
                virtual_id: userId
            };

            console.log('Отправка данных бронирования:', bookingDataToSend);

            const response = await fetch('/api/post/booking/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingDataToSend)
            });

            console.log('Статус ответа:', response.status);

            const responseText = await response.text();
            console.log('Текст ответа:', responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Не удалось распарсить JSON ответ:', e);
                throw new Error('Неверный ответ от сервера');
            }

            if (response.ok) {
                console.log('Бронирование успешно:', result);
                bookingData.bookingId = result.booking_id;

                showSuccessStep(result.booking_id);
            } else {
                console.error('Не удалось создать бронирование:', result);
                throw new Error(result.error || 'Не удалось создать бронирование');
            }
        }

    } catch (error) {
        console.error('Ошибка бронирования:', error);
        alert('Ошибка бронирования: ' + error.message);

        completeBtn.disabled = false;
        completeBtn.innerHTML = '<i class="fas fa-check"></i> ' +
            (bookingData.isEditMode ? 'Обновить бронирование' : 'Завершить бронирование');
    }
}

function showSuccessStep(bookingId) {
    const bookingIdDisplay = document.getElementById('bookingIdDisplay');
    if (bookingIdDisplay) {
        bookingIdDisplay.textContent = bookingId;
    }

    // Update button text based on mode
    const completeBtn = document.getElementById('completeBookingBtn');
    if (completeBtn) {
        completeBtn.innerHTML = '<i class="fas fa-check"></i> ' +
            (bookingData.isEditMode ? 'Обновить бронирование' : 'Завершить бронирование');
        completeBtn.disabled = false;
    }

    showStep(6);
    generatePreview();
}

function showBoardingPassStep(bookingId) {
    showSuccessStep(bookingId);
}

async function generatePreview() {
    if (!bookingData.bookingId && !bookingData.editingBookingId) {
        alert('ID бронирования недоступен');
        return;
    }

    const preview = document.getElementById('boardingPassPreview');
    if (!preview) return;

    preview.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Генерация предпросмотра...</p></div>';

    try {
        const bookingId = bookingData.bookingId || bookingData.editingBookingId;
        const response = await fetch('/api/get/boarding_pass/' + bookingId + '/' + bookingData.boardingPassStyle);

        if (response.ok) {
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);

            preview.innerHTML = '<div style="text-align: center;"><img src="' + imageUrl + '" alt="Предпросмотр посадочного талона" style="max-width: 100%; max-height: 350px;" /></div>';
        } else {
            const errorText = await response.text();
            console.error('Ошибка предпросмотра:', errorText);
            preview.innerHTML = '<div class="error">Не удалось создать предпросмотр: ' + response.status + '</div>';
        }
    } catch (error) {
        console.error('Ошибка генерации предпросмотра:', error);
        preview.innerHTML = '<div class="error">Не удалось создать предпросмотр: ' + error.message + '</div>';
    }
}

async function downloadBoardingPass(format) {
    if (!bookingData.bookingId && !bookingData.editingBookingId) {
        alert('ID бронирования недоступен');
        return;
    }

    try {
        let url, filename;
        const bookingId = bookingData.bookingId || bookingData.editingBookingId;

        if (format === 'png') {
            url = '/api/get/boarding_pass/' + bookingId + '/' + bookingData.boardingPassStyle;
            filename = 'boarding-pass-' + bookingId + '.png';
        } else if (format === 'pdf') {
            url = '/api/get/boarding_pass_pdf/' + bookingId + '/' + bookingData.boardingPassStyle;
            filename = 'boarding-pass-' + bookingId + '.pdf';
        } else {
            throw new Error('Неверный формат');
        }

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Ошибка скачивания посадочного талона:', error);
        alert('Не удалось скачать посадочный талон');
    }
}

function goToHome() {
    window.location.href = '/';
}

function viewMyBookings() {
    window.location.href = '/my-bookings';
}

async function loadBookingForEdit(bookingId) {
    try {
        const response = await fetch(`/api/get/booking/${bookingId}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить данные бронирования');
        }

        const booking = await response.json();
        bookingData.editingBookingId = bookingId;
        bookingData.editingBookingData = booking;
        bookingData.isEditMode = true;

        // Load flight details
        bookingData.selectedFlight = booking.flight_number;
        await loadFlightDetails(booking.flight_number);

        // Wait a bit for flight details to load, then load seatmap
        setTimeout(() => {
            loadSeatmap();
        }, 500);

        // Fill passenger information
        const passengerNameField = document.getElementById('passengerName');
        const SOCIALNWKIdField = document.getElementById('SOCIALNWKId');
        const userIdField = document.getElementById('userId');
        const specialRequestsField = document.getElementById('specialRequests');

        if (passengerNameField) passengerNameField.value = booking.passenger_name || '';
        if (specialRequestsField) specialRequestsField.value = booking.note || '';

        // Try to get user info from the booking using the existing API endpoint
        if (booking.user_id && booking.user_id !== '-1') {
            try {
                const userResponse = await fetch(`/api/get/user/${booking.user_id}`);
                if (userResponse.ok) {
                    const user = await userResponse.json();
                    console.log('Пользователь', user)
                    if (SOCIALNWKIdField) SOCIALNWKIdField.value = user.social_id || '';
                    if (userIdField) userIdField.value = user.virtual_id || '';
                    if (passengerNameField) passengerNameField.value = user.nickname || '';
                }
            } catch (userError) {
                console.error('Ошибка загрузки информации о пользователе:', userError);
                // If we can't load user info, we can still proceed with empty fields
            }
        }

        // Parse and select services
        if (booking.pax_service) {
            const services = booking.pax_service.split(',').map(s => s.trim()).filter(s => s !== '');
            bookingData.selectedServices = services.map(serviceName => ({
                name: serviceName,
                price: 0 // We'll update prices when services load
            }));
        }

        // Set selected seat
        bookingData.selectedSeat = booking.seat;
        bookingData.selectedSeatPrice = 0; // Will be updated from seatmap

        // Update step indicators to show we're editing
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index === 0) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        // Auto-advance to passenger info step since flight is already selected
        showStep(2);

        // Update button text
        const selectFlightBtn = document.getElementById('selectFlightBtn');
        if (selectFlightBtn) {
            selectFlightBtn.disabled = false;
            selectFlightBtn.textContent = 'Рейс выбран';
        }

        const completeBtn = document.getElementById('completeBookingBtn');
        if (completeBtn) {
            completeBtn.innerHTML = '<i class="fas fa-save"></i> Обновить бронирование';
        }

        console.log('Бронирование загружено для редактирования:', booking);

    } catch (error) {
        console.error('Ошибка загрузки бронирования для редактирования:', error);
        alert('Не удалось загрузить бронирование для редактирования. Пожалуйста, попробуйте снова.');
    }
}

function updateStepIndicators() {
    // Update step indicators based on edit mode
    if (bookingData.isEditMode) {
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = parseInt(step.querySelector('.step-number').textContent);
            if (stepNumber <= 2) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Check for booking_id parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('booking_id');

    if (bookingId) {
        // We're in edit mode
        loadBookingForEdit(bookingId);
    } else {
        // Normal booking flow
        loadFlights();
        checkAuthStatus();
    }

    // Update step indicators after DOM is loaded
    updateStepIndicators();

    document.querySelectorAll('.step').forEach(step => {
        step.addEventListener('click', function () {
            const stepNumber = parseInt(this.getAttribute('data-step'));
            const currentStep = getCurrentStep();

            if (stepNumber <= currentStep + 1) {
                showStep(stepNumber);

                if (stepNumber === 3 && bookingData.selectedFlight) {
                    loadServices();
                } else if (stepNumber === 4 && bookingData.selectedFlight) {
                    loadSeatmap();
                } else if (stepNumber === 5) {
                    updateConfirmationSummary();
                }
            }
        });
    });
});

function getCurrentStep() {
    const activeStep = document.querySelector('.booking-step.active');
    if (activeStep) {
        return parseInt(activeStep.id.replace('step', ''));
    }
    return 1;
}