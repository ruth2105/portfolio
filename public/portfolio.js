class ArtistPortfolio {
    constructor() {
        this.baseURL = '/api';
        this.artworks = [];
        this.artist = null;
        
        this.init();
    }

    async init() {
        await this.loadArtworks();
        await this.loadArtistInfo();
        this.bindEvents();
        this.showSection('portfolio');
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.target.getAttribute('href');
                this.showSection(targetId.substring(1));
            });
        });

        // Mobile navigation toggle
        const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
        if (mobileNavToggle) {
            mobileNavToggle.addEventListener('click', () => {
                document.body.classList.toggle('mobile-nav-active');
            });
        }
    }

    async loadArtworks() {
        try {
            const response = await fetch(`${this.baseURL}/artworks/public?limit=50`);
            if (response.ok) {
                const data = await response.json();
                this.artworks = data.artworks;
                this.displayArtworks();
            }
        } catch (error) {
            console.error('Failed to load artworks:', error);
            this.showFallbackArtworks();
        }
    }

    async loadArtistInfo() {
        // For now, we'll use static info. In a multi-artist system, 
        // you'd get the artist ID from the URL or subdomain
        try {
            // This would be dynamic based on the artist
            const artistData = {
                name: "Ethiopian Artist",
                bio: "Contemporary visual artist from Ethiopia",
                email: "artist@example.com",
                phone: "+251 911 123 456",
                socialMedia: {
                    instagram: "#",
                    facebook: "#",
                    twitter: "#",
                    behance: "#"
                }
            };
            
            this.artist = artistData;
            this.updateArtistInfo();
        } catch (error) {
            console.error('Failed to load artist info:', error);
        }
    }

    displayArtworks() {
        const container = document.querySelector('.portfolio-container');
        if (!container) return;

        if (this.artworks.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-center text-white">No artworks available yet.</p></div>';
            return;
        }

        container.innerHTML = this.artworks.map(artwork => `
            <div class="col-lg-4 col-md-6 portfolio-item ${artwork.category}">
                <div class="portfolio-wrap">
                    <img src="/${artwork.image.path}" class="img-fluid portfolio-img" alt="${artwork.title}">
                    <div class="portfolio-info">
                        <h4>${artwork.title}</h4>
                        <p>${artwork.category}</p>
                        <small>${artwork.medium}</small>
                        <small style="font-weight: 700;">${artwork.dimensions || 'Dimensions not specified'}</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showFallbackArtworks() {
        // Show static artworks if API fails
        const container = document.querySelector('.portfolio-container');
        if (container) {
            // Keep existing static content as fallback
        }
    }

    updateArtistInfo() {
        if (!this.artist) return;

        // Update artist name in header
        const artistNameElements = document.querySelectorAll('h1 a, #artistName');
        artistNameElements.forEach(el => {
            if (el) el.textContent = this.artist.name;
        });

        // Update contact info
        const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
        emailLinks.forEach(link => {
            link.href = `mailto:${this.artist.email}`;
            link.textContent = this.artist.email;
        });

        const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
        phoneLinks.forEach(link => {
            link.href = `tel:${this.artist.phone}`;
            link.textContent = this.artist.phone;
        });

        // Update social media links
        if (this.artist.socialMedia) {
            const socialLinks = {
                instagram: this.artist.socialMedia.instagram,
                facebook: this.artist.socialMedia.facebook,
                twitter: this.artist.socialMedia.twitter,
                behance: this.artist.socialMedia.behance
            };

            Object.keys(socialLinks).forEach(platform => {
                const links = document.querySelectorAll(`.${platform}`);
                links.forEach(link => {
                    if (socialLinks[platform] && socialLinks[platform] !== '#') {
                        link.href = socialLinks[platform];
                    }
                });
            });
        }

        // Update bio
        const bioElements = document.querySelectorAll('.artist-bio');
        bioElements.forEach(el => {
            if (el && this.artist.bio) {
                el.textContent = this.artist.bio;
            }
        });
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('section').forEach(section => {
            section.classList.remove('section-show');
        });

        // Show target section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('section-show');
        }

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`a[href="#${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
}

// Initialize portfolio when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ArtistPortfolio();
});