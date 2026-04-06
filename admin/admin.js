class ArtistAdmin {
    constructor() {
        this.token = localStorage.getItem('artistToken');
        this.baseURL = '/api';
        this.currentArtworkId = null;
        
        this.init();
    }

    init() {
        if (this.token) {
            this.showDashboard();
            this.loadProfile();
            this.loadDashboardStats();
        } else {
            this.showLogin();
        }

        this.bindEvents();
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Navigation
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(e.target.dataset.section);
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Artwork form
        document.getElementById('artworkForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveArtwork();
        });

        // Profile form
        document.getElementById('profileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        // Image preview
        document.getElementById('artworkImage').addEventListener('change', (e) => {
            this.previewImage(e.target.files[0]);
        });

        // Cancel edit
        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.resetArtworkForm();
            this.showSection('artworks');
        });
    }

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('artistToken', this.token);
                this.showDashboard();
                this.loadProfile();
                this.loadDashboardStats();
            } else {
                this.showError('loginError', data.message);
            }
        } catch (error) {
            this.showError('loginError', 'Login failed. Please try again.');
        }
    }

    logout() {
        localStorage.removeItem('artistToken');
        this.token = null;
        this.showLogin();
    }

    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        document.getElementById(sectionName).classList.add('active');

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Load section-specific data
        if (sectionName === 'artworks') {
            this.loadArtworks();
        } else if (sectionName === 'add-artwork') {
            this.resetArtworkForm();
        }
    }

    async loadProfile() {
        try {
            const response = await fetch(`${this.baseURL}/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const artist = await response.json();
                document.getElementById('artistName').textContent = `Welcome, ${artist.name}`;
                this.populateProfileForm(artist);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    async loadDashboardStats() {
        try {
            const response = await fetch(`${this.baseURL}/artworks`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const artworks = data.artworks;

                const total = artworks.length;
                const published = artworks.filter(a => a.isPublished).length;
                const drafts = total - published;
                const totalViews = artworks.reduce((sum, a) => sum + (a.viewCount || 0), 0);

                document.getElementById('totalArtworks').textContent = total;
                document.getElementById('publishedArtworks').textContent = published;
                document.getElementById('draftArtworks').textContent = drafts;
                document.getElementById('totalViews').textContent = totalViews;
            }
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        }
    }

    async loadArtworks() {
        try {
            const response = await fetch(`${this.baseURL}/artworks`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayArtworks(data.artworks);
            }
        } catch (error) {
            console.error('Failed to load artworks:', error);
        }
    }

    displayArtworks(artworks) {
        const container = document.getElementById('artworksList');
        
        if (artworks.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-center">No artworks yet. <a href="#" data-section="add-artwork">Add your first artwork</a></p></div>';
            return;
        }

        container.innerHTML = artworks.map(artwork => `
            <div class="col-md-4 mb-4">
                <div class="card artwork-card">
                    <img src="/${artwork.image.path}" class="card-img-top artwork-image" alt="${artwork.title}">
                    <div class="card-body">
                        <h5 class="card-title">${artwork.title}</h5>
                        <p class="card-text">
                            <small class="text-muted">${artwork.medium}</small><br>
                            <small class="text-muted">${artwork.dimensions || 'No dimensions'}</small>
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                ${artwork.isPublished ? '<span class="badge bg-success">Published</span>' : '<span class="badge bg-warning">Draft</span>'}
                                ${artwork.isFeatured ? '<span class="badge bg-primary">Featured</span>' : ''}
                            </div>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-primary" onclick="admin.editArtwork('${artwork._id}')">Edit</button>
                                <button class="btn btn-sm btn-outline-danger" onclick="admin.deleteArtwork('${artwork._id}')">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async saveArtwork() {
        const formData = new FormData();
        const isEdit = !!this.currentArtworkId;

        // Collect form data
        formData.append('title', document.getElementById('artworkTitle').value);
        formData.append('category', document.getElementById('artworkCategory').value);
        formData.append('medium', document.getElementById('artworkMedium').value);
        formData.append('dimensions', document.getElementById('artworkDimensions').value);
        formData.append('year', document.getElementById('artworkYear').value);
        formData.append('description', document.getElementById('artworkDescription').value);
        formData.append('tags', document.getElementById('artworkTags').value);
        formData.append('isPublished', document.getElementById('artworkPublished').checked);
        formData.append('isFeatured', document.getElementById('artworkFeatured').checked);

        const imageFile = document.getElementById('artworkImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        } else if (!isEdit) {
            alert('Please select an image');
            return;
        }

        try {
            const url = isEdit ? `${this.baseURL}/artworks/${this.currentArtworkId}` : `${this.baseURL}/artworks`;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                alert(isEdit ? 'Artwork updated successfully!' : 'Artwork created successfully!');
                this.resetArtworkForm();
                this.showSection('artworks');
                this.loadDashboardStats();
            } else {
                alert(data.message || 'Failed to save artwork');
            }
        } catch (error) {
            alert('Failed to save artwork. Please try again.');
        }
    }

    async editArtwork(artworkId) {
        try {
            const response = await fetch(`${this.baseURL}/artworks`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const artwork = data.artworks.find(a => a._id === artworkId);
                
                if (artwork) {
                    this.populateArtworkForm(artwork);
                    this.currentArtworkId = artworkId;
                    document.getElementById('artworkFormTitle').textContent = 'Edit Artwork';
                    this.showSection('add-artwork');
                }
            }
        } catch (error) {
            alert('Failed to load artwork for editing');
        }
    }

    async deleteArtwork(artworkId) {
        if (!confirm('Are you sure you want to delete this artwork?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/artworks/${artworkId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                alert('Artwork deleted successfully!');
                this.loadArtworks();
                this.loadDashboardStats();
            } else {
                alert('Failed to delete artwork');
            }
        } catch (error) {
            alert('Failed to delete artwork. Please try again.');
        }
    }

    async updateProfile() {
        const profileData = {
            name: document.getElementById('profileName').value,
            phone: document.getElementById('profilePhone').value,
            location: document.getElementById('profileLocation').value,
            bio: document.getElementById('profileBio').value,
            socialMedia: {
                instagram: document.getElementById('profileInstagram').value,
                facebook: document.getElementById('profileFacebook').value,
                twitter: document.getElementById('profileTwitter').value
            }
        };

        try {
            const response = await fetch(`${this.baseURL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                alert('Profile updated successfully!');
                this.loadProfile();
            } else {
                alert('Failed to update profile');
            }
        } catch (error) {
            alert('Failed to update profile. Please try again.');
        }
    }

    populateProfileForm(artist) {
        document.getElementById('profileName').value = artist.name || '';
        document.getElementById('profileEmail').value = artist.email || '';
        document.getElementById('profilePhone').value = artist.phone || '';
        document.getElementById('profileLocation').value = artist.location || '';
        document.getElementById('profileBio').value = artist.bio || '';
        document.getElementById('profileInstagram').value = artist.socialMedia?.instagram || '';
        document.getElementById('profileFacebook').value = artist.socialMedia?.facebook || '';
        document.getElementById('profileTwitter').value = artist.socialMedia?.twitter || '';
    }

    populateArtworkForm(artwork) {
        document.getElementById('artworkTitle').value = artwork.title || '';
        document.getElementById('artworkCategory').value = artwork.category || 'painting';
        document.getElementById('artworkMedium').value = artwork.medium || '';
        document.getElementById('artworkDimensions').value = artwork.dimensions || '';
        document.getElementById('artworkYear').value = artwork.year || '';
        document.getElementById('artworkDescription').value = artwork.description || '';
        document.getElementById('artworkTags').value = artwork.tags?.join(', ') || '';
        document.getElementById('artworkPublished').checked = artwork.isPublished !== false;
        document.getElementById('artworkFeatured').checked = artwork.isFeatured || false;

        // Show current image
        if (artwork.image) {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `<img src="/${artwork.image.path}" class="image-preview" alt="Current image">`;
        }
    }

    resetArtworkForm() {
        document.getElementById('artworkForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('artworkFormTitle').textContent = 'Add New Artwork';
        this.currentArtworkId = null;
    }

    previewImage(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('imagePreview');
                preview.innerHTML = `<img src="${e.target.result}" class="image-preview" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    }

    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Initialize admin panel
const admin = new ArtistAdmin();