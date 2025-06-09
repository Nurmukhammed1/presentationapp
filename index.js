

// FIXED: Better user management with real-time updates
function handleUserJoined(user) {
    const existingUser = users.find(u => u.id === user.id);
    if (!existingUser) {
        users.push(user);
        updateUsersList();
        showUserNotification(`${user.nickname} joined the presentation`, 'success');
    }
}

function handleUserLeft(userId) {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
        const user = users[userIndex];
        users.splice(userIndex, 1);
        updateUsersList();
        showUserNotification(`${user.nickname} left the presentation`, 'info');
    }
}

function showUserNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 60px;
        right: 10px;
        background: ${type === 'success' ? '#28a745' : '#17a2b8'};
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.style.opacity = '1', 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

