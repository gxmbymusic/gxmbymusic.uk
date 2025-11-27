// Particle animation matching dariusatsu.com configuration
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updateElementBounds();
}

// Track DOM elements for interaction
let elementBounds = [];
function updateElementBounds() {
    const elements = [
        document.getElementById('mainText'),
        document.querySelector('.music-player'),
        document.querySelector('.progress-container')
    ];
    
    elementBounds = elements
        .filter(el => el) // Filter out nulls if elements don't exist
        .map(el => {
            const rect = el.getBoundingClientRect();
            return {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2,
                radius: Math.max(rect.width, rect.height) / 2 + 40 // Larger radius for attraction
            };
        });
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
// Update bounds on scroll as well since elements might move relative to viewport (though fixed elements won't)
window.addEventListener('scroll', updateElementBounds);

// Particle configuration (matching dariusatsu.com)
const particles = [];
const particleCount = 60; // Matching dariusatsu.com
const connectionDistance = 150;
const grabDistance = 200;
const interactionRadius = 150; // Radius around mouse/elements for interaction
const attractionForce = 0.05; // Gentle pull strength
const speedBoost = 0.1; // Acceleration when excited
const maxSpeed = 5; // Cap speed to prevent chaos
const mouse = { x: null, y: null, isDown: false };

// Mouse events
window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});

window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

window.addEventListener('mousedown', () => {
    mouse.isDown = true;
});

window.addEventListener('mouseup', () => {
    mouse.isDown = false;
});

// Click to add particles (push mode)
canvas.addEventListener('click', (e) => {
    for (let i = 0; i < 3; i++) {
        particles.push(new Particle(e.x, e.y));
    }
    // Remove excess particles
    if (particles.length > particleCount + 20) {
        particles.splice(0, 3);
    }
});

// Particle class
class Particle {
    constructor(x = null, y = null) {
        this.x = x !== null ? x : Math.random() * canvas.width;
        this.y = y !== null ? y : Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 4; // Speed: 2 (matching dariusatsu.com)
        this.vy = (Math.random() - 0.5) * 2;
        this.size = Math.random() * 1.5 + 0.5; // Size: 1 with random variation
        this.baseOpacity = 0.4;
        this.opacity = this.baseOpacity;
        this.friction = 0.96; // Slightly less friction to keep momentum
    }

    update() {
        let excited = false;

        // Apply mouse attraction and excitation
        if (mouse.x !== null && mouse.y !== null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < interactionRadius) {
                excited = true;
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                
                // Attraction
                this.vx += forceDirectionX * attractionForce;
                this.vy += forceDirectionY * attractionForce;

                // Speed boost (random direction to simulate energy)
                this.vx += (Math.random() - 0.5) * speedBoost;
                this.vy += (Math.random() - 0.5) * speedBoost;
            }
        }

        // Apply element attraction and excitation
        elementBounds.forEach(bound => {
            // Simple box check first
            if (this.x > bound.x - 100 && this.x < bound.x + bound.width + 100 &&
                this.y > bound.y - 100 && this.y < bound.y + bound.height + 100) {
                
                const dx = bound.centerX - this.x;
                const dy = bound.centerY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < bound.radius) {
                    excited = true;
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    
                    // Gentler attraction for elements
                    this.vx += forceDirectionX * attractionForce * 0.5;
                    this.vy += forceDirectionY * attractionForce * 0.5;

                    // Speed boost
                    this.vx += (Math.random() - 0.5) * speedBoost * 0.5;
                    this.vy += (Math.random() - 0.5) * speedBoost * 0.5;
                }
            }
        });

        // Move particle
        this.x += this.vx;
        this.y += this.vy;

        // Cap speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }

        // Bounce off edges
        if (this.x <= 0 || this.x >= canvas.width) {
            this.vx *= -1;
            this.x = Math.max(0, Math.min(canvas.width, this.x));
        }
        if (this.y <= 0 || this.y >= canvas.height) {
            this.vy *= -1;
            this.y = Math.max(0, Math.min(canvas.height, this.y));
        }

        // Reset opacity
        this.opacity = this.baseOpacity;
    }

    draw() {
        ctx.fillStyle = `rgba(0, 0, 0, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Create initial particles
for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}

// Draw connections between particles
function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < connectionDistance) {
                let opacity = (1 - (distance / connectionDistance)) * 0.3;
                
                // Grab mode: increase opacity on hover
                if (mouse.x !== null && mouse.y !== null) {
                    const distToMouse1 = Math.sqrt(
                        Math.pow(mouse.x - particles[i].x, 2) + 
                        Math.pow(mouse.y - particles[i].y, 2)
                    );
                    const distToMouse2 = Math.sqrt(
                        Math.pow(mouse.x - particles[j].x, 2) + 
                        Math.pow(mouse.y - particles[j].y, 2)
                    );
                    
                    if (distToMouse1 < grabDistance || distToMouse2 < grabDistance) {
                        opacity = Math.min(opacity * 1.67, 0.5); // Increase to 0.5 on hover
                    }
                }

                ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
}

// Animation loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    // Draw connections
    drawConnections();

    requestAnimationFrame(animate);
}

animate();
