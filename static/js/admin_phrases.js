const PHRASES_KEY = 'admin_phrases';

document.addEventListener('DOMContentLoaded', function () {
    loadPhrases();

    document.getElementById('newPhrase').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addPhrase();
        }
    });
});

function loadPhrases() {
    const phrasesGrid = document.getElementById('phrasesGrid');
    const emptyState = document.getElementById('emptyState');
    const phrases = getPhrases();

    phrasesGrid.innerHTML = '';

    if (phrases.length === 0) {
        emptyState.style.display = 'block';
        phrasesGrid.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    phrasesGrid.style.display = 'grid';

    phrases.forEach((phrase, index) => {
        const phraseCard = document.createElement('div');
        phraseCard.className = 'phrase-card';
        phraseCard.innerHTML = `
            <div class="phrase-text">${escapeHtml(phrase)}</div>
            <div class="phrase-actions">
                <span class="copy-hint">Нажмите, чтобы скопировать</span>
                <button class="delete-btn" onclick="deletePhrase(${index}, event)">
                    <i class="fas fa-trash"></i> Удалить
                </button>
            </div>
        `;

        phraseCard.addEventListener('click', function (e) {
            if (!e.target.classList.contains('delete-btn')) {
                copyToClipboard(phrase);
            }
        });

        phrasesGrid.appendChild(phraseCard);
    });
}

function getPhrases() {
    const phrasesJson = localStorage.getItem(PHRASES_KEY);
    return phrasesJson ? JSON.parse(phrasesJson) : [];
}

function savePhrases(phrases) {
    localStorage.setItem(PHRASES_KEY, JSON.stringify(phrases));
}

function addPhrase() {
    const input = document.getElementById('newPhrase');
    const newPhrase = input.value.trim();

    if (!newPhrase) {
        showAlert('Пожалуйста, введите фразу', 'error');
        return;
    }

    if (newPhrase.length > 500) {
        showAlert('Фраза слишком длинная (макс. 500 символов)', 'error');
        return;
    }

    const phrases = getPhrases();

    if (phrases.includes(newPhrase)) {
        showAlert('Эта фраза уже существует', 'error');
        return;
    }

    phrases.push(newPhrase);
    savePhrases(phrases);
    input.value = '';
    loadPhrases();
    showAlert('Фраза успешно добавлена', 'success');
}

function deletePhrase(index, event) {
    event.stopPropagation();

    if (!confirm('Вы уверены, что хотите удалить эту фразу?')) {
        return;
    }

    const phrases = getPhrases();
    const deletedPhrase = phrases[index];
    phrases.splice(index, 1);
    savePhrases(phrases);
    loadPhrases();
    showAlert(`Фраза "${truncateText(deletedPhrase, 30)}" удалена`, 'success');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert('Скопировано в буфер обмена: ' + truncateText(text, 50), 'success');
    }).catch(err => {
        console.error('Ошибка копирования: ', err);
        fallbackCopyToClipboard(text);
    });
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();

    try {
        document.execCommand('copy');
        showAlert('Скопировано в буфер обмена: ' + truncateText(text, 50), 'success');
    } catch (err) {
        console.error('Ошибка копирования: ', err);
        showAlert('Не удалось скопировать', 'error');
    }

    document.body.removeChild(textArea);
}

function exportPhrases() {
    const phrases = getPhrases();

    if (phrases.length === 0) {
        showAlert('Нет фраз для экспорта', 'error');
        return;
    }

    const dataStr = JSON.stringify(phrases, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `phrases_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert(`Экспортировано ${phrases.length} фраз`, 'success');
}

function importPhrases(event) {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = '';

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const importedPhrases = JSON.parse(e.target.result);

            if (!Array.isArray(importedPhrases)) {
                showAlert('Неверный формат файла. Ожидается массив фраз.', 'error');
                return;
            }

            const validPhrases = importedPhrases.filter(phrase =>
                typeof phrase === 'string' && phrase.trim().length > 0 && phrase.length <= 500
            );

            if (validPhrases.length === 0) {
                showAlert('В файле нет действительных фраз', 'error');
                return;
            }

            const currentPhrases = getPhrases();
            const mergedPhrases = [...new Set([...currentPhrases, ...validPhrases])];

            if (mergedPhrases.length > 1000) {
                showAlert(`Слишком много фраз. Будет сохранено только 1000.`, 'warning');
                mergedPhrases.splice(1000);
            }

            savePhrases(mergedPhrases);
            loadPhrases();

            const newPhrasesCount = mergedPhrases.length - currentPhrases.length;
            showAlert(
                newPhrasesCount > 0
                    ? `Импортировано ${newPhrasesCount} новых фраз. Всего: ${mergedPhrases.length}`
                    : 'Все импортированные фразы уже существуют',
                'success'
            );

        } catch (error) {
            console.error('Ошибка импорта:', error);
            showAlert('Ошибка чтения файла. Убедитесь, что это корректный JSON.', 'error');
        }
    };

    reader.onerror = function () {
        showAlert('Ошибка чтения файла', 'error');
    };

    reader.readAsText(file);
}

function clearAllPhrases() {
    if (!confirm('Вы уверены, что хотите удалить ВСЕ фразы? Это действие необратимо.')) {
        return;
    }

    if (!confirm('Действительно удалить все фразы?')) {
        return;
    }

    localStorage.removeItem(PHRASES_KEY);
    loadPhrases();
    showAlert('Все фразы удалены', 'success');
}

function showAlert(message, type) {
    const alert = document.getElementById('alertMessage');
    alert.textContent = message;
    alert.className = `alert-message alert-${type}`;
    alert.style.display = 'block';

    setTimeout(() => {
        alert.style.display = 'none';
    }, 4000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}