async function loadPageContent() {
    try {
        const response = await fetch('/api/get/page_content/tos');

        if (!response.ok) {
            throw new Error('Ошибка загрузки страницы');
        }

        const pageData = await response.json();

        document.getElementById('pageTitle').textContent = pageData.page_display || 'Условия использования';
        document.getElementById('lastUpdated').textContent = `Последнее обновление: ${new Date(pageData.last_updated * 1000).toLocaleDateString()}`;

        const contentDiv = document.getElementById('pageContent');
        if (pageData.content) {
            contentDiv.innerHTML = pageData.content;
            contentDiv.classList.remove('content-loading');
        } else {
            console.error('Ошибка загрузки страницы:', error);
            const contentDiv = document.getElementById('pageContent');
            contentDiv.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Не удалось загрузить содержимое</h3>
                    <p>We're having trouble loading the Terms of Service. Please try again later.</p>
                    <a href="/" class="back-link">
                        <i class="fas fa-arrow-left"></i> На главную
                    </a>
                </div>
            `;
            contentDiv.classList.remove('content-loading');
        }

    } catch (error) {
        console.error('Ошибка загрузки содержимого страницы:', error);
        const contentDiv = document.getElementById('pageContent');
        contentDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>Не удалось загрузить содержимое</h3>
                <p>We're having trouble loading the Terms of Service. Please try again later.</p>
                <a href="/" class="back-link">
                    <i class="fas fa-arrow-left"></i> На главную
                </a>
            </div>
        `;
        contentDiv.classList.remove('content-loading');
    }
}

document.addEventListener('DOMContentLoaded', loadPageContent);