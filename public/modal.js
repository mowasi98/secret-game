// Custom Modal System - No Browser Popups!

// Show alert modal
function showAlert(message) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.innerHTML = `
        <div class="custom-modal">
            <div class="modal-content">
                <p>${message}</p>
            </div>
            <button class="modal-btn modal-btn-primary" onclick="this.closest('.custom-modal-overlay').remove()">
                OK
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Remove on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Show confirm modal
function showConfirm(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.innerHTML = `
        <div class="custom-modal">
            <div class="modal-content">
                <p>${message}</p>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn modal-btn-secondary" id="modalCancel">
                    Cancel
                </button>
                <button class="modal-btn modal-btn-primary" id="modalConfirm">
                    Confirm
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Handle confirm
    modal.querySelector('#modalConfirm').addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });
    
    // Handle cancel
    modal.querySelector('#modalCancel').addEventListener('click', () => {
        modal.remove();
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Show error modal (red themed)
function showError(message) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.innerHTML = `
        <div class="custom-modal modal-error">
            <div class="modal-icon">⚠️</div>
            <div class="modal-content">
                <p>${message}</p>
            </div>
            <button class="modal-btn modal-btn-primary" onclick="this.closest('.custom-modal-overlay').remove()">
                Got it
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Remove on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}
