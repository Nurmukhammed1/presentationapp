// FIXED: Real-time SignalR Implementation
let connection = null;
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Enhanced SignalR Connection with better error handling
async function connectSignalR() {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
        return; // Already connected
    }

    const hubUrl = 'https://collab-slides.runasp.net/presentationHub';
    
    connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
            // Add authentication if needed
            accessTokenFactory: () => {
                // Return your auth token here if needed
                return sessionStorage.getItem('authToken');
            }
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();
    
    setupSignalRHandlers();
    
    try {
        await connection.start();
        console.log('SignalR connected successfully');
        isConnected = true;
        reconnectAttempts = 0;
        
        // FIXED: Join presentation AFTER connection is established
        if (currentPresentation) {
            await joinPresentationSignalR(currentPresentation.id, currentUser.id);
        }
    } catch (err) {
        console.error('SignalR connection failed:', err);
        isConnected = false;
        handleConnectionFailure();
    }
}

function setupSignalRHandlers() {
    // FIXED: Better event handling with proper error checking
    connection.on("UserJoined", (data) => {
        console.log('User joined:', data);
        if (data && data.user) {
            handleUserJoined(data.user);
        }
    });
    
    connection.on("UserLeft", (data) => {
        console.log('User left:', data);
        if (data && data.userId) {
            handleUserLeft(data.userId);
        }
    });
    
    // FIXED: Real-time text block updates
    connection.on("TextBlockUpdated", (data) => {
        console.log('Text block updated:', data);
        if (data && data.textBlock && data.userId !== currentUser.id) {
            // Only update if it's from another user
            updateTextBlockFromRemote(data.textBlock);
        }
    });
    
    // FIXED: Add missing slide synchronization events
    connection.on("SlideChanged", (data) => {
        if (data && data.slideIndex !== undefined) {
            handleSlideChanged(data.slideIndex);
        }
    });
    
    connection.on("SlideContentUpdated", (data) => {
        if (data && data.slideIndex === currentSlideIndex) {
            handleSlideContentUpdate(data.content);
        }
    });
    
    connection.on("PresentationUpdated", (data) => {
        if (data) {
            handlePresentationUpdate(data);
        }
    });
    
    // Connection state handlers
    connection.onclose((error) => {
        console.log('SignalR disconnected:', error);
        isConnected = false;
        handleConnectionFailure();
    });
    
    connection.onreconnecting((error) => {
        console.log('SignalR reconnecting:', error);
        showConnectionStatus('Reconnecting...');
    });
    
    connection.onreconnected((connectionId) => {
        console.log('SignalR reconnected:', connectionId);
        isConnected = true;
        showConnectionStatus('Connected');
        
        // FIXED: Rejoin presentation and sync state after reconnection
        if (currentPresentation) {
            joinPresentationSignalR(currentPresentation.id, currentUser.id);
            syncCurrentState();
        }
    });
}

// FIXED: Proper SignalR method calls with error handling
async function joinPresentationSignalR(presentationId, userId) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        console.warn('Cannot join presentation - SignalR not connected');
        return false;
    }
    
    try {
        await connection.invoke("JoinPresentation", presentationId, userId);
        console.log('Successfully joined presentation:', presentationId);
        return true;
    } catch (err) {
        console.error('Failed to join presentation:', err);
        return false;
    }
}

async function leavePresentationSignalR(presentationId, userId) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        return;
    }
    
    try {
        await connection.invoke("LeavePresentation", presentationId, userId);
        console.log('Left presentation:', presentationId);
    } catch (err) {
        console.error('Failed to leave presentation:', err);
    }
}

// FIXED: Real-time text block updates with optimistic updates
let pendingUpdates = new Map();
let updateQueue = [];

// FIXED: Updated sendTextBlockUpdate function to match C# hub expectations
async function sendTextBlockUpdate(textBlock) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        console.warn('Cannot send update - SignalR not connected');
        // Queue the update for when connection is restored
        queueUpdate('textBlock', textBlock);
        return;
    }
    
    try {
        // Add to pending updates to prevent echo
        pendingUpdates.set(textBlock.id, Date.now());
        
        // FIXED: Send as a single object that matches TextBlockUpdateData structure
        const updateData = {
            presentationId: currentPresentation.id,
            slideIndex: currentSlideIndex,
            textBlock: textBlock,
            userId: currentUser.id
        };
        
        await connection.invoke("UpdateTextBlock", updateData);
        
        console.log('Text block update sent:', textBlock.id);
        
        // Remove from pending after a delay
        setTimeout(() => {
            pendingUpdates.delete(textBlock.id);
        }, 1000);
        
    } catch (err) {
        console.error('Failed to send text block update:', err);
        pendingUpdates.delete(textBlock.id);
        queueUpdate('textBlock', textBlock);
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