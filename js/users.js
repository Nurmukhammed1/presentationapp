// User Management
function updateUsersList() {
    const usersList = document.getElementById('usersList');
    const userCount = document.getElementById('userCount');
    
    userCount.textContent = users.length;
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        
        const avatarColor = `hsl(${user.nickname.length * 30 % 360}, 70%, 50%)`;
        const initial = user.nickname.charAt(0).toUpperCase();
        
        userElement.innerHTML = `
            <div class="user-info">
                <div class="user-avatar" style="background-color: ${avatarColor}">
                    ${initial}
                </div>
                <div>
                    <div class="user-name">${user.nickname}</div>
                    <div class="user-role">
                        <span class="role-badge ${user.role}">${user.role}</span>
                    </div>
                </div>
            </div>
            ${canManageUsers() && user.id !== currentUser.id ? `
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                        <i class="fas fa-cog"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" onclick="changeUserRole('${user.id}', 'editor')">Make Editor</a></li>
                        <li><a class="dropdown-item" href="#" onclick="changeUserRole('${user.id}', 'viewer')">Make Viewer</a></li>
                    </ul>
                </div>
            ` : ''}
        `;
        
        usersList.appendChild(userElement);
    });
}

async function changeUserRole(userId, newRole) {
    try {
        const response = await fetch(`https://collab-slides.runasp.net/api/Presentations/${currentPresentation.id}/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                role: newRole,
                requesterId: currentUser.id 
            })
        });
        
        if (response.ok) {
            // Role change will be handled by WebSocket message
        }
    } catch (error) {
        console.error('Failed to change user role:', error);
    }
}

// Permission Management
function canEdit() {
    const currentUserData = users.find(u => u.id === currentUser.id);
    return currentUserData && (currentUserData.role === 'creator' || currentUserData.role === 'editor');
}

function canManageUsers() {
    const currentUserData = users.find(u => u.id === currentUser.id);
    return currentUserData && currentUserData.role === 'creator';
}

function updateUIBasedOnRole() {
    const canEditContent = canEdit();
    const canManage = canManageUsers();
    
    // Show/hide editing tools
    document.getElementById('addTextBtn').style.display = canEditContent ? 'inline-block' : 'none';
    document.getElementById('addSlideBtn').style.display = canManage ? 'inline-block' : 'none';
    
    // Update text blocks editability
    document.querySelectorAll('.text-content').forEach(el => {
        el.contentEditable = canEditContent;
    });
    
    // Update text blocks interactivity
    document.querySelectorAll('.text-block').forEach(el => {
        el.style.cursor = canEditContent ? 'move' : 'default';
    });
}