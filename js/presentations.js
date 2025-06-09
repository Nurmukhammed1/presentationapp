//presentations.js
// Presentation Management
async function loadPresentations() {
    try {
        const response = await fetch('https://collab-slides.runasp.net/api/Presentations');
        if (response.ok) {
            const presentations = await response.json();
            renderPresentations(presentations);
        }
    } catch (error) {
        console.error('Failed to load presentations:', error);
    }
}

function renderPresentations(presentations) {
    const grid = document.getElementById('presentationGrid');
    grid.innerHTML = `
        <div class="presentation-card create-presentation-card" onclick="showCreatePresentationModal()">
            <div class="text-center text-muted">
                <i class="fas fa-plus fa-2x mb-2 d-block"></i>
                <div>Create New Presentation</div>
            </div>
        </div>
    `;
    
    presentations.forEach(presentation => {
        const card = document.createElement('div');
        card.className = 'presentation-card';
        card.onclick = () => joinPresentation(presentation.id);
        card.innerHTML = `
            <div class="presentation-card-body">
                <div class="presentation-title">${presentation.name}</div>
                <div class="presentation-meta">
                    <span><i class="fas fa-user me-1"></i>${presentation.creatorName}</span>
                    <span><i class="fas fa-users me-1"></i>${presentation.activeUsers || 0}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function showCreatePresentationModal() {
    const modal = new bootstrap.Modal(document.getElementById('createPresentationModal'));
    modal.show();
}

async function createPresentation() {
    const name = document.getElementById('presentationName').value.trim();
    if (!name) return;
    
    try {
        const response = await fetch('https://collab-slides.runasp.net/api/Presentations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name, 
                creatorId: currentUser.id 
            })
        });
        
        if (response.ok) {
            const presentation = await response.json();
            bootstrap.Modal.getInstance(document.getElementById('createPresentationModal')).hide();
            document.getElementById('presentationName').value = '';
            joinPresentation(presentation.id);
        }
    } catch (error) {
        console.error('Failed to create presentation:', error);
    }
}

// Initialize connection when user joins a presentation
async function joinPresentation(presentationId) {
    try {
        const response = await fetch(`https://collab-slides.runasp.net/api/Presentations/${presentationId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentPresentation = data.presentation;
            slides = data.slides || [{ id: 1, content: [], index: 0 }];
            users = data.users || [];
            currentSlideIndex = 0;
            
            document.getElementById('presentationTitle').textContent = currentPresentation.name;
            updateSlidesList();
            updateUsersList();
            loadSlide(0);
            showEditor();
            
            // FIXED: Ensure SignalR connection before joining
            if (!isConnected) {
                await connectSignalR();
            }
            
            if (isConnected) {
                await joinPresentationSignalR(currentPresentation.id, currentUser.id);
            }
        }
    } catch (error) {
        console.error('Failed to join presentation:', error);
    }
}