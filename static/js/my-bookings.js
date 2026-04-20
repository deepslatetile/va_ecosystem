let allBookings = [];
let currentFilter = 'all';
let currentBookingId = null;
let isEditMode = false;

async function loadBookings() {
    try {
        showLoading();
        
        const response = await fetch('/api/get/user-bookings');
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Не удалось загрузить бронирования');
        }

        allBookings = await response.json();
        renderBookings();

    } catch (error) {
        console.error('Ошибка загрузки бронирований:', error);
        showAlert('error', 'Не удалось загрузить бронирования. Пожалуйста, попробуйте снова.');
        document.getElementById('bookingsList').innerHTML = `
            <div class="no-bookings">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка загрузки бронирований</h3>
                <p>${error.message}</p>
                <button class="btn-small btn-small-primary" onclick="loadBookings()">
                    <i class="fas fa-redo"></i> Попробовать снова
                </button>
            </div>
        `;
    }
}

function renderBookings() {
    const bookingsList = document.getElementById('bookingsList');

    if (!allBookings || allBookings.length === 0) {
        bookingsList.innerHTML = `
            <div class="no-bookings">
                <i class="fas fa-plane-slash"></i>
                <h3>Бронирования не найдены</h3>
                <p>У вас пока нет бронирований.</p>
                <a href="/book" class="btn-small btn-small-primary">
                    <i class="fas fa-plus"></i> Сделать первое бронирование
                </a>
            </div>
        `;
        return;
    }

    const filteredBookings = filterBookings(allBookings, currentFilter);
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';

    const searchedBookings = searchTerm
        ? filteredBookings.filter(booking =>
            (booking.flight_number && booking.flight_number.toLowerCase().includes(searchTerm)) ||
            (booking.passenger_name && booking.passenger_name.toLowerCase().includes(searchTerm)) ||
            (booking.seat && booking.seat.toLowerCase().includes(searchTerm)) ||
            (booking.flight_departure && booking.flight_departure.toLowerCase().includes(searchTerm)) ||
            (booking.flight_arrival && booking.flight_arrival.toLowerCase().includes(searchTerm)) ||
            (booking.id && booking.id.toLowerCase().includes(searchTerm))
          )
        : filteredBookings;

    if (searchedBookings.length === 0) {
        bookingsList.innerHTML = `
            <div class="no-bookings">
                <i class="fas fa-search"></i>
                <h3>Бронирования не найдены</h3>
                <p>Попробуйте изменить поиск или фильтры.</p>
            </div>
        `;
        return;
    }

    bookingsList.innerHTML = searchedBookings.map(booking => `
        <div class="booking-card" onclick="showBookingDetails('${booking.id}')">
            <div class="booking-header">
                <div class="booking-id">#${booking.id}</div>
                <div class="booking-status ${getStatusClass(booking)}">
                    ${getStatusText(booking)}
                </div>
            </div>

            <div class="booking-flight">
                <div class="flight-route">
                    <div class="flight-airport">
                        <div class="airport-code">${getAirportCode(booking.flight_departure)}</div>
                        <div class="airport-name">${getAirportName(booking.flight_departure)}</div>
                    </div>
                    <div class="flight-arrow">
                        <i class="fas fa-long-arrow-alt-right"></i>
                    </div>
                    <div class="flight-airport">
                        <div class="airport-code">${getAirportCode(booking.flight_arrival)}</div>
                        <div class="airport-name">${getAirportName(booking.flight_arrival)}</div>
                    </div>
                </div>

                <div class="flight-details">
                    <div class="detail-item">
                        <div class="detail-label">Рейс</div>
                        <div class="detail-value">${booking.flight_number}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Дата</div>
                        <div class="detail-value">${formatDate(booking.flight_datetime)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Место</div>
                        <div class="detail-value">${booking.seat}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Класс</div>
                        <div class="detail-value">${booking.serve_class}</div>
                    </div>
                </div>
            </div>

            <div class="booking-actions">
                ${booking.can_modify ? `
                <button class="btn-small btn-small-primary" onclick="event.stopPropagation(); editBooking('${booking.id}')">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
                ` : ''}
                <button class="btn-small btn-small-secondary" onclick="event.stopPropagation(); viewBoardingPass('${booking.id}')">
                    <i class="fas fa-ticket-alt"></i> Талон
                </button>
                ${booking.can_modify ? `
                <button class="btn-small btn-small-danger" onclick="event.stopPropagation(); cancelBooking('${booking.id}')">
                    <i class="fas fa-times"></i> Отменить
                </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function filterBookings(bookings, filter) {
    const now = Math.floor(Date.now() / 1000);

    switch(filter) {
        case 'active':
            return bookings.filter(b => b.valid === 1 && b.flight_datetime > now);
        case 'past':
            return bookings.filter(b => b.valid === 1 && b.flight_datetime <= now);
        case 'cancelled':
            return bookings.filter(b => b.valid === 0);
        default:
            return bookings;
    }
}

function getStatusClass(booking) {
    if (booking.valid === 0) return 'status-cancelled';

    const now = Math.floor(Date.now() / 1000);
    if (booking.flight_datetime <= now) return 'status-past';

    return 'status-active';
}

function getStatusText(booking) {
    if (booking.valid === 0) return 'Отменено';

    const now = Math.floor(Date.now() / 1000);
    if (booking.flight_datetime <= now) return 'Завершено';

    return 'Активно';
}

function getAirportCode(airportString) {
    if (!airportString) return '???';
    const parts = airportString.split(' ');
    return parts[parts.length - 1] || airportString;
}

function getAirportName(airportString) {
    if (!airportString) return 'Неизвестно';
    const parts = airportString.split(' ');
    return parts.slice(0, -1).join(' ') || airportString;
}

function formatDate(timestamp) {
    if (!timestamp) return 'Неизвестно';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading() {
    document.getElementById('bookingsList').innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Загрузка ваших бронирований...</p>
        </div>
    `;
}

function showAlert(type, message) {
    const alertsDiv = document.getElementById('bookingsAlerts');
    const alertClass = type === 'error' ? 'alert-error' :
                      type === 'success' ? 'alert-success' : 'alert-info';

    const alert = document.createElement('div');
    alert.className = `alert ${alertClass}`;
    alert.innerHTML = message;

    alertsDiv.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 500);
    }, 5000);
}

async function showBookingDetails(bookingId) {
    try {
        currentBookingId = bookingId;

        const booking = allBookings.find(b => b.id === bookingId);
        if (!booking) {
            throw new Error('Бронирование не найдено');
        }

        await loadBookingModal(booking);

    } catch (error) {
        console.error('Ошибка загрузки данных бронирования:', error);
        showAlert('error', 'Не удалось загрузить данные бронирования.');
    }
}

async function loadBookingModal(booking) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const cancelBtn = document.getElementById('cancelBookingBtn');
    const viewPassBtn = document.getElementById('viewBoardingPassBtn');

    modalTitle.textContent = `Бронирование #${booking.id}`;

    modalBody.innerHTML = createViewDetails(booking);
    cancelBtn.style.display = booking.can_modify ? 'block' : 'none';
    viewPassBtn.style.display = 'block';

    cancelBtn.onclick = () => cancelBooking(booking.id);
    viewPassBtn.onclick = () => viewBoardingPass(booking.id);

    document.getElementById('bookingModal').style.display = 'block';
}

function createViewDetails(booking) {
    return `
        <div class="booking-details">
            <div class="detail-section">
                <h3>Информация о рейсе</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Номер рейса:</label>
                        <span>${booking.flight_number}</span>
                    </div>
                    <div class="detail-item">
                        <label>Маршрут:</label>
                        <span>${booking.flight_departure || 'Н/Д'} → ${booking.flight_arrival || 'Н/Д'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Дата и время:</label>
                        <span>${formatDate(booking.flight_datetime)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Статус:</label>
                        <span class="status-badge ${getStatusClass(booking)}">${getStatusText(booking)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Воздушное судно:</label>
                        <span>${booking.aircraft || 'Н/Д'}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Информация о пассажире</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Имя пассажира:</label>
                        <span>${booking.passenger_name || 'Н/Д'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Место:</label>
                        <span>${booking.seat}</span>
                    </div>
                    <div class="detail-item">
                        <label>Класс:</label>
                        <span>${booking.serve_class}</span>
                    </div>
                </div>
            </div>

            ${booking.pax_service ? `
            <div class="detail-section">
                <h3>Дополнительные услуги</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Услуги:</label>
                        <span>${booking.pax_service}</span>
                    </div>
                </div>
            </div>
            ` : ''}

            ${booking.note ? `
            <div class="detail-section">
                <h3>Примечания</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span>${booking.note}</span>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    currentBookingId = null;
    isEditMode = false;
}

function editBooking(bookingId) {
    // Redirect to book page with booking_id parameter
    window.location.href = `/book?booking_id=${bookingId}`;
}

async function cancelBooking(bookingId) {
    if (!confirm('Вы уверены, что хотите отменить это бронирование? Это действие необратимо.')) {
        return;
    }

    try {
        const response = await fetch(`/api/delete/booking/${bookingId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('success', 'Бронирование успешно отменено.');
            closeModal();
            loadBookings();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Не удалось отменить бронирование');
        }
    } catch (error) {
        console.error('Ошибка отмены бронирования:', error);
        showAlert('error', `Не удалось отменить бронирование: ${error.message}`);
    }
}

function viewBoardingPass(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (booking) {
        const style = booking.boarding_pass_default || 'default';
        window.open(`/api/get/boarding_pass/${bookingId}/${style}`, '_blank');
    }
    closeModal();
}

function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderBookings();
        });
    });
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            renderBookings();
        }, 300));
    }
    
    // Modal close on click outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('bookingModal');
        if (event.target === modal) {
            closeModal();
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

document.addEventListener('DOMContentLoaded', function() {
    loadBookings();
    setupEventListeners();
});