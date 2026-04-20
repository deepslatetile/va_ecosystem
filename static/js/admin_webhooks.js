let embedFields = [];
let editingFieldIndex = -1;

const TEMPLATES = {
    flight_created: {
        title: "✈️ Новый рейс создан",
        description: "В расписание добавлен новый рейс.",
        color: "#5865F2",
        authorName: "Система рейсов",
        footerText: "Авиакомпания «Вектор» v1.0",
        fields: [
            { name: "Номер рейса", value: "VK101", inline: true },
            { name: "Маршрут", value: "KJA → DME", inline: true },
            { name: "Воздушное судно", value: "B737-800", inline: true },
            { name: "Начинается", value: "<t:1700000000>\n<t:1700000000:R>", inline: false },
            { name: "Статус", value: "По расписанию", inline: true }
        ],
        pingRole: "@пилоты"
    },
    booking_confirmed: {
        title: "🎫 Бронирование подтверждено",
        description: "Подтверждено новое бронирование.",
        color: "#3ba55d",
        authorName: "Система бронирования",
        footerText: "ID бронирования: #" + Math.floor(Math.random() * 10000),
        fields: [
            { name: "Пассажир", value: "Иван Петров", inline: true },
            { name: "Рейс", value: "VK101", inline: true },
            { name: "Место", value: "12A", inline: true },
            { name: "Класс", value: "Эконом", inline: true },
            { name: "Услуги", value: "Дополнительный багаж, Питание", inline: false }
        ]
    },
    payment_received: {
        title: "💳 Платёж получен",
        description: "Платёж успешно обработан.",
        color: "#faa61a",
        authorName: "Платёжная система",
        footerText: "Транзакция завершена",
        fields: [
            { name: "Сумма", value: "$299.99", inline: true },
            { name: "Валюта", value: "USD", inline: true },
            { name: "Метод", value: "Кредитная карта", inline: true },
            { name: "Статус", value: "Завершён ✅", inline: true }
        ]
    },
    system_alert: {
        title: "⚠️ Системное оповещение",
        description: "Важное уведомление системы требует внимания.",
        color: "#ed4245",
        authorName: "Монитор системы",
        footerText: "Оповещение создано в " + new Date().toLocaleTimeString(),
        fields: [
            { name: "Серьёзность", value: "ВЫСОКАЯ", inline: true },
            { name: "Компонент", value: "База данных", inline: true },
            { name: "Код ошибки", value: "ERR_DB_001", inline: true },
            { name: "Описание", value: "Пул соединений исчерпан. Требуется немедленное действие.", inline: false }
        ],
        pingRole: "@админы"
    }
};

document.addEventListener('DOMContentLoaded', function () {
    console.log("SOCIALNWK Webhooks Manager загружен");
    loadSavedConfiguration();
    setupEventListeners();
    setupCharacterCounters();
    setupTemplateButtons();

    const flightData = parseFlightDataFromURL();
    if (flightData) {
        applyFlightDataTemplate(flightData);
        showAlert('Данные рейса загружены из URL!', 'success');
    }
});

function parseFlightDataFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const flightDataParam = urlParams.get('flight_data');

    if (!flightDataParam) return null;

    try {
        const decodedData = decodeURIComponent(flightDataParam);
        const flightData = JSON.parse(decodedData);

        if (flightData.timestamp && Date.now() - flightData.timestamp > 300000) {
            console.warn('Данные рейса старше 5 минут');
        }

        return flightData;
    } catch (error) {
        console.error('Ошибка парсинга данных рейса из URL:', error);
        return null;
    }
}

