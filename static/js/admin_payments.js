let currentBooking = null;
let currentUser = null;

async function loadBookingInfo() {
    const bookingId = document.getElementById('bookingId').value;
    if (!bookingId) {
        alert('Пожалуйста, введите ID бронирования');
        return;
    }

    try {
        const response = await fetch(`/admin/api/bookings/${bookingId}`);
        if (!response.ok) {
            throw new Error('Бронирование не найдено');
        }

        currentBooking = await response.json();
        displayBookingInfo(currentBooking);

        const servicesTotal = currentBooking.pax_services.reduce((total, service) => total + (parseFloat(service.price) || 0), 0);
        document.getElementById('paymentAmount').value = servicesTotal.toFixed(2);
        document.getElementById('paymentDescription').value = `Оплата бронирования ${bookingId} - Услуги`;

    } catch (error) {
        alert('Ошибка загрузки бронирования: ' + error.message);
    }
}

function displayBookingInfo(booking) {
    document.getElementById('bookingInfo').style.display = 'block';
    document.getElementById('infoFlight').textContent = booking.flight_number;
    document.getElementById('infoPassenger').textContent = booking.passenger_name || booking.user_nickname;
    document.getElementById('infoSeat').textContent = `${booking.seat} (${booking.serve_class})`;

    const servicesTotal = booking.pax_services.reduce((total, service) => total + (parseFloat(service.price) || 0), 0);
    document.getElementById('infoServicesTotal').textContent = `$${servicesTotal.toFixed(2)}`;
}

async function loadUserInfo() {
    const identifier = document.getElementById('userIdentifier').value;
    if (!identifier) {
        alert('Пожалуйста, введите идентификатор пользователя');
        return;
    }

    try {
        let response = await fetch(`/api/get/users/virtual/${identifier}`);
        if (!response.ok) {
            response = await fetch(`/api/get/user/${identifier}`);
            if (!response.ok) {
                throw new Error('Пользователь не найден');
            }
        }

        currentUser = await response.json();
        displayUserInfo(currentUser);

    } catch (error) {
        alert('Ошибка загрузки пользователя: ' + error.message);
    }
}

function displayUserInfo(user) {
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('infoNickname').textContent = user.nickname;
    document.getElementById('infoMiles').textContent = user.miles || 0;
}

async function processBookingPayment() {
    if (!currentBooking) {
        alert('Пожалуйста, сначала загрузите бронирование');
        return;
    }

    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const description = document.getElementById('paymentDescription').value;

    if (isNaN(amount) || amount <= 0) {
        alert('Пожалуйста, введите корректную положительную сумму');
        return;
    }

    if (!description) {
        alert('Пожалуйста, введите описание');
        return;
    }

    try {
        const response = await fetch('/api/post/transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentBooking.user_id,
                booking_id: currentBooking.id,
                amount: -amount,
                description: description,
                type: 'booking_payment'
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Не удалось обработать платеж');
        }

        alert('Платеж по бронированию успешно обработан!');
        resetForms();

    } catch (error) {
        console.error('Ошибка платежа:', error);
        alert('Ошибка обработки платежа: ' + error.message);
    }
}

async function processUserPayment() {
    if (!currentUser) {
        alert('Пожалуйста, сначала загрузите пользователя');
        return;
    }

    const amount = parseFloat(document.getElementById('userAmount').value);
    const description = document.getElementById('userDescription').value;

    if (isNaN(amount) || amount === 0) {
        alert('Пожалуйста, введите корректную ненулевую сумму');
        return;
    }

    if (!description) {
        alert('Пожалуйста, введите описание');
        return;
    }

    try {
        const transactionType = amount > 0 ? 'payment' : 'withdrawal';

        const response = await fetch('/api/post/transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                amount: amount,
                description: description,
                type: transactionType
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Не удалось обработать транзакцию');
        }

        alert('Транзакция успешно обработана!');
        resetForms();

    } catch (error) {
        console.error('Ошибка транзакции:', error);
        alert('Ошибка обработки транзакции: ' + error.message);
    }
}

