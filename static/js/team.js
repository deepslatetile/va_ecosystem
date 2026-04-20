let teamMembers = [];

async function loadTeamData() {
    try {
        const container = document.getElementById('teamContainer');
        container.innerHTML = `
            <div class="loading-container">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Загрузка информации о команде...</p>
            </div>
        `;

        const response = await fetch('/api/get/about_us?group=team&active=true');
        if (!response.ok) {
            throw new Error('Не удалось загрузить данные о команде');
        }

        teamMembers = await response.json();
        renderTeam();

    } catch (error) {
        console.error('Ошибка загрузки команды:', error);
        const container = document.getElementById('teamContainer');
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Не удалось загрузить информацию о команде. Пожалуйста, попробуйте позже.</p>
            </div>
        `;
    }
}

function renderTeam() {
    const container = document.getElementById('teamContainer');

    if (teamMembers.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-user-slash"></i>
                <p>Сотрудники не найдены.</p>
            </div>
        `;
        return;
    }

    const departmentFilter = document.getElementById('departmentFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;

    let filteredMembers = [...teamMembers];

    if (departmentFilter !== 'all') {
        filteredMembers = filteredMembers.filter(member =>
            member.subgroup === departmentFilter
        );
    }

    filteredMembers.sort((a, b) => {
        if (sortFilter === 'name') {
            return a.name.localeCompare(b.name);
        } else if (sortFilter === 'experience') {
            return (b.years_experience || 0) - (a.years_experience || 0);
        } else if (sortFilter === 'position') {
            return (a.display_order || 0) - (b.display_order || 0);
        }
        return 0;
    });

    if (filteredMembers.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>Сотрудники, соответствующие вашим фильтрам, не найдены.</p>
                <button onclick="resetFilters()" class="btn-secondary" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Сбросить фильтры
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredMembers.map(member => `
        <div class="team-card">
            <div class="team-image">
                ${member.image ?
            `<img src="${member.image}" alt="${member.name}" loading="lazy">` :
            `<div class="placeholder"><i class="fas fa-user"></i></div>`
        }
            </div>
            <div class="team-content">
                <h3 class="team-title">${member.name}</h3>
                <div class="team-position">
                    <i class="fas fa-briefcase"></i>
                    <span>${member.position || 'Сотрудник'}</span>
                </div>
                ${member.role ? `
                    <div class="team-position" style="margin-top: 0.5rem;">
                        <i class="fas fa-star"></i>
                        <span>${member.role}</span>
                    </div>
                ` : ''}
                <div class="team-details">
                    <div class="detail-item">
                        <span class="label">Отдел:</span>
                        <span>${getDepartmentLabel(member.subgroup)}</span>
                    </div>
                    ${member.years_experience ? `
                        <div class="detail-item">
                            <span class="label">Опыт:</span>
                            <span>${member.years_experience} лет</span>
                        </div>
                    ` : ''}
                </div>
                ${member.description ? `
                    <div class="team-description">
                        ${member.description}
                    </div>
                ` : ''}
                ${member.link ? `
                    <a href="${member.link}" target="_blank" class="btn-secondary" style="margin-top: 1rem; width: 100%; text-align: center;">
                        <i class="fas fa-external-link-alt"></i> Просмотреть профиль
                    </a>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function getDepartmentLabel(department) {
    const departments = {
        'pilots': 'Лётный состав',
        'cabin': 'Бортпроводники',
        'operations': 'Операции',
        'maintenance': 'Техобслуживание',
        'management': 'Руководство',
        'support': 'Вспомогательный персонал'
    };
    return departments[department] || department;
}

function resetFilters() {
    document.getElementById('departmentFilter').value = 'all';
    document.getElementById('sortFilter').value = 'name';
    renderTeam();
}

document.addEventListener('DOMContentLoaded', function () {
    loadTeamData();
    document.getElementById('departmentFilter').addEventListener('change', renderTeam);
    document.getElementById('sortFilter').addEventListener('change', renderTeam);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
});