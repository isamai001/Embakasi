// Constants
const VOTE_PRICE = 20; // 20 KSH per vote
const ACCOUNT_NUMBER = 'EMBAKASI2023'; // Should match backend
const API_BASE_URL = 'http://localhost:3000/api'; // Update with your deployed backend URL

// App State
const state = {
    contestants: [],
    currentVoteContestant: null,
    currentVoteCount: 1,
    activeSharePopup: null,
    isLoading: true,
    votingEnabled: true // Will be updated from API
};

// DOM Elements
const elements = {
    contestantsGrid: document.getElementById('contestantsGrid'),
    topTenContainer: document.querySelector('.top-ten-container'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    currentTime: document.getElementById('currentTime'),
    searchInput: document.getElementById('searchInput'),
    searchButton: document.getElementById('searchButton'),
    registrationModal: document.getElementById('registrationModal'),
    paymentModal: document.getElementById('paymentModal'),
    registerBtn: document.getElementById('registerBtn'),
    closeRegisterModal: document.getElementById('closeRegisterModal'),
    closePaymentModal: document.getElementById('closePaymentModal'),
    registrationForm: document.getElementById('registrationForm'),
    photoUpload: document.getElementById('photoUpload'),
    uploadProgress: document.getElementById('uploadProgress'),
    progressBar: document.getElementById('progressBar'),
    uploadStatus: document.getElementById('uploadStatus'),
    paymentSteps: document.getElementById('paymentSteps').children,
    voteCountElement: document.getElementById('voteCount'),
    totalAmountElement: document.getElementById('totalAmount'),
    paymentAmountElement: document.getElementById('paymentAmount'),
    decrementVotesBtn: document.getElementById('decrementVotes'),
    incrementVotesBtn: document.getElementById('incrementVotes'),
    proceedToPaymentBtn: document.getElementById('proceedToPayment'),
    backToStep1Btn: document.getElementById('backToStep1'),
    processPaymentBtn: document.getElementById('processPayment'),
    closeAfterSuccessBtn: document.getElementById('closeAfterSuccess'),
    voteContestantPhoto: document.getElementById('voteContestantPhoto'),
    voteContestantName: document.getElementById('voteContestantName'),
    processingContestant: document.getElementById('processingContestant'),
    processingVotes: document.getElementById('processingVotes'),
    processingAmount: document.getElementById('processingAmount'),
    successContestant: document.getElementById('successContestant'),
    successVotes: document.getElementById('successVotes'),
    mpesaPhone: document.getElementById('mpesaPhone'),
    votingDisabledMessage: document.getElementById('votingDisabledMessage'),
    mpesaPhoneInput: document.getElementById('mpesaPhoneInput') || document.getElementById('mpesaPhone'),
    candidateSelect: document.getElementById('candidateSelect')
};

// Initialize the application
async function init() {
    updateTime();
    setInterval(updateTime, 1000);
    
    await checkVotingStatus();
    await loadContestants();
    setupEventListeners();
    updateVotingUI();
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target === elements.registrationModal) {
            closeModal(elements.registrationModal);
        }
        if (e.target === elements.paymentModal) {
            closeModal(elements.paymentModal);
        }
        
        // Close share popups when clicking outside
        if (!e.target.closest('.share-btn') && !e.target.closest('.share-popup')) {
            closeSharePopup();
        }
    });
}

