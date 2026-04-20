async function loadSchedule() {
    const scheduleList = document.getElementById('scheduleList');
    scheduleList.innerHTML = '<div class="loading">Загрузка расписания рейсов...</div>';

    try {
        const response = await fetch('/api/get/schedule');

        if (!response.ok) {
            throw new Error('Не удалось загрузить расписание');
        }

        const flights = await response.json();

        if (flights.length === 0) {
            scheduleList.innerHTML = `
                <div class="no-flights">
                    <i class="fas fa-plane-slash" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Нет запланированных рейсов</h3>
                    <p>Загляните позже для обновления расписания</p>
                </div>
            `;
            return;
        }

        scheduleList.innerHTML = flights.map(flight => {
            return `
            <div class="flight-card">
                <div class="flight-header">
                    <div class="flight-number">Рейс ${flight.flight_number}</div>
                    <div class="flight-status status-${flight.status.toLowerCase()}">
                        ${flight.status}
                    </div>
                </div>
                <div class="flight-details">
                    <div class="route-info">
                        <div class="airport">${flight.display_departure || flight.departure}</div>
                        <div class="city">Откуда</div>
                    </div>
                    <div class="route-arrow">
                        <i class="fas fa-long-arrow-alt-right"></i>
                    </div>
                    <div class="route-info">
                        <div class="airport">${flight.display_arrival || flight.arrival}</div>
                        <div class="city">Куда</div>
                    </div>
                </div>
                <div class="time-info">
                    <div class="datetime">${formatDate(new Date(flight.datetime * 1000))}</div>
                    <div class="duration">Прилёт: ${formatDate(new Date(flight.arrival_time * 1000))}</div>
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

    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
        scheduleList.innerHTML = '<div class="alert alert-error">Не удалось загрузить расписание рейсов. Пожалуйста, попробуйте снова.</div>';
    }
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month} ${hours}:${minutes}`;
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        const flightCards = document.querySelectorAll('.flight-card');

        flightCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    loadSchedule();
    setupSearch();
});