function applyFlightDataTemplate(flightData) {
    let SOCIALNWKTimestamp = '';
    let SOCIALNWKRelativeTimestamp = '';

    if (flightData.unix_timestamp) {
        SOCIALNWKTimestamp = `<t:${flightData.unix_timestamp}>`;
        SOCIALNWKRelativeTimestamp = `<t:${flightData.unix_timestamp}:R>`;
    } else if (flightData.datetime) {
        const departureDate = new Date(flightData.datetime);
        const unixTimestamp = Math.floor(departureDate.getTime() / 1000);
        SOCIALNWKTimestamp = `<t:${unixTimestamp}>`;
        SOCIALNWKRelativeTimestamp = `<t:${unixTimestamp}:R>`;
    }

    let formattedDuration = flightData.enroute || 'Н/Д';

    document.getElementById('messageTitle').value = `✈️ ${flightData.flight_number || 'Рейс без номера'}`;
    document.getElementById('messageDescription').value = `Запланирован новый рейс.`;
    document.getElementById('messageColor').value = '#5865F2';
    document.getElementById('colorValue').textContent = '#5865F2';
    document.getElementById('authorName').value = 'Система планирования рейсов';
    document.getElementById('footerText').value = `Система рейсов • ${new Date().toLocaleDateString()}`;
    document.getElementById('pingRole').value = '@here';

    embedFields = [];

    const fields = [];

    if (flightData.flight_number) {
        fields.push({
            name: "Номер рейса",
            value: flightData.flight_number,
            inline: true
        });
    }

    if (flightData.departure && flightData.arrival) {
        fields.push({
            name: "Маршрут",
            value: `${flightData.departure} → ${flightData.arrival}`,
            inline: true
        });
    }

    if (flightData.aircraft) {
        fields.push({
            name: "Воздушное судно",
            value: flightData.aircraft,
            inline: true
        });
    }

    if (SOCIALNWKTimestamp && SOCIALNWKRelativeTimestamp) {
        fields.push({
            name: "Начинается",
            value: `${SOCIALNWKTimestamp}\n${SOCIALNWKRelativeTimestamp}`,
            inline: false
        });
    } else if (flightData.datetime) {
        const departureDate = new Date(flightData.datetime);
        fields.push({
            name: "Начинается",
            value: departureDate.toLocaleString(),
            inline: false
        });
    }

    if (flightData.enroute) {
        fields.push({
            name: "Длительность полёта",
            value: formattedDuration,
            inline: true
        });
    }

    if (flightData.status) {
        fields.push({
            name: "Статус",
            value: flightData.status,
            inline: true
        });
    }

    if (flightData.meal && flightData.meal !== 'custom') {
        fields.push({
            name: "Питание на борту",
            value: flightData.meal,
            inline: true
        });
    }

    if (flightData.services && flightData.services.length > 0) {
        fields.push({
            name: "Доступные услуги",
            value: flightData.services.join(', '),
            inline: false
        });
    }

    embedFields = fields;
    renderFields();
    updateCharCounter('descCharCount', document.getElementById('messageDescription').value.length, 4096);
    saveMessageConfig();
}

