const WEATHER_API_BASE = '/admin/api/get/weather';

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('icaoCode').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            fetchWeather();
        }
    });

    document.getElementById('multiStationsInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            fetchMultipleStationsData();
        }
    });
});

function setICAO(code) {
    document.getElementById('icaoCode').value = code.toUpperCase();
    fetchWeather();
}

async function fetchWeather() {
    const icaoCode = document.getElementById('icaoCode').value.trim().toUpperCase();

    if (!icaoCode) {
        showAlert('Пожалуйста, введите код ICAO', 'error');
        return;
    }

    if (icaoCode.length !== 4) {
        showAlert('Код ICAO должен состоять из 4 символов', 'error');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${WEATHER_API_BASE}/${icaoCode}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ошибка! статус: ${response.status}`);
        }

        const data = await response.json();

        if (data.results === 0) {
            showAlert(`Погодные данные для ${icaoCode} не найдены`, 'warning');
            displayEmptyState();
            return;
        }

        displayWeatherData(data.data, data.cache_info);
        showAlert(`Погодные данные загружены для ${icaoCode}${data.cache_info.from_cache ? ' (из кэша)' : ''}`, 'success');

    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        showAlert(`Ошибка загрузки погодных данных: ${error.message}`, 'error');
        displayEmptyState();
    } finally {
        showLoading(false);
    }
}

async function fetchMultipleStationsData() {
    const stationsInput = document.getElementById('multiStationsInput').value.trim().toUpperCase();

    if (!stationsInput) {
        showAlert('Пожалуйста, введите коды ICAO', 'error');
        return;
    }

    const stations = stationsInput.split(',').map(s => s.trim()).filter(s => s.length === 4);

    if (stations.length === 0) {
        showAlert('Действительные коды ICAO не найдены', 'error');
        return;
    }

    if (stations.length > 10) {
        showAlert('Максимум 10 станций разрешено', 'warning');
        stations.splice(10);
    }

    showLoading(true);

    try {
        const stationsParam = stations.join(',');
        const response = await fetch(`${WEATHER_API_BASE}/multiple?stations=${stationsParam}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ошибка! статус: ${response.status}`);
        }

        const data = await response.json();

        if (data.results === 0) {
            showAlert('Погодные данные для указанных станций не найдены', 'warning');
            return;
        }

        displayWeatherData(data.data, data.cache_info);

        const cacheInfo = data.cache_info;
        const cacheMessage = cacheInfo ?
            ` (${cacheInfo.from_cache} из кэша, ${cacheInfo.from_api} из API)` : '';

        showAlert(`Загружены данные для ${data.results} станции(й)${cacheMessage}`, 'success');

    } catch (error) {
        console.error('Ошибка получения нескольких станций:', error);
        showAlert(`Ошибка загрузки погодных данных: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

function displayWeatherData(weatherData, cacheInfo = null) {
    const weatherCards = document.getElementById('weatherCards');
    const emptyState = document.getElementById('emptyState');

    if (!weatherData || weatherData.length === 0) {
        displayEmptyState();
        return;
    }

    weatherCards.innerHTML = '';
    emptyState.style.display = 'none';
    weatherCards.style.display = 'grid';

    weatherData.forEach(station => {
        const stationCacheInfo = station.cache_info || cacheInfo;
        const card = createWeatherCard(station, stationCacheInfo);
        weatherCards.appendChild(card);
    });
}

function createWeatherCard(station, cacheInfo = null) {
    const card = document.createElement('div');
    card.className = 'weather-card';

    const observationTime = new Date(station.observed).toLocaleString();
    const temperature = station.temperature ? `${station.temperature.celsius}°C` : 'Н/Д';
    const dewPoint = station.dewpoint ? `${station.dewpoint.celsius}°C` : 'Н/Д';
    const wind = station.wind ? `${station.wind.degrees}° при ${station.wind.speed_kts} уз` : 'Н/Д';
    const visibility = station.visibility ? `${station.visibility.meters_text} м` : 'Н/Д';
    const altimeter = station.barometer ? `${station.barometer.hpa} гПа` : 'Н/Д';
    const humidity = station.humidity ? `${station.humidity.percent}%` : 'Н/Д';

    card.innerHTML = `
        <div class="weather-header">
            <div class="station-info">
                <h3>${station.icao}</h3>
                <p class="station-location">${station.station?.name || 'Неизвестное местоположение'}</p>
                <p class="station-location">Наблюдение: ${observationTime}</p>
                ${cacheInfo && cacheInfo.from_cache ? `
                    <div class="cache-indicator">
                        <i class="fas fa-database"></i>
                        В кэше (${Math.round(cacheInfo.cache_duration / 60)} мин)
                    </div>
                ` : ''}
            </div>
            <div class="flight-category ${station.flight_category ? station.flight_category.toLowerCase() : 'unknown'}">
                ${station.flight_category || 'UNKN'}
            </div>
        </div>
        
        <div class="weather-details">
            <div class="weather-item">
                <span class="weather-label">Температура</span>
                <span class="weather-value">${temperature}</span>
            </div>
            <div class="weather-item">
                <span class="weather-label">Точка росы</span>
                <span class="weather-value">${dewPoint}</span>
            </div>
            <div class="weather-item">
                <span class="weather-label">Ветер</span>
                <span class="weather-value">${wind}</span>
            </div>
            <div class="weather-item">
                <span class="weather-label">Видимость</span>
                <span class="weather-value">${visibility}</span>
            </div>
            <div class="weather-item">
                <span class="weather-label">Давление</span>
                <span class="weather-value">${altimeter}</span>
            </div>
            <div class="weather-item">
                <span class="weather-label">Влажность</span>
                <span class="weather-value">${humidity}</span>
            </div>
        </div>
        
        ${station.conditions && station.conditions.length > 0 ? `
        <div class="weather-item">
            <span class="weather-label">Условия</span>
            <span class="weather-value">
                ${station.conditions.map(cond => cond.text).join(', ')}
            </span>
        </div>
        ` : ''}
        
        ${station.clouds && station.clouds.length > 0 ? `
        <div class="weather-item">
            <span class="weather-label">Облака</span>
            <span class="weather-value">
                ${station.clouds.map(cloud => `${cloud.text} на ${cloud.feet} футов`).join(', ')}
            </span>
        </div>
        ` : ''}
        
        ${station.raw_text ? `
        <div class="weather-raw">
            <p class="raw-metar">${station.raw_text}</p>
        </div>
        ` : ''}
    `;

    return card;
}

function showLoading(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const weatherCards = document.getElementById('weatherCards');

    if (show) {
        loadingSpinner.style.display = 'block';
        weatherCards.style.display = 'none';
    } else {
        loadingSpinner.style.display = 'none';
        weatherCards.style.display = 'grid';
    }
}

function displayEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const weatherCards = document.getElementById('weatherCards');

    emptyState.style.display = 'block';
    weatherCards.style.display = 'none';
}

function showAlert(message, type) {
    const alert = document.getElementById('alertMessage');
    alert.textContent = message;
    alert.className = `alert-message alert-${type}`;
    alert.style.display = 'block';

    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

function fetchMultipleStations() {
    document.getElementById('multiStationModal').style.display = 'flex';
}

function closeMultiStationModal() {
    document.getElementById('multiStationModal').style.display = 'none';
}

function showCacheManagement() {
    document.getElementById('cacheModal').style.display = 'flex';
}

function closeCacheModal() {
    document.getElementById('cacheModal').style.display = 'none';
}

async function getCacheStatus() {
    try {
        const response = await fetch('/admin/api/weather/cache/status');

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Доступ запрещён. Пожалуйста, проверьте права администратора.');
            }
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ошибка! статус: ${response.status}`);
        }

        const data = await response.json();
        displayCacheStatus(data.cache_status);

    } catch (error) {
        console.error('Ошибка получения статуса кэша:', error);
        showAlert(`Ошибка получения статуса кэша: ${error.message}`, 'error');

        const cacheStatusElement = document.getElementById('cacheStatus');
        cacheStatusElement.innerHTML = `
            <div class="cache-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${error.message}</p>
                <p class="error-detail">Статус: ${error.message.includes('Доступ запрещён') ? 'Неавторизован' : 'Ошибка API'}</p>
            </div>
        `;
    }
}

async function clearWeatherCache() {
    if (!confirm('Вы уверены, что хотите очистить кэш погоды? Это удалит все сохранённые погодные данные.')) {
        return;
    }

    try {
        const response = await fetch('/admin/api/weather/cache/clear', {
            method: 'POST'
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Доступ запрещён. Пожалуйста, проверьте права администратора.');
            }
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ошибка! статус: ${response.status}`);
        }

        const data = await response.json();
        showAlert(data.message, 'success');

        getCacheStatus();

    } catch (error) {
        console.error('Ошибка очистки кэша:', error);
        showAlert(`Ошибка очистки кэша: ${error.message}`, 'error');
    }
}