// Check voting status from backend
async function checkVotingStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/voting`);
        const data = await response.json();
        state.votingEnabled = data.enabled !== false;
    } catch (error) {
        console.error('Error checking voting status:', error);
        state.votingEnabled = false;
    }
}

// Update current time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    elements.currentTime.textContent = timeString;
}

// Load contestants data from backend
async function loadContestants() {
    state.isLoading = true;
    elements.loadingIndicator.classList.remove('hidden');
    
    try {
        const response = await fetch(`${API_BASE_URL}/contestants`);
        if (!response.ok) throw new Error('Failed to fetch contestants');
        state.contestants = await response.json();
        
        if (state.contestants.length === 0) {
            showNoContestantsMessage();
        } else {
            renderContestants();
            renderTopTen();
        }
    } catch (error) {
        console.error('Error loading contestants:', error);
        showNoContestantsMessage();
    } finally {
        state.isLoading = false;
        elements.loadingIndicator.classList.add('hidden');
    }
}

function showNoContestantsMessage() {
    elements.contestantsGrid.innerHTML = `
        <div class="col-span-full text-center py-8">
            <i class="fas fa-users text-4xl text-pink-500 mb-4"></i>
            <h3 class="text-xl font-bold text-gray-700">No contestants available yet</h3>
            <p class="text-gray-600 mt-2">Check back later or register to participate</p>
        </div>
    `;
    elements.topTenContainer.innerHTML = '';
}

// Render contestants to the grid
function renderContestants(filter = '') {
    elements.contestantsGrid.innerHTML = '';
    
    const filteredContestants = state.contestants.filter(contestant => 
        (contestant.name.toLowerCase().includes(filter.toLowerCase()) || 
        contestant.category.toLowerCase().includes(filter.toLowerCase())) &&
        contestant.status === 'approved'
    );
    
    if (filteredContestants.length === 0) {
        elements.contestantsGrid.innerHTML = `
            <div class="col-span-full text-center py-8">
                <i class="fas fa-search text-4xl text-pink-500 mb-4"></i>
                <h3 class="text-xl font-bold text-gray-700">No contestants found</h3>
                <p class="text-gray-600 mt-2">Try a different search term</p>
            </div>
        `;
        return;
    }
    
    filteredContestants.forEach(contestant => {
        const card = document.createElement('div');
        card.className = 'contestant-card will-change';
        card.innerHTML = `
            <div class="relative h-64 overflow-hidden">
                <img src="${contestant.photo}" alt="${contestant.name}" 
                     class="w-full h-full object-cover lazy-load" 
                     loading="lazy" 
                     onload="this.classList.add('loaded')">
                <img src="images/mr and miss embakasi on top img.jpg" 
                     alt="Mr & Miss Embakasi" 
                     class="absolute top-2 left-2 w-20 h-20 object-contain background-transparent">
                
                <button class="share-btn" data-id="${contestant.id}">
                    <i class="fas fa-share-alt"></i>
                </button>
                
                <div class="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                    <div class="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                        ${contestant.category === 'mr' ? 'Mr. Embakasi' : 'Miss Embakasi'}
                    </div>
                    <div class="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                        <i class="fas fa-heart mr-1"></i> ${contestant.votes.toLocaleString()}
                    </div>
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-lg mb-2">${contestant.name}</h3>
                <button class="vote-button w-full" 
                        data-id="${contestant.id}" 
                        data-name="${contestant.name}" 
                        data-photo="${contestant.photo}"
                        ${!state.votingEnabled ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    <i class="fas fa-vote-yea mr-2"></i> Vote Now (${VOTE_PRICE} KSH)
                </button>
            </div>
        `;
        
        elements.contestantsGrid.appendChild(card);
    });
    
    // Lazy load images
    lazyLoadImages();
}

// Render top ten contestants
async function renderTopTen() {
    elements.topTenContainer.innerHTML = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/contestants/top`);
        if (!response.ok) throw new Error('Failed to fetch top contestants');
        const topTen = await response.json();
        
        if (topTen.length === 0) return;
        
        // Duplicate for seamless scrolling
        const doubledTopTen = [...topTen, ...topTen];
        
        doubledTopTen.forEach((contestant, index) => {
            const item = document.createElement('div');
            item.className = 'top-ten-item';
            item.innerHTML = `
                <div class="w-8 h-8 rounded-full overflow-hidden border-2 border-pink-500 flex-shrink-0">
                    <img src="${contestant.photo}" alt="${contestant.name}" 
                         class="w-full h-full object-cover" loading="lazy">
                </div>
                <div class="ml-2 flex items-center">
                    <span class="font-bold text-pink-500 text-xs mr-1">#${(index % 10) + 1}</span>
                    <span class="font-medium text-xs whitespace-nowrap">${contestant.name}</span>
                    <span class="ml-2 text-xs bg-pink-100 px-1.5 py-0.5 rounded-full flex items-center">
                        <i class="fas fa-heart text-pink-500 mr-1 text-xs"></i> ${contestant.votes.toLocaleString()}
                    </span>
                </div>
            `;
            
            elements.topTenContainer.appendChild(item);
        });
    } catch (error) {
        console.error('Error rendering top ten:', error);
    }
}

// Update voting UI based on enabled/disabled state
function updateVotingUI() {
    if (!state.votingEnabled) {
        if (elements.votingDisabledMessage) {
            elements.votingDisabledMessage.classList.remove('hidden');
        }
        document.querySelectorAll('.vote-button').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    } else {
        if (elements.votingDisabledMessage) {
            elements.votingDisabledMessage.classList.add('hidden');
        }
        document.querySelectorAll('.vote-button').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
    }
}

// Lazy load images
function lazyLoadImages() {
    const lazyImages = document.querySelectorAll('.lazy-load');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.getAttribute('src');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '100px 0px',
        threshold: 0.01
    });
    
    lazyImages.forEach(img => observer.observe(img));
}

