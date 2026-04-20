function goToEditFlight() {
    const flightNumber = document.getElementById('flightNumberInput').value.trim();
    if (!flightNumber) {
        alert('Пожалуйста, введите номер рейса');
        return;
    }
    window.location.href = `/admin/edit_flight?id=${encodeURIComponent(flightNumber)}`;
}

document.getElementById('flightNumberInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        goToEditFlight();
    }
});