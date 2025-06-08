//app.js
// Updated app initialization
        let currentUser = null;
        let currentPresentation = null;
        let currentSlideIndex = 0;
        let slides = [];
        let users = [];
        let selectedTextBlock = null;
        let dragOffset = { x: 0, y: 0 };
        let isDragging = false;
        let isResizing = false;
        let websocket = null;
        let zoomLevel = 1;

        // Check authentication on page load
        document.addEventListener('DOMContentLoaded', function() {
            checkAuthentication();
        });

        function checkAuthentication() {
            const userData = sessionStorage.getItem('currentUser');
            
            if (!userData) {
                // User not logged in, redirect to login
                window.location.href = 'login.html';
                return;
            }

            try {
                currentUser = JSON.parse(userData);
                initializeApp();
            } catch (error) {
                console.error('Invalid user data:', error);
                window.location.href = 'login.html';
            }
        }

        function initializeApp() {
            // Hide loading screen
            document.getElementById('loadingScreen').classList.add('hidden');
            
            // Show presentation list
            showPresentationList();
            
            // Connect to SignalR
            connectSignalR();
        }

        function showPresentationList() {
            document.getElementById('presentationListScreen').classList.remove('hidden');
            document.getElementById('editorScreen').classList.add('hidden');
            document.getElementById('userNickname').textContent = currentUser.nickname;
            loadPresentations();
        }

        function showEditor() {
            document.getElementById('presentationListScreen').classList.add('hidden');
            document.getElementById('editorScreen').classList.remove('hidden');
            updateUIBasedOnRole();
        }

        function backToPresentations() {
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                    type: 'leave_presentation',
                    presentationId: currentPresentation.id,
                    userId: currentUser.id
                }));
            }
            currentPresentation = null;
            showPresentationList();
        }

        function logout() {
            // Clear user data
            sessionStorage.removeItem('currentUser');
            currentUser = null;
            currentPresentation = null;
            
            // Disconnect SignalR
            if (connection && connection.state === signalR.HubConnectionState.Connected) {
                connection.stop();
            }
            
            // Redirect to login
            window.location.href = 'login.html';
        }

        // Zoom functionality
        function zoomIn() {
            zoomLevel = Math.min(zoomLevel + 0.1, 2);
            applyZoom();
        }

        function zoomOut() {
            zoomLevel = Math.max(zoomLevel - 0.1, 0.5);
            applyZoom();
        }

        function applyZoom() {
            const canvas = document.getElementById('slideCanvas');
            if (canvas) {
                canvas.style.transform = `scale(${zoomLevel})`;
                canvas.style.transformOrigin = 'center center';
            }
        }

        // Save functionality
        async function savePresentation() {
            if (!currentPresentation) return;
            
            saveCurrentSlide();
            
            try {
                const response = await fetch(`https://collab-slides.runasp.net/api/Presentations/${currentPresentation.id}/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        slides: slides,
                        userId: currentUser.id 
                    })
                });
                
                if (response.ok) {
                    const saveBtn = document.querySelector('[onclick="savePresentation()"]');
                    if (saveBtn) {
                        const originalText = saveBtn.innerHTML;
                        saveBtn.innerHTML = '<i class="fas fa-check me-1"></i>Saved';
                        saveBtn.disabled = true;
                        setTimeout(() => {
                            saveBtn.innerHTML = originalText;
                            saveBtn.disabled = false;
                        }, 2000);
                    }
                } else {
                    console.error('Failed to save presentation. Server responded with:', response.status);
                }
            } catch (error) {
                console.error('An error occurred while saving the presentation:', error);
            }
        }

        // Add placeholder functions for missing functionality
        function loadPresentations() {
            // Implementation for loading presentations
            console.log('Loading presentations...');
        }

        function connectSignalR() {
            // Implementation for SignalR connection
            console.log('Connecting to SignalR...');
        }

        function updateUIBasedOnRole() {
            // Implementation for role-based UI updates
            console.log('Updating UI based on role...');
        }

        function saveCurrentSlide() {
            // Implementation for saving current slide
            console.log('Saving current slide...');
        }

        function showCreatePresentationModal() {
            // Implementation for showing create modal
            console.log('Showing create presentation modal...');
        }

        function addTextBlock() {
            // Implementation for adding text block
            console.log('Adding text block...');
        }

        function addSlide() {
            // Implementation for adding slide
            console.log('Adding slide...');
        }

        function startPresentation() {
            // Implementation for starting presentation
            console.log('Starting presentation...');
        }

        function previousSlide() {
            // Implementation for previous slide
            console.log('Previous slide...');
        }

        function nextSlide() {
            // Implementation for next slide
            console.log('Next slide...');
        }

        function exitPresentation() {
            // Implementation for exiting presentation
            console.log('Exiting presentation...');
        }

        function createPresentation() {
            // Implementation for creating presentation
            console.log('Creating presentation...');
        }