// Setup event listeners
function setupEventListeners() {
    // Registration modal
    elements.registerBtn.addEventListener('click', () => openModal(elements.registrationModal));
    elements.closeRegisterModal.addEventListener('click', () => closeModal(elements.registrationModal));
    
    // Payment modal
    elements.closePaymentModal.addEventListener('click', () => {
        closeModal(elements.paymentModal);
        resetPaymentSteps();
    });
    
    // Registration form
    elements.registrationForm.addEventListener('submit', handleRegistrationSubmit);
    elements.photoUpload.addEventListener('change', handlePhotoUpload);
    
    // Search functionality
    elements.searchInput.addEventListener('input', () => {
        renderContestants(elements.searchInput.value);
    });
    elements.searchButton.addEventListener('click', () => {
        renderContestants(elements.searchInput.value);
    });
    
    // Contestant grid events (delegated)
    elements.contestantsGrid.addEventListener('click', (e) => {
        // Vote button
        if (e.target.closest('.vote-button') && state.votingEnabled) {
            const button = e.target.closest('.vote-button');
            handleVoteButtonClick(button);
        }
        
        // Share button
        if (e.target.closest('.share-btn')) {
            const button = e.target.closest('.share-btn');
            handleShareButtonClick(button);
        }
    });
    
    // Payment handlers
    elements.decrementVotesBtn.addEventListener('click', () => {
        if (state.currentVoteCount > 1) {
            state.currentVoteCount--;
            updateVoteCount();
        }
    });
    
    elements.incrementVotesBtn.addEventListener('click', () => {
        state.currentVoteCount++;
        updateVoteCount();
    });
    
    elements.proceedToPaymentBtn.addEventListener('click', () => {
        showPaymentStep(2);
    });
    
    elements.backToStep1Btn.addEventListener('click', () => {
        showPaymentStep(1);
    });
    
    elements.processPaymentBtn.addEventListener('click', handlePaymentSubmit);
    elements.closeAfterSuccessBtn.addEventListener('click', handlePaymentSuccessClose);
}

// Handle vote button click
function handleVoteButtonClick(button) {
    if (!state.votingEnabled) {
        alert('Voting is currently disabled by the administrator.');
        return;
    }
    
    state.currentVoteContestant = {
        id: button.dataset.id,
        name: button.dataset.name,
        photo: button.dataset.photo
    };
    
    elements.voteContestantPhoto.src = state.currentVoteContestant.photo;
    elements.voteContestantName.textContent = state.currentVoteContestant.name;
    
    state.currentVoteCount = 1;
    updateVoteCount();
    
    openModal(elements.paymentModal);
}

// Handle share button click
function handleShareButtonClick(button) {
    closeSharePopup();
    
    const contestantId = button.dataset.id;
    const contestant = state.contestants.find(c => c.id == contestantId);
    
    if (!contestant) return;
    
    // Create a new share popup
    const popup = document.createElement('div');
    popup.innerHTML = document.getElementById('sharePopupTemplate').innerHTML;
    const sharePopup = popup.firstElementChild;
    
    // Position it near the share button
    button.parentNode.appendChild(sharePopup);
    sharePopup.classList.add('active');
    state.activeSharePopup = sharePopup;
    
    // Add event listeners to share options
    const shareOptions = sharePopup.querySelectorAll('.share-option');
    shareOptions.forEach(option => {
        option.addEventListener('click', () => {
            shareContestant(contestant, option.classList.contains('facebook') ? 'facebook' :
                                          option.classList.contains('twitter') ? 'twitter' :
                                          option.classList.contains('whatsapp') ? 'whatsapp' :
                                          option.classList.contains('instagram') ? 'instagram' : 'link');
            closeSharePopup();
        });
    });
}

// Close active share popup
function closeSharePopup() {
    if (state.activeSharePopup) {
        state.activeSharePopup.classList.remove('active');
        setTimeout(() => {
            if (state.activeSharePopup && state.activeSharePopup.parentNode) {
                state.activeSharePopup.parentNode.removeChild(state.activeSharePopup);
            }
            state.activeSharePopup = null;
        }, 300);
    }
}

