// First, include SignalR library in your HTML:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/7.0.0/signalr.min.js"></script>

let connection = null;

// SignalR Connection
function connectSignalR() {
    // Fixed: Use your actual backend URL instead of frontend server
    const hubUrl = 'https://collab-slides.runasp.net/presentationHub';
    
    connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect([0, 2000, 10000, 30000]) // Retry intervals
        .build();
    
    // Set up event handlers
    setupSignalRHandlers();
    
    // Start connection
    connection.start()
        .then(() => {
            console.log('SignalR connected');
            if (currentPresentation) {
                joinPresentation(currentPresentation.id, currentUser.id);
            }
        })
        .catch(err => {
            console.error('SignalR connection failed:', err);
            // Retry after 5 seconds
            setTimeout(connectSignalR, 5000);
        });
}

function setupSignalRHandlers() {
    // Handle incoming messages from SignalR Hub
    connection.on("UserJoined", (data) => {
        handleSignalRMessage({
            type: 'user_joined',
            user: data
        });
    });
    
    connection.on("UserLeft", (data) => {
        handleSignalRMessage({
            type: 'user_left',
            userId: data.userId
        });
    });
    
    connection.on("TextBlockUpdated", (data) => {
        handleSignalRMessage({
            type: 'text_block_updated',
            textBlock: data.textBlock
        });
    });
    
    connection.on("Error", (error) => {
        console.error('SignalR Error:', error);
    });
    
    // Connection event handlers
    connection.onclose((error) => {
        console.log('SignalR disconnected:', error);
        // Automatic reconnection is handled by withAutomaticReconnect()
    });
    
    connection.onreconnecting((error) => {
        console.log('SignalR reconnecting:', error);
    });
    
    connection.onreconnected((connectionId) => {
        console.log('SignalR reconnected:', connectionId);
        // Rejoin presentation after reconnection
        if (currentPresentation) {
            joinPresentation(currentPresentation.id, currentUser.id);
        }
    });
}

// SignalR method calls (OUTGOING)
async function joinPresentation(presentationId, userId) {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
        try {
            await connection.invoke("JoinPresentation", presentationId, userId);
            console.log('Joined presentation:', presentationId);
        } catch (err) {
            console.error('Failed to join presentation:', err);
        }
    }
}

async function leavePresentation(presentationId, userId) {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
        try {
            await connection.invoke("LeavePresentation", presentationId, userId);
            console.log('Left presentation:', presentationId);
        } catch (err) {
            console.error('Failed to leave presentation:', err);
        }
    }
}

// OUTGOING: Send text block update to other users
async function sendTextBlockUpdate(textBlock) {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
        try {
            await connection.invoke("TextBlockUpdated", 
                currentPresentation.id, 
                currentSlideIndex, 
                textBlock, 
                currentUser.id
            );
            console.log('Text block update sent:', textBlock.id);
        } catch (err) {
            console.error('Failed to update text block:', err);
        }
    }
}

// Handle INCOMING messages from SignalR Hub
function handleSignalRMessage(data) {
    console.log('Received SignalR message:', data.type, data);
    
    switch(data.type) {
        case 'slide_updated':
            if (data.slideIndex !== currentSlideIndex) return;
            updateSlideContent(data.content);
            break;
        case 'text_block_updated':
            // FIXED: Call the function that handles incoming updates, not the one that sends them
            if (typeof updateTextBlockFromRemote === 'function') {
                updateTextBlockFromRemote(data.textBlock);
            } else {
                console.warn('updateTextBlockFromRemote function not found');
            }
            break;
        case 'user_joined':
            if (typeof users !== 'undefined') {
                users.push(data.user);
                if (typeof updateUsersList === 'function') {
                    updateUsersList();
                }
            }
            break;
        case 'user_left':
            if (typeof users !== 'undefined') {
                users = users.filter(u => u.id !== data.userId);
                if (typeof updateUsersList === 'function') {
                    updateUsersList();
                }
            }
            break;
        case 'user_role_changed':
            if (typeof users !== 'undefined') {
                const user = users.find(u => u.id === data.userId);
                if (user) {
                    user.role = data.role;
                    if (typeof updateUsersList === 'function') {
                        updateUsersList();
                    }
                    if (typeof updateUIBasedOnRole === 'function') {
                        updateUIBasedOnRole();
                    }
                }
            }
            break;
        case 'slide_added':
            if (typeof slides !== 'undefined') {
                slides.push(data.slide);
                if (typeof updateSlidesList === 'function') {
                    updateSlidesList();
                }
            }
            break;
        case 'slide_removed':
            if (typeof slides !== 'undefined') {
                slides.splice(data.slideIndex, 1);
                if (currentSlideIndex >= slides.length) {
                    currentSlideIndex = Math.max(0, slides.length - 1);
                }
                if (typeof updateSlidesList === 'function') {
                    updateSlidesList();
                }
                if (typeof loadSlide === 'function') {
                    loadSlide(currentSlideIndex);
                }
            }
            break;
        default:
            console.warn('Unknown SignalR message type:', data.type);
    }
}

// Initialize connection when page loads
document.addEventListener('DOMContentLoaded', function() {
    connectSignalR();
});

// Clean up connection when page unloads
window.addEventListener('beforeunload', function() {
    if (connection) {
        connection.stop();
    }
});

// Helper function for text block changes
function onTextBlockChanged(textBlock) {
    // Update locally first for immediate feedback
    if (typeof updateTextBlockLocal === 'function') {
        updateTextBlockLocal(textBlock.id);
    }
    
    // Then send to SignalR for other users
    sendTextBlockUpdate(textBlock);
}