async function processMassPayment() {
    const flightNumber = document.getElementById('flightNumber').value.trim();
    const amount = parseFloat(document.getElementById('massAmount').value);
    const description = document.getElementById('massDescription').value.trim();

    if (!flightNumber) {
        alert('Пожалуйста, введите номер рейса');
        return;
    }

    if (isNaN(amount) || amount === 0) {
        alert('Пожалуйста, введите корректную ненулевую сумму');
        return;
    }

    if (!description) {
        alert('Пожалуйста, введите описание');
        return;
    }

    const transactionType = amount > 0 ? 'mass_payment' : 'mass_withdrawal';
    const actionType = amount > 0 ? 'платеж' : 'списание';

    if (!confirm(`Обработать $${Math.abs(amount).toFixed(2)} ${actionType} для всех действительных бронирований на рейс ${flightNumber}?\nЭто действие необратимо.`)) {
        return;
    }

    try {
        const processBtn = document.querySelector('.mass-btn');
        const originalText = processBtn.innerHTML;
        processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';
        processBtn.disabled = true;

        const response = await fetch(`/admin/api/bookings?flight_number=${flightNumber}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить бронирования');
        }

        const bookings = await response.json();

        const validBookings = bookings.filter(booking =>
            booking.valid === true || booking.valid === 1
        );

        console.log(`Найдено ${validBookings.length} действительных бронирований на рейс ${flightNumber}`);

        if (validBookings.length === 0) {
            alert('Для этого рейса не найдено действительных бронирований');
            processBtn.innerHTML = originalText;
            processBtn.disabled = false;
            return;
        }

        let processed = 0;
        let errors = 0;
        const errorDetails = [];

        for (const booking of validBookings) {
            try {
                console.log('Обработка бронирования:', booking.id);

                const bookingDetailResponse = await fetch(`/admin/api/bookings/${booking.id}`);
                if (!bookingDetailResponse.ok) {
                    throw new Error(`Не удалось получить детали бронирования ${booking.id}`);
                }

                const bookingDetail = await bookingDetailResponse.json();
                const userId = bookingDetail.user_id;

                if (!userId) {
                    console.warn(`Нет user_id для бронирования ${booking.id}`);
                    errors++;
                    errorDetails.push(`Бронирование ${booking.id}: Нет ID пользователя`);
                    continue;
                }

                const transactionResponse = await fetch('/api/post/transaction', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        booking_id: booking.id,
                        amount: amount,
                        description: `${description} - Рейс ${flightNumber}`,
                        type: transactionType
                    })
                });

                const transactionResult = await transactionResponse.json();

                if (transactionResponse.ok) {
                    processed++;
                    console.log(`✅ ${actionType} обработан для пользователя ${userId}, бронирование ${booking.id}`);
                } else {
                    errors++;
                    errorDetails.push(`Бронирование ${booking.id}: ${transactionResult.error || 'Транзакция не удалась'}`);
                    console.warn(`❌ ${actionType} не удался для бронирования ${booking.id}:`, transactionResult.error);
                }

            } catch (error) {
                errors++;
                errorDetails.push(`Бронирование ${booking.id}: ${error.message}`);
                console.error(`❌ Ошибка обработки бронирования ${booking.id}:`, error);
            }
        }

        let resultMessage = `Массовый ${actionType} завершен!\nОбработано: ${processed}\nОшибок: ${errors}`;

        if (errors > 0) {
            resultMessage += `\n\nДетали ошибок:\n${errorDetails.slice(0, 5).join('\n')}`;
            if (errorDetails.length > 5) {
                resultMessage += `\n... и еще ${errorDetails.length - 5} ошибок`;
            }
            console.error('Ошибки массового платежа:', errorDetails);
        }

        alert(resultMessage);

        if (processed > 0) {
            resetForms();
        }

    } catch (error) {
        console.error('Ошибка массового платежа:', error);
        alert('Ошибка обработки массового платежа: ' + error.message);
    } finally {
        const processBtn = document.querySelector('.mass-btn');
        processBtn.innerHTML = '<i class="fas fa-users"></i> Массовый платеж';
        processBtn.disabled = false;
    }
}

async function loadUserTransactions() {
    const userId = document.getElementById('searchUserId').value.trim();
    if (!userId) {
        alert('Пожалуйста, введите ID пользователя');
        return;
    }

    try {
        const container = document.getElementById('transactionsList');
        container.innerHTML = '<div class="loading">Загрузка транзакций...</div>';

        const response = await fetch(`/api/get/transactions/user/${userId}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Не удалось загрузить транзакции');
        }

        const transactions = await response.json();
        displayTransactions(transactions);

    } catch (error) {
        console.error('Ошибка загрузки транзакций:', error);
        const container = document.getElementById('transactionsList');
        container.innerHTML = `<div class="error">Ошибка: ${error.message}</div>`;
    }
}

function displayTransactions(transactions) {
    const container = document.getElementById('transactionsList');

    if (transactions.length === 0) {
        container.innerHTML = '<div class="loading">Транзакции не найдены</div>';
        return;
    }

    container.innerHTML = transactions.map(transaction => {
        const amount = parseFloat(transaction.amount);

        return `
        <div class="transaction-item">
            <div class="transaction-header">
                <div class="transaction-amount ${amount >= 0 ? 'amount-positive' : 'amount-negative'}">
                    ${amount >= 0 ? '+' : ''}$${amount.toFixed(2)}
                </div>
                <div class="transaction-date">${transaction.created_at_formatted}</div>
            </div>
            <div class="transaction-details">
                <div class="transaction-detail">
                    <span class="detail-label">Описание:</span>
                    <span>${transaction.description}</span>
                </div>
                <div class="transaction-detail">
                    <span class="detail-label">Тип:</span>
                    <span>${transaction.type}</span>
                </div>
                <div class="transaction-detail">
                    <span class="detail-label">ID бронирования:</span>
                    <span>${transaction.booking_id || 'Н/Д'}</span>
                </div>
                <div class="transaction-detail">
                    <span class="detail-label">Администратор:</span>
                    <span>${transaction.admin_nickname}</span>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function resetForms() {
    document.getElementById('bookingInfo').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
    currentBooking = null;
    currentUser = null;
    document.querySelectorAll('input').forEach(input => {
        if (input.type !== 'button') input.value = '';
    });
}