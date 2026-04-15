async function loadUserProfile() {
    try {
        const userResponse = await fetch('/api/auth/me');
        if (userResponse.ok) {
            const user = await userResponse.json();
            document.getElementById('userUsername').textContent = user.nickname;
            document.getElementById('userId').textContent = user.id;
            document.getElementById('userCreatedAt').textContent = new Date(user.created_at * 1000).toLocaleDateString();
            document.getElementById('userMiles').textContent = user.miles.toLocaleString();
            document.getElementById('userGroup').textContent = user.user_group + ' | ' + user.subgroup;

            if (user.pfp) {
                document.getElementById('userAvatar').innerHTML = `<img src="${user.pfp}" alt="Avatar" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'">`;
            }
        } else {
            if (userResponse.status === 401) {
                window.location.href = '/login';
                return;
            }
        }

    } catch (error) {
        console.error('Error loading profile:', error);
        document.getElementById('discordStatus').textContent = 'Error loading connection status';
        document.getElementById('robloxStatus').textContent = 'Error loading connection status';
    }
}

function updateDiscordUI(discord) {
    console.log("Discord connection data:", discord);

    if (discord.connected) {
        document.getElementById('discordStatus').textContent = 'Connected';
        document.getElementById('discordConnectBtn').style.display = 'none';
        document.getElementById('discordDisconnectBtn').style.display = 'block';
        document.getElementById('discordDetails').style.display = 'block';

        document.getElementById('discordUsername').textContent = `User ID: ${discord.provider_user_id}`;

        if (discord.connected_at) {
            document.getElementById('discordConnectedSince').textContent = new Date(discord.connected_at * 1000).toLocaleDateString();
        }
    } else {
        document.getElementById('discordStatus').textContent = 'Not connected';
        document.getElementById('discordConnectBtn').style.display = 'block';
        document.getElementById('discordDisconnectBtn').style.display = 'none';
        document.getElementById('discordDetails').style.display = 'none';
    }
}

function updateRobloxUI(roblox) {
    console.log("Roblox connection data:", roblox);

    if (roblox.connected) {
        document.getElementById('robloxStatus').textContent = 'Connected';
        document.getElementById('robloxConnectBtn').style.display = 'none';
        document.getElementById('robloxDisconnectBtn').style.display = 'block';
        document.getElementById('robloxDetails').style.display = 'block';

        if (roblox.connected_at) {
            document.getElementById('robloxConnectedSince').textContent = new Date(roblox.connected_at * 1000).toLocaleDateString();
        }
    } else {
        document.getElementById('robloxStatus').textContent = 'Not connected';
        document.getElementById('robloxConnectBtn').style.display = 'block';
        document.getElementById('robloxDisconnectBtn').style.display = 'none';
        document.getElementById('robloxDetails').style.display = 'none';
    }
}