function loadSavedConfiguration() {
    try {
        const savedConfig = localStorage.getItem('SOCIALNWKWebhookConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            document.getElementById('webhookUrl').value = config.webhookUrl || '';
            document.getElementById('webhookName').value = config.webhookName || '';
            document.getElementById('pingRole').value = config.pingRole || '';
        }

        const savedMessage = localStorage.getItem('SOCIALNWKMessageConfig');
        if (savedMessage) {
            const message = JSON.parse(savedMessage);
            document.getElementById('messageTitle').value = message.title || '';
            document.getElementById('messageDescription').value = message.description || '';
            document.getElementById('messageColor').value = message.color || '#5865F2';
            document.getElementById('colorValue').textContent = message.color || '#5865F2';
            document.getElementById('authorName').value = message.authorName || '';
            document.getElementById('authorIcon').value = message.authorIcon || '';
            document.getElementById('footerText').value = message.footerText || '';
            document.getElementById('footerIcon').value = message.footerIcon || '';
            document.getElementById('thumbnailUrl').value = message.thumbnailUrl || '';
            document.getElementById('imageUrl').value = message.imageUrl || '';

            if (message.fields) {
                embedFields = message.fields;
                renderFields();
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки сохранённой конфигурации:', error);
    }
}

function saveConfiguration() {
    const config = {
        webhookUrl: document.getElementById('webhookUrl').value,
        webhookName: document.getElementById('webhookName').value,
        pingRole: document.getElementById('pingRole').value
    };
    localStorage.setItem('SOCIALNWKWebhookConfig', JSON.stringify(config));
}

function saveMessageConfig() {
    const messageConfig = {
        title: document.getElementById('messageTitle').value,
        description: document.getElementById('messageDescription').value,
        color: document.getElementById('messageColor').value,
        authorName: document.getElementById('authorName').value,
        authorIcon: document.getElementById('authorIcon').value,
        footerText: document.getElementById('footerText').value,
        footerIcon: document.getElementById('footerIcon').value,
        thumbnailUrl: document.getElementById('thumbnailUrl').value,
        imageUrl: document.getElementById('imageUrl').value,
        fields: embedFields
    };
    localStorage.setItem('SOCIALNWKMessageConfig', JSON.stringify(messageConfig));
}

function setupEventListeners() {
    document.getElementById('messageColor').addEventListener('input', function () {
        document.getElementById('colorValue').textContent = this.value;
        saveMessageConfig();
    });

    document.getElementById('saveWebhookBtn').addEventListener('click', function () {
        saveConfiguration();
        showAlert('Конфигурация сохранена успешно!', 'success');
    });

    document.getElementById('testWebhookBtn').addEventListener('click', testWebhookConnection);

    document.getElementById('previewMessageBtn').addEventListener('click', previewMessage);

    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);

    document.getElementById('addFieldBtn').addEventListener('click', function () {
        editingFieldIndex = -1;
        openFieldModal();
    });

    document.querySelectorAll('.close, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', closeFieldModal);
    });

    document.getElementById('fieldModal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeFieldModal();
        }
    });

    const saveInputs = [
        'webhookUrl', 'webhookName', 'pingRole', 'messageTitle', 'messageDescription',
        'authorName', 'authorIcon', 'footerText', 'footerIcon',
        'thumbnailUrl', 'imageUrl'
    ];

    saveInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', function () {
                if (id === 'messageDescription') {
                    updateCharCounter('descCharCount', this.value.length, 4096);
                }
                if (id === 'pingRole' || id === 'webhookUrl' || id === 'webhookName') {
                    saveConfiguration();
                } else {
                    saveMessageConfig();
                }
            });
        }
    });

    const templatesCard = document.querySelector('.admin-card:has(.templates-grid)');
    if (templatesCard) {
        const flightData = parseFlightDataFromURL();
        if (flightData) {
            const header = templatesCard.querySelector('.card-header-with-icon');
            const flightTemplateBtn = document.createElement('button');
            flightTemplateBtn.type = 'button';
            flightTemplateBtn.className = 'btn-small';
            flightTemplateBtn.style.marginLeft = 'auto';
            flightTemplateBtn.innerHTML = '<i class="fas fa-plane"></i> Использовать данные рейса';
            flightTemplateBtn.addEventListener('click', () => applyFlightDataTemplate(flightData));

            header.appendChild(flightTemplateBtn);
        }
    }
}

function setupCharacterCounters() {
    const descriptionField = document.getElementById('messageDescription');
    descriptionField.addEventListener('input', function () {
        updateCharCounter('descCharCount', this.value.length, 4096);
    });

    updateCharCounter('descCharCount', descriptionField.value.length, 4096);
}

function updateCharCounter(elementId, currentLength, maxLength) {
    const counter = document.getElementById(elementId);
    if (counter) {
        counter.textContent = currentLength;
        counter.style.color = currentLength > maxLength ? '#ed4245' : '#8fa3d8';
    }
}