// Share contestant on social media
function shareContestant(contestant, platform = 'link') {
    const shareUrl = window.location.href;
    const shareText = `Vote for ${contestant.name} (${contestant.category === 'mr' ? 'Mr.' : 'Miss.'} Embakasi) in the Mr. & Miss Embakasi competition!`;
    
    switch (platform) {
        case 'facebook':
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
            break;
        case 'twitter':
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
            break;
        case 'whatsapp':
            window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
            break;
        case 'instagram':
            if (navigator.share) {
                navigator.share({
                    title: `Vote for ${contestant.name}`,
                    text: shareText,
                    url: shareUrl
                }).catch(err => console.log('Error sharing:', err));
            } else {
                window.open(`https://www.instagram.com/?url=${encodeURIComponent(shareUrl)}`, '_blank');
            }
            break;
        case 'link':
            navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
                .then(() => alert('Link copied to clipboard!'))
                .catch(() => {
                    const textArea = document.createElement('textarea');
                    textArea.value = `${shareText} ${shareUrl}`;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert('Link copied to clipboard!');
                });
            break;
    }
}

// Update vote count display
function updateVoteCount() {
    elements.voteCountElement.textContent = state.currentVoteCount;
    const totalAmount = state.currentVoteCount * VOTE_PRICE;
    elements.totalAmountElement.textContent = `${totalAmount} KSH`;
    elements.paymentAmountElement.textContent = `${totalAmount} KSH`;
}

// Show payment step
function showPaymentStep(stepNumber) {
    for (let i = 0; i < elements.paymentSteps.length; i++) {
        elements.paymentSteps[i].classList.remove('active');
    }
    
    document.getElementById(`step${stepNumber}`).classList.add('active');
    
    // If showing processing step, simulate payment
    if (stepNumber === 3) {
        elements.processingContestant.textContent = state.currentVoteContestant.name;
        elements.processingVotes.textContent = state.currentVoteCount;
        elements.processingAmount.textContent = `${state.currentVoteCount * VOTE_PRICE} KSH`;
    }
}

// Reset payment steps to initial state
function resetPaymentSteps() {
    showPaymentStep(1);
    state.currentVoteCount = 1;
    updateVoteCount();
    elements.mpesaPhone.value = '';
}

// Handle registration form submission
async function handleRegistrationSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(elements.registrationForm);
    const file = elements.photoUpload.files[0];
    
    // Validate form
    if (!formData.get('fullName') || !formData.get('phone') || !formData.get('category') || !file) {
        alert('Please fill in all required fields and upload a photo');
        return;
    }
    
    // Show upload progress
    elements.uploadProgress.classList.remove('hidden');
    elements.uploadStatus.textContent = 'Uploading...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/contestants/register`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Registration failed');
        }
        
        const result = await response.json();
        
        // Complete upload
        elements.uploadStatus.textContent = 'Upload complete!';
        elements.progressBar.style.width = '100%';
        
        setTimeout(() => {
            alert(result.message);
            closeModal(elements.registrationModal);
            elements.registrationForm.reset();
            elements.uploadProgress.classList.add('hidden');
            elements.progressBar.style.width = '0%';
        }, 1000);
    } catch (error) {
        alert('Registration failed: ' + error.message);
        elements.uploadProgress.classList.add('hidden');
        elements.progressBar.style.width = '0%';
    }
}

// Handle photo upload
function handlePhotoUpload(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image.*')) {
        alert('Please upload an image file');
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
    }
    
    // Display file name
    elements.uploadStatus.textContent = `Selected: ${file.name}`;
    elements.uploadProgress.classList.remove('hidden');
}

// Handle payment submission
async function handlePaymentSubmit() {
    try {
        if (!state.votingEnabled) {
            throw new Error('Voting is currently disabled by the administrator.');
        }
        
        const phone = elements.mpesaPhone.value;
        
        if (!phone || !phone.match(/^254[17]\d{8}$/)) {
            throw new Error('Please enter a valid Kenyan phone number starting with 254');
        }
        
        // Show processing step
        showPaymentStep(3);
        
        // Send vote to backend
        const response = await fetch(`${API_BASE_URL}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contestantId: state.currentVoteContestant.id,
                votes: state.currentVoteCount,
                phone: phone
            })
        });
        
        if (!response.ok) {
            throw new Error('Vote processing failed');
        }
        
        const result = await response.json();
        
        // Show success step
        setTimeout(async () => {
            showPaymentStep(4);
            elements.successContestant.textContent = state.currentVoteContestant.name;
            elements.successVotes.textContent = state.currentVoteCount;
            
            // Refresh contestants data
            await loadContestants();
            renderTopTen();
        }, 3000);
    } catch (error) {
        alert(error.message);
        showPaymentStep(2); // Go back to payment details step
    }
}

// Handle payment success close
async function handlePaymentSuccessClose() {
    closeModal(elements.paymentModal);
    resetPaymentSteps();
    alert(`Success! ${state.currentVoteCount} votes added to ${state.currentVoteContestant.name}`);
    await loadContestants(); // Refresh data
}

// Open modal
function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);