function displayCacheStatus(cacheStatus) {
    const cacheStatusElement = document.getElementById('cacheStatus');

    if (!cacheStatus) {
        cacheStatusElement.innerHTML = `
            <div class="cache-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Не удалось загрузить статус кэша</p>
            </div>
        `;
        return;
    }

    const utilizationPercent = Math.round((cacheStatus.total_entries / cacheStatus.max_entries) * 100);
    const activePercent = Math.round((cacheStatus.active_entries / cacheStatus.max_entries) * 100);

    cacheStatusElement.innerHTML = `
        <div class="cache-stats">
            <div class="cache-stat-row">
                <div class="cache-stat">
                    <span class="stat-label">Всего записей</span>
                    <span class="stat-value">${cacheStatus.total_entries}</span>
                </div>
                <div class="cache-stat">
                    <span class="stat-label">Активных записей</span>
                    <span class="stat-value">${cacheStatus.active_entries}</span>
                </div>
                <div class="cache-stat">
                    <span class="stat-label">Просроченных записей</span>
                    <span class="stat-value">${cacheStatus.expired_entries}</span>
                </div>
            </div>
            
            <div class="cache-stat-row">
                <div class="cache-stat">
                    <span class="stat-label">Макс. ёмкость</span>
                    <span class="stat-value">${cacheStatus.max_entries}</span>
                </div>
                <div class="cache-stat">
                    <span class="stat-label">Загрузка</span>
                    <span class="stat-value ${utilizationPercent > 80 ? 'stat-warning' : ''}">
                        ${utilizationPercent}%
                    </span>
                </div>
                <div class="cache-stat">
                    <span class="stat-label">Время кэширования</span>
                    <span class="stat-value">${cacheStatus.cache_duration_minutes} мин</span>
                </div>
            </div>
        </div>
        
        ${cacheStatus.oldest_entries.length > 0 ? `
        <div class="cache-entries-section">
            <h4>Старейшие записи</h4>
            <div class="cache-entries-list">
                ${cacheStatus.oldest_entries.map(entry => `
                    <div class="cache-entry">
                        <span class="entry-icao">${entry.icao}</span>
                        <span class="entry-time">${new Date(entry.created_at * 1000).toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${cacheStatus.newest_entries.length > 0 ? `
        <div class="cache-entries-section">
            <h4>Новейшие записи</h4>
            <div class="cache-entries-list">
                ${cacheStatus.newest_entries.map(entry => `
                    <div class="cache-entry">
                        <span class="entry-icao">${entry.icao}</span>
                        <span class="entry-time">${new Date(entry.created_at * 1000).toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="cache-actions">
            <button class="btn btn-small btn-secondary" onclick="getCacheStatus()">
                <i class="fas fa-sync-alt"></i> Обновить
            </button>
            <button class="btn btn-small btn-danger" onclick="clearWeatherCache()">
                <i class="fas fa-trash"></i> Очистить кэш
            </button>
        </div>
    `;
}

document.addEventListener('click', function (event) {
    const multiModal = document.getElementById('multiStationModal');
    const cacheModal = document.getElementById('cacheModal');

    if (event.target === multiModal) {
        closeMultiStationModal();
    }

    if (event.target === cacheModal) {
        closeCacheModal();
    }
});