function setupTemplateButtons() {
    document.querySelectorAll('.use-template-btn').forEach(button => {
        button.addEventListener('click', function () {
            const templateName = this.closest('.template-item').dataset.template;
            applyTemplate(templateName);
        });
    });
}

function applyTemplate(templateName) {
    const template = TEMPLATES[templateName];
    if (!template) return;

    document.getElementById('messageTitle').value = template.title;
    document.getElementById('messageDescription').value = template.description;
    document.getElementById('messageColor').value = template.color;
    document.getElementById('colorValue').textContent = template.color;
    document.getElementById('authorName').value = template.authorName || '';
    document.getElementById('footerText').value = template.footerText || '';
    document.getElementById('pingRole').value = template.pingRole || '';

    embedFields = template.fields || [];
    renderFields();

    updateCharCounter('descCharCount', template.description.length, 4096);
    saveMessageConfig();
    saveConfiguration();

    showAlert(`Шаблон "${templateName.replace('_', ' ')}" применён!`, 'success');
}

function openFieldModal(fieldIndex = -1, fieldData = null) {
    editingFieldIndex = fieldIndex;
    const modal = document.getElementById('fieldModal');
    const form = document.getElementById('fieldForm');

    if (fieldData) {
        document.getElementById('fieldName').value = fieldData.name;
        document.getElementById('fieldValue').value = fieldData.value;
        document.getElementById('fieldInline').checked = fieldData.inline || false;
    } else {
        form.reset();
    }

    const fieldValue = document.getElementById('fieldValue');
    fieldValue.addEventListener('input', function () {
        updateCharCounter('fieldValueCharCount', this.value.length, 1024);
    });
    updateCharCounter('fieldValueCharCount', fieldValue.value.length, 1024);

    modal.style.display = 'block';
}

function closeFieldModal() {
    document.getElementById('fieldModal').style.display = 'none';
    editingFieldIndex = -1;
}

function renderFields() {
    const container = document.getElementById('embedFieldsContainer');

    if (embedFields.length === 0) {
        container.innerHTML = '<div class="no-fields">Поля не добавлены. Нажмите "Добавить поле", чтобы создать.</div>';
        return;
    }

    container.innerHTML = embedFields.map((field, index) => `
        <div class="field-item" data-index="${index}">
            <div class="field-header">
                <h4 class="field-title">${escapeHtml(field.name)}</h4>
                <span class="field-inline-badge">${field.inline ? 'В строку' : 'Блок'}</span>
            </div>
            <div class="field-value">${escapeHtml(field.value)}</div>
            <div class="field-actions">
                <button type="button" class="field-action-btn" onclick="editField(${index})">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
                <button type="button" class="field-action-btn" onclick="deleteField(${index})">
                    <i class="fas fa-trash"></i> Удалить
                </button>
                <button type="button" class="field-action-btn" onclick="moveField(${index}, -1)" ${index === 0 ? 'disabled' : ''}>
                    <i class="fas fa-arrow-up"></i> Вверх
                </button>
                <button type="button" class="field-action-btn" onclick="moveField(${index}, 1)" ${index === embedFields.length - 1 ? 'disabled' : ''}>
                    <i class="fas fa-arrow-down"></i> Вниз
                </button>
            </div>
        </div>
    `).join('');
}

function editField(index) {
    const field = embedFields[index];
    openFieldModal(index, field);
}

function deleteField(index) {
    if (confirm('Вы уверены, что хотите удалить это поле?')) {
        embedFields.splice(index, 1);
        renderFields();
        saveMessageConfig();
        showAlert('Поле успешно удалено!', 'success');
    }
}

function moveField(index, direction) {
    if ((index === 0 && direction === -1) || (index === embedFields.length - 1 && direction === 1)) {
        return;
    }

    const newIndex = index + direction;
    const temp = embedFields[index];
    embedFields[index] = embedFields[newIndex];
    embedFields[newIndex] = temp;

    renderFields();
    saveMessageConfig();
}

