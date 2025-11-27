// Auto-Animated Visual Effects for Main Text
// Wave-like, repetitive animations without audio
(function() {
    const mainText = document.getElementById('mainText');
    
    if (!mainText) return;

    // ============================================
    // GHOST TEXT SETUP
    // ============================================
    const ghostLayers = [];
    const NUM_GHOST_LAYERS = 5;
    const GHOST_COLORS = [
        'rgba(255, 50, 100, 0.4)',   // Pink-red
        'rgba(100, 150, 255, 0.4)',  // Blue
        'rgba(150, 255, 100, 0.4)',  // Green
        'rgba(255, 200, 50, 0.4)',   // Orange-yellow
        'rgba(200, 100, 255, 0.4)'   // Purple
    ];
    
    // Create ghost text layers
    function createGhostLayers() {
        const container = mainText.parentElement;
        
        for (let i = 0; i < NUM_GHOST_LAYERS; i++) {
            const ghost = document.createElement('h1');
            ghost.className = 'ghost-text';
            ghost.textContent = mainText.textContent;
            
            ghost.style.color = GHOST_COLORS[i];
            ghost.style.zIndex = i + 1;
            ghost.style.textShadow = `0 0 10px ${GHOST_COLORS[i]}`;
            
            container.insertBefore(ghost, mainText);
            ghostLayers.push({
                element: ghost,
                scale: 1.0,
                opacity: 0,
                delay: i * 0.2, // Stagger the animation
                phase: i * Math.PI / NUM_GHOST_LAYERS // Phase offset for wave
            });
        }
    }
    
    createGhostLayers();

    // ============================================
    // ANIMATION CONFIGURATION
    // ============================================
    const CONFIG = {
        // Wave frequencies (Hz) - controls speed of oscillation
        frequencies: {
            scale: 0.8,           // Slow pulsing
            rotation: 0.3,        // Very slow rotation
            skew: 0.5,            // Medium skew oscillation
            opacity: 0.4,         // Slow opacity wave
            glow: 1.2,            // Faster glow pulsing
            color: 0.2,           // Very slow color shift
            brightness: 0.6,      // Medium brightness wave
            letterSpacing: 0.7,   // Medium letter spacing wave
            ghostPulse: 0.5       // Ghost text pulse frequency
        },
        
        // Effect Intensity Multipliers
        intensity: {
            scale: 0.6,
            rotation: 0.7,
            skew: 0.5,
            opacity: 0.8,
            glow: 0.9,
            color: 0.3,
            brightness: 0.7,
            letterSpacing: 0.8,
            ghostPulse: 1.0
        },
        
        // Effect Ranges
        ranges: {
            scale: { min: 0.97, max: 1.03 },
            rotation: { min: -0.5, max: 0.5 },
            skew: { min: -1, max: 1 },
            opacity: { min: 0.92, max: 1.0 },
            glow: { min: 0, max: 15 },
            color: { min: 0, max: 8 },
            brightness: { min: 0.96, max: 1.04 },
            letterSpacing: { min: -0.25, max: -0.15 },
            ghostScale: { min: 1.0, max: 1.3 },
            ghostOpacity: { max: 0.6 }
        }
    };

    // Base letter spacing value
    const baseLetterSpacing = -0.2;
    
    // Animation state
    let startTime = performance.now();
    let currentValues = {
        scale: 1.0,
        rotation: 0,
        skew: 0,
        opacity: 1.0,
        glow: 0,
        color: 0,
        brightness: 1.0,
        letterSpacing: baseLetterSpacing
    };

    // ============================================
    // WAVE FUNCTIONS
    // ============================================
    
    /**
     * Generate value using sine wave
     * @param {number} time - Current time in seconds
     * @param {number} frequency - Oscillation frequency
     * @param {number} phase - Phase offset
     * @returns {number} Value between 0 and 1
     */
    function sineWave(time, frequency, phase = 0) {
        return (Math.sin(time * frequency * Math.PI * 2 + phase) + 1) / 2;
    }
    
    /**
     * Generate value using cosine wave
     * @param {number} time - Current time in seconds
     * @param {number} frequency - Oscillation frequency
     * @param {number} phase - Phase offset
     * @returns {number} Value between 0 and 1
     */
    function cosineWave(time, frequency, phase = 0) {
        return (Math.cos(time * frequency * Math.PI * 2 + phase) + 1) / 2;
    }
    
    /**
     * Combine multiple waves for more natural variation
     */
    function combinedWave(time, freq1, freq2, ratio = 0.5) {
        const wave1 = sineWave(time, freq1);
        const wave2 = sineWave(time, freq2, Math.PI / 4);
        return wave1 * ratio + wave2 * (1 - ratio);
    }

    /**
     * Map a 0-1 value to a range
     */
    function mapToRange(value, min, max) {
        return min + value * (max - min);
    }

    // ============================================
    // ANIMATION LOOP
    // ============================================
    
    function animate() {
        const currentTime = performance.now();
        const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
        
        // Calculate wave-based values for each effect
        const waves = {
            scale: combinedWave(elapsed, CONFIG.frequencies.scale, CONFIG.frequencies.scale * 1.5),
            rotation: sineWave(elapsed, CONFIG.frequencies.rotation),
            skew: cosineWave(elapsed, CONFIG.frequencies.skew, Math.PI / 3),
            opacity: combinedWave(elapsed, CONFIG.frequencies.opacity, CONFIG.frequencies.opacity * 2),
            glow: combinedWave(elapsed, CONFIG.frequencies.glow, CONFIG.frequencies.glow * 0.7, 0.6),
            color: sineWave(elapsed, CONFIG.frequencies.color),
            brightness: sineWave(elapsed, CONFIG.frequencies.brightness),
            letterSpacing: combinedWave(elapsed, CONFIG.frequencies.letterSpacing, CONFIG.frequencies.letterSpacing * 1.3)
        };
        
        // Apply intensity and map to ranges
        currentValues.scale = mapToRange(
            waves.scale * CONFIG.intensity.scale,
            CONFIG.ranges.scale.min,
            CONFIG.ranges.scale.max
        );
        
        currentValues.rotation = mapToRange(
            waves.rotation * CONFIG.intensity.rotation,
            CONFIG.ranges.rotation.min,
            CONFIG.ranges.rotation.max
        );
        
        currentValues.skew = mapToRange(
            waves.skew * CONFIG.intensity.skew,
            CONFIG.ranges.skew.min,
            CONFIG.ranges.skew.max
        );
        
        currentValues.opacity = mapToRange(
            waves.opacity * CONFIG.intensity.opacity,
            CONFIG.ranges.opacity.min,
            CONFIG.ranges.opacity.max
        );
        
        currentValues.glow = mapToRange(
            waves.glow * CONFIG.intensity.glow,
            CONFIG.ranges.glow.min,
            CONFIG.ranges.glow.max
        );
        
        currentValues.color = mapToRange(
            waves.color * CONFIG.intensity.color,
            CONFIG.ranges.color.min,
            CONFIG.ranges.color.max
        );
        
        currentValues.brightness = mapToRange(
            waves.brightness * CONFIG.intensity.brightness,
            CONFIG.ranges.brightness.min,
            CONFIG.ranges.brightness.max
        );
        
        currentValues.letterSpacing = mapToRange(
            waves.letterSpacing * CONFIG.intensity.letterSpacing,
            CONFIG.ranges.letterSpacing.min,
            CONFIG.ranges.letterSpacing.max
        );
        
        // Apply effects to main text
        applyVisualEffects();
        
        // Update ghost text
        updateGhostEffects(elapsed);
        
        // Continue animation loop
        requestAnimationFrame(animate);
    }

    /**
     * Apply all visual effects to the mainText element
     */
    function applyVisualEffects() {
        // Build transform string
        const transform = `scale(${currentValues.scale}) rotate(${currentValues.rotation}deg) skewX(${currentValues.skew}deg)`;
        
        // Build filter string
        const filters = `brightness(${currentValues.brightness}) hue-rotate(${currentValues.color}deg)`;
        
        // Build text-shadow for glow effect
        const glowShadow = `0 0 ${currentValues.glow}px rgba(0, 0, 0, ${currentValues.opacity * 0.5})`;
        
        // Apply all effects in a single batch
        mainText.style.transform = transform;
        mainText.style.opacity = currentValues.opacity;
        mainText.style.filter = filters;
        mainText.style.textShadow = glowShadow;
        mainText.style.letterSpacing = `${currentValues.letterSpacing}em`;
    }

    /**
     * Update ghost text pulse effects
     */
    function updateGhostEffects(time) {
        ghostLayers.forEach((ghost, index) => {
            // Create a pulsing effect with phase offset for each layer
            const pulseWave = sineWave(time, CONFIG.frequencies.ghostPulse, ghost.phase);
            
            // Scale pulses outward
            const scale = mapToRange(
                pulseWave * CONFIG.intensity.ghostPulse,
                CONFIG.ranges.ghostScale.min,
                CONFIG.ranges.ghostScale.max
            );
            
            // Opacity fades as it scales up (inverse relationship)
            const opacity = mapToRange(
                (1 - pulseWave) * CONFIG.intensity.ghostPulse,
                0,
                CONFIG.ranges.ghostOpacity.max
            );
            
            // Apply transform and opacity
            ghost.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
            ghost.element.style.opacity = opacity;
        });
    }

    // ============================================
    // START ANIMATION
    // ============================================
    
    // Start the animation loop
    animate();
})();
