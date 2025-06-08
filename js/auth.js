// Login functionality
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const nickname = document.getElementById('nickname').value.trim();
            if (nickname) {
                login(nickname);
            }
        });

        async function login(nickname) {
            const loginBtn = document.querySelector('.btn-login');
            const loginText = document.getElementById('loginText');
            const spinner = document.getElementById('loginSpinner');
            
            // Show loading state
            spinner.classList.remove('hidden');
            loginText.textContent = 'Connecting...';
            loginBtn.disabled = true;
            
            try {
                const response = await fetch('https://collab-slides.runasp.net/api/Auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nickname })
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    
                    // Store user data in sessionStorage for the main app
                    sessionStorage.setItem('currentUser', JSON.stringify(userData));
                    
                    // Show success message briefly
                    loginText.textContent = 'Success!';
                    
                    // Redirect to main application
                    setTimeout(() => {
                        window.location.href = 'index.html'; // or index.html - your main app page
                    }, 1000);
                    
                } else {
                    throw new Error('Login failed');
                }
            } catch (error) {
                // Show error state
                loginText.textContent = 'Connection failed';
                setTimeout(() => {
                    loginText.textContent = 'Enter Workspace';
                    loginBtn.disabled = false;
                }, 2000);
                
                console.error('Login error:', error);
                
                // Optional: Show user-friendly error message
                showError('Unable to connect. Please check your internet connection and try again.');
            } finally {
                spinner.classList.add('hidden');
            }
        }

        function showError(message) {
            // Create and show error toast/alert
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
            errorDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
            errorDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(errorDiv);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 5000);
        }

        // Add some nice keyboard interactions
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target.id === 'nickname') {
                e.preventDefault();
                document.getElementById('loginForm').dispatchEvent(new Event('submit'));
            }
        });

        // Focus the input field when page loads
        window.addEventListener('load', function() {
            document.getElementById('nickname').focus();
        });