document.getElementById('fieldForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const fieldData = {
        name: document.getElementById('fieldName').value.trim(),
        value: document.getElementById('fieldValue').value.trim(),
        inline: document.getElementById('fieldInline').checked
    };

    if (!fieldData.name || !fieldData.value) {
        showAlert('Название и значение поля обязательны!', 'error');
        return;
    }

    if (editingFieldIndex === -1) {
        embedFields.push(fieldData);
    } else {
        embedFields[editingFieldIndex] = fieldData;
    }

    renderFields();
    saveMessageConfig();
    closeFieldModal();

    const message = editingFieldIndex === -1 ? 'Поле успешно добавлено!' : 'Поле успешно обновлено!';
    showAlert(message, 'success');
});

async function testWebhookConnection() {
    const webhookUrl = document.getElementById('webhookUrl').value;

    if (!webhookUrl) {
        showAlert('Пожалуйста, введите URL вебхука!', 'error');
        return;
    }

    if (!webhookUrl.match(/^https:\/\/SOCIALNWK\.com\/api\/webhooks\/.+/)) {
        showAlert('Неверный формат URL вебхука SOCIALNWK!', 'error');
        return;
    }

    const testBtn = document.getElementById('testWebhookBtn');
    const originalText = testBtn.innerHTML;

    testBtn.disabled = true;
    testBtn.innerHTML = '<span class="loading"></span> Тестирование...';

    try {
        const response = await fetch(webhookUrl, {
            method: 'GET'
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error('Неверный URL вебхука или вебхук удалён');
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        showAlert('✅ Подключение к вебхуку успешно!', 'success');

    } catch (error) {
        console.error('Тест вебхука не удался:', error);
        showAlert(`❌ Тест вебхука не удался: ${error.message}`, 'error');
    } finally {
        testBtn.disabled = false;
        testBtn.innerHTML = originalText;
    }
}

function previewMessage() {
    const embedData = buildEmbedData();
    const pingRole = document.getElementById('pingRole').value.trim();
    const previewContainer = document.getElementById('embedPreview');
    const pingPreview = document.getElementById('pingPreview');
    const pingPreviewText = document.getElementById('pingPreviewText');
    const previewCard = document.getElementById('previewCard');

    if (!embedData.title || !embedData.description) {
        showAlert('Пожалуйста, сначала заполните заголовок и описание!', 'error');
        return;
    }

    let previewHtml = '<div class="preview-embed">';

    if (embedData.author?.name) {
        previewHtml += `
            <div class="preview-author">
                <div class="preview-author-icon" style="background-color: ${embedData.color};"></div>
                <span class="preview-author-name">${escapeHtml(embedData.author.name)}</span>
            </div>
        `;
    }

    previewHtml += `<a href="#" class="preview-title" style="color: ${embedData.color};">${escapeHtml(embedData.title)}</a>`;

    previewHtml += `<div class="preview-description">${escapeHtml(embedData.description)}</div>`;

    if (embedData.thumbnail?.url) {
        previewHtml += `<img src="${embedData.thumbnail.url}" alt="Thumbnail" class="preview-thumbnail">`;
    }

    if (embedData.fields?.length > 0) {
        previewHtml += '<div class="preview-fields">';
        embedData.fields.forEach(field => {
            previewHtml += `
                <div class="preview-field" style="${field.inline ? 'flex: 1; min-width: 150px;' : 'flex-basis: 100%;'}">
                    <div class="preview-field-name">${escapeHtml(field.name)}</div>
                    <div class="preview-field-value">${escapeHtml(field.value)}</div>
                </div>
            `;
        });
        previewHtml += '</div>';
    }

    if (embedData.image?.url) {
        previewHtml += `<img src="${embedData.image.url}" alt="Image" class="preview-image">`;
    }

    if (embedData.footer?.text) {
        previewHtml += `
            <div class="preview-footer">
                <div class="preview-footer-icon"></div>
                <span class="preview-footer-text">${escapeHtml(embedData.footer.text)}</span>
            </div>
        `;
    }

    previewHtml += '</div>';
    previewContainer.innerHTML = previewHtml;

    if (pingRole) {
        pingPreviewText.textContent = pingRole;
        pingPreview.style.display = 'block';
    } else {
        pingPreview.style.display = 'none';
    }

    previewCard.style.display = 'block';
    previewCard.scrollIntoView({ behavior: 'smooth' });
}

async function sendMessage() {
    const webhookUrl = document.getElementById('webhookUrl').value;
    const pingRole = document.getElementById('pingRole').value.trim();

    if (!webhookUrl) {
        showAlert('Пожалуйста, введите URL вебхука!', 'error');
        return;
    }

    const embedData = buildEmbedData();

    if (!embedData.title || !embedData.description) {
        showAlert('Заголовок и описание обязательны!', 'error');
        return;
    }

    const sendBtn = document.getElementById('sendMessageBtn');
    const originalText = sendBtn.innerHTML;

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="loading"></span> Отправка...';

    try {
        const payload = {
            embeds: [embedData]
        };

        const webhookName = document.getElementById('webhookName').value;
        if (webhookName) {
            payload.username = webhookName;
        }

        if (pingRole) {
            payload.content = pingRole;
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.status === 204) {
            showAlert('✅ Сообщение успешно отправлено в SOCIALNWK!', 'success');

            await logWebhookAction('sent', {
                embed: embedData,
                pingRole: pingRole || null
            });

        } else if (response.status === 404) {
            throw new Error('Вебхук не найден (удалён или неверный URL)');
        } else {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

    } catch (error) {
        console.error('Не удалось отправить сообщение:', error);
        showAlert(`❌ Не удалось отправить сообщение: ${error.message}`, 'error');

        await logWebhookAction('error', {
            error: error.message,
            pingRole: pingRole || null
        });

    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalText;
    }
}

function buildEmbedData() {
    const hexColor = document.getElementById('messageColor').value;
    const color = parseInt(hexColor.replace('#', ''), 16);

    const embed = {
        title: document.getElementById('messageTitle').value.trim(),
        description: document.getElementById('messageDescription').value.trim(),
        color: color,
        timestamp: new Date().toISOString()
    };

    const authorName = document.getElementById('authorName').value.trim();
    const authorIcon = document.getElementById('authorIcon').value.trim();
    if (authorName || authorIcon) {
        embed.author = {};
        if (authorName) embed.author.name = authorName;
        if (authorIcon) embed.author.icon_url = authorIcon;
    }

    const footerText = document.getElementById('footerText').value.trim();
    const footerIcon = document.getElementById('footerIcon').value.trim();
    if (footerText || footerIcon) {
        embed.footer = {};
        if (footerText) embed.footer.text = footerText;
        if (footerIcon) embed.footer.icon_url = footerIcon;
    }

    const thumbnailUrl = document.getElementById('thumbnailUrl').value.trim();
    if (thumbnailUrl) {
        embed.thumbnail = { url: thumbnailUrl };
    }

    const imageUrl = document.getElementById('imageUrl').value.trim();
    if (imageUrl) {
        embed.image = { url: imageUrl };
    }

    if (embedFields.length > 0) {
        embed.fields = embedFields.map(field => ({
            name: field.name,
            value: field.value,
            inline: field.inline || false
        }));
    }

    return embed;
}

async function logWebhookAction(action, data) {
    try {
        await fetch('/admin/api/webhooks/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                data: data,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error('Не удалось записать действие вебхука:', error);
    }
}

function showAlert(message, type) {
    const alertsContainer = document.getElementById('adminAlerts');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;

    alertsContainer.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transition = 'opacity 0.5s ease';
        setTimeout(() => alert.remove(), 500);
    }, 5000);

    alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}