async function loadDiscordConnection() {
    try {
        console.log("Loading Discord connection...");
        document.getElementById('discordStatus').textContent = 'Checking...';

        const discordResponse = await fetch('/auth/discord/connection');
        if (discordResponse.ok) {
            const discord = await discordResponse.json();
            console.log("Discord connection response:", discord);
            updateDiscordUI(discord);

            if (discord.connected) {
                console.log("Loading Discord user info...");
                const userinfoResponse = await fetch('/auth/discord/userinfo');
                if (userinfoResponse.ok) {
                    const userinfo = await userinfoResponse.json();
                    console.log("Discord userinfo response:", userinfo);

                    if (userinfo.discord_user) {
                        const discordUser = userinfo.discord_user;
                        const username = discordUser.global_name || discordUser.username || `User #${discordUser.id}`;
                        document.getElementById('discordUsername').textContent = username;

                        if (discordUser.avatar && !document.querySelector('#userAvatar img')) {
                            const avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`;
                            document.getElementById('userAvatar').innerHTML = `<img src="${avatarUrl}" alt="Discord Avatar" style="width: 100%; height: 100%; object-fit: cover;">`;
                        }
                    }
                } else {
                    console.log("Failed to load Discord userinfo:", userinfoResponse.status);
                }
            }
        } else {
            console.log("Failed to load Discord connection:", discordResponse.status);
            document.getElementById('discordStatus').textContent = 'Not connected';
        }
    } catch (error) {
        console.error('Error loading Discord connection:', error);
        document.getElementById('discordStatus').textContent = 'Error loading connection';
    }
}

async function loadRobloxConnection() {
    try {
        console.log("Loading Roblox connection...");
        document.getElementById('robloxStatus').textContent = 'Checking...';

        const robloxResponse = await fetch('/auth/roblox/connection');
        if (robloxResponse.ok) {
            const roblox = await robloxResponse.json();
            console.log("Roblox connection response:", roblox);
            updateRobloxUI(roblox);

            if (roblox.connected) {
                console.log("Loading Roblox user info...");
                const userinfoResponse = await fetch('/auth/roblox/userinfo');
                if (userinfoResponse.ok) {
                    const userinfo = await userinfoResponse.json();
                    console.log("Roblox userinfo response:", userinfo);

                    if (userinfo.roblox_user) {
                        const robloxUser = userinfo.roblox_user;
                        const username = robloxUser.name || robloxUser.nickname || robloxUser.preferred_username || `User #${robloxUser.id}`;
                        document.getElementById('robloxUsername').textContent = username;
                    }
                } else {
                    console.log("Failed to load Roblox userinfo:", userinfoResponse.status);
                }
            }
        } else {
            console.log("Failed to load Roblox connection:", robloxResponse.status);
            document.getElementById('robloxStatus').textContent = 'Not connected';
        }
    } catch (error) {
        console.error('Error loading Roblox connection:', error);
        document.getElementById('robloxStatus').textContent = 'Error loading connection';
    }
}

async function resetPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('passwordMessage');

    // Валидация
    if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('New password must be at least 6 characters', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(result.message, 'success');
            // Очищаем поля формы
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showMessage(result.error || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        showMessage('Error changing password', 'error');
    }
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('passwordMessage');
    messageDiv.textContent = message;
    messageDiv.className = type === 'success' ? 'alert alert-success' : 'alert alert-error';
    messageDiv.style.display = 'block';

    // Скрываем сообщение через 5 секунд
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

async function updDiscordManually() {
    try {
        const discordId = document.getElementById('manual_discord_id').value; // убраны скобки ()

        // Проверка на пустое значение
        if (!discordId.trim()) {
            alert('Please enter a Discord ID');
            return;
        }

        const response = await fetch('/api/put/user/0', {
            method: 'PUT',
            body: JSON.stringify({ // Добавлен JSON.stringify
                'manual': true,
                'social_id': discordId
            }),
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            alert('Discord account updated successfully!');
            await loadDiscordConnection();
            await loadUserProfile();
        } else {
            const error = await response.json();
            alert('Failed to update Discord account: ' + error.error);
        }
    } catch (error) {
        console.error('Error updating Discord:', error);
        alert('Error updating Discord account');
    }
}


document.addEventListener('DOMContentLoaded', function () {
    console.log("Profile page loaded, initializing...");

    // Initialize event listeners
    if (document.getElementById('discordDisconnectBtn')) {
        document.getElementById('discordDisconnectBtn').addEventListener('click', async function () {
            if (confirm('Are you sure you want to disconnect your Discord account?')) {
                try {
                    const response = await fetch('/auth/discord/disconnect', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });

                    if (response.ok) {
                        alert('Discord account disconnected successfully!');
                        await loadDiscordConnection();
                        await loadUserProfile();
                    } else {
                        const error = await response.json();
                        alert('Failed to disconnect Discord account: ' + error.error);
                    }
                } catch (error) {
                    console.error('Error disconnecting Discord:', error);
                    alert('Error disconnecting Discord account');
                }
            }
        });
    }

    if (document.getElementById('robloxDisconnectBtn')) {
        document.getElementById('robloxDisconnectBtn').addEventListener('click', async function () {
            if (confirm('Are you sure you want to disconnect your Roblox account? Your Virtual ID will be reset.')) {
                try {
                    const response = await fetch('/auth/roblox/disconnect', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });

                    if (response.ok) {
                        alert('Roblox account disconnected successfully!');
                        await loadRobloxConnection();
                        await loadUserProfile();
                    } else {
                        const error = await response.json();
                        alert('Failed to disconnect Roblox account: ' + error.error);
                    }
                } catch (error) {
                    console.error('Error disconnecting Roblox:', error);
                    alert('Error disconnecting Roblox account');
                }
            }
        });
    }

    if (document.getElementById('resetPasswordBtn')) {
        document.getElementById('resetPasswordBtn').addEventListener('click', resetPassword);
    }

    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').addEventListener('click', async function () {
            if (confirm('Are you sure you want to logout?')) {
                try {
                    const response = await fetch('/api/auth/logout', {
                        method: 'POST'
                    });

                    if (response.ok) {
                        window.location.href = '/';
                    } else {
                        alert('Failed to logout');
                    }
                } catch (error) {
                    console.error('Error logging out:', error);
                    alert('Error logging out');
                }
            }
        });
    }

    if (document.getElementById('myBookingsBtn')) {
        document.getElementById('myBookingsBtn').addEventListener('click', function () {
            window.location.href = '/my-bookings';
        });
    }

    // Check URL parameters for success/error messages
    checkUrlParameters();

    // Load profile data
    loadUserProfile();
    loadDiscordConnection();
    loadRobloxConnection();

    // Setup alerts auto-hide
    setupAlerts();
});

function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success === 'discord_linked' || success === 'roblox_linked') {
        console.log(`Success: ${success}, reloading connections...`);
        loadDiscordConnection();
        loadRobloxConnection();
        loadUserProfile();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function setupAlerts() {
    setTimeout(() => {
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(alert => {
            alert.style.opacity = '0';
            alert.style.transition = 'opacity 0.5s ease';
            setTimeout(() => alert.remove(), 500);
        });
    }, 5000);
}