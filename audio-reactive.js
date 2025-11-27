// Enhanced Audio-Reactive Visual Effects for Main Text
(function() {
    const mainText = document.getElementById('mainText');
    const audioPlayer = document.getElementById('audioPlayer');
    
    if (!mainText || !audioPlayer) return;

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
            
            // Copy all computed styles from mainText for exact positioning
            const mainStyles = window.getComputedStyle(mainText);
            ghost.style.cssText = `
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                font-family: ${mainStyles.fontFamily};
                font-size: ${mainStyles.fontSize};
                font-weight: ${mainStyles.fontWeight};
                letter-spacing: ${mainStyles.letterSpacing};
                line-height: ${mainStyles.lineHeight};
                text-align: ${mainStyles.textAlign};
                text-transform: ${mainStyles.textTransform};
                padding-top: ${mainStyles.paddingTop};
                margin: 0;
                color: ${GHOST_COLORS[i]};
                opacity: 0;
                pointer-events: none;
                z-index: ${i + 1};
                will-change: transform, opacity;
                text-shadow: 0 0 10px ${GHOST_COLORS[i]};
                user-select: none;
            `;
            
            container.insertBefore(ghost, mainText);
            ghostLayers.push({
                element: ghost,
                scale: 1.0,
                opacity: 0,
                rotation: 0,
                delay: i * 0.03 // Stagger the animation
            });
        }
    }
    
    // Update ghost text content when main text changes
    const textObserver = new MutationObserver(() => {
        ghostLayers.forEach(ghost => {
            ghost.element.textContent = mainText.textContent;
        });
    });
    textObserver.observe(mainText, { childList: true, characterData: true, subtree: true });
    
    createGhostLayers();

    // ============================================
    // CONFIGURATION SYSTEM
    // ============================================
    const CONFIG = {
        // Audio Analysis Settings
        fftSize: 2048,                    // Higher resolution (1024 frequency bins)
        smoothingTimeConstant: 0.2,       // Base smoothing (lower = more responsive, reduced for faster transient detection)
        
        // Frequency Band Boundaries (Hz)
        bassMax: 250,
        kickSnareMin: 150,     // Kick/snare fundamental range start
        kickSnareMax: 400,     // Kick/snare fundamental range end
        midMax: 2000,
        
        // Effect Intensity Multipliers (0-1)
        intensity: {
            scale: 1.0,           // Scale effect intensity
            rotation: 1.0,         // Rotation effect intensity
            skew: 1.0,             // Skew effect intensity
            opacity: 1.0,          // Opacity effect intensity
            glow: 1.0,             // Glow effect intensity
            color: 0.5,            // Color effect intensity (subtle)
            blur: 1.0,             // Blur effect intensity
            brightness: 1.0,       // Brightness effect intensity
            letterSpacing: 1.0     // Letter spacing effect intensity
        },
        
        // Ghost text effect settings
        ghost: {
            kickSnareThreshold: 0.15,    // Kick/snare frequency threshold (150-400 Hz) - lowered
            transientThreshold: 0.08,    // Transient threshold (percussive attack) - lowered
            scaleMax: 1.4,               // Maximum scale for ghost expansion
            opacityMax: 0.7,             // Maximum opacity for ghost
            duration: 0.5,               // Duration of ghost pulse (seconds, faster)
            cooldown: 0.1                // Minimum time between pulses (seconds, reduced for faster response)
        },
        
        // Smoothing Rates (0-1, lower = faster response)
        smoothing: {
            scale: 0.3,           // Fast, responsive
            rotation: 0.3,        // Fast, responsive
            skew: 0.3,            // Fast, responsive
            opacity: 0.5,         // Medium
            glow: 0.5,            // Medium
            color: 0.7,           // Slow, smooth transitions
            blur: 0.6,            // Medium-slow
            brightness: 0.5,      // Medium
            letterSpacing: 0.6    // Medium-slow
        },
        
        // Effect Ranges
        ranges: {
            scale: { min: 0.95, max: 1.05 },
            rotation: { min: -0.5, max: 0.5 },      // degrees (more subtle)
            skew: { min: -1, max: 1 },           // degrees
            opacity: { min: 0.9, max: 1.0 },
            glow: { min: 0, max: 20 },           // px blur radius
            color: { min: 0, max: 10 },         // degrees hue-rotate
            blur: { min: 0, max: 2 },           // px
            brightness: { min: 0.95, max: 1.05 },
            letterSpacing: { min: -0.3, max: 0.1 } // em
        },
        
        // Thresholds
        noiseThreshold: 0.01,      // Minimum level to avoid jitter
        transientThreshold: 0.2,   // Minimum change for transient detection (increased for sharper detection)
        blurThreshold: 0.15        // RMS level below which blur activates (extreme low end)
    };

    // ============================================
    // AUDIO CONTEXT SETUP
    // ============================================
    let audioContext;
    let analyser;
    let frequencyData;
    let timeData;
    let source;
    let isInitialized = false;
    
    // Ghost pulse tracking
    let lastPulseTime = 0;
    let ghostPulseActive = false;
    
    // Smoothed values for each effect
    const smoothedValues = {
        scale: 1.0,
        rotation: 0,
        skew: 0,
        opacity: 1.0,
        glow: 0,
        color: 0,
        blur: 0,
        brightness: 1.0,
        letterSpacing: -0.2,
        rms: 0,
        bass: 0,
        kickSnare: 0,
        mid: 0,
        treble: 0
    };
    
    // Previous values for transient detection
    let previousRMS = 0;
    let previousTimeData = null;

    // Base letter spacing value (from CSS: -0.2em)
    const baseLetterSpacing = -0.2;

    function initializeAudioContext() {
        if (isInitialized) return;

        try {
            // Create audio context
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            
            // Configure analyser with higher resolution
            analyser.fftSize = CONFIG.fftSize;
            analyser.smoothingTimeConstant = CONFIG.smoothingTimeConstant;
            
            const bufferLength = analyser.frequencyBinCount;
            frequencyData = new Uint8Array(bufferLength);
            timeData = new Uint8Array(bufferLength);
            previousTimeData = new Uint8Array(bufferLength);

            // Connect audio element to analyser
            source = audioContext.createMediaElementSource(audioPlayer);
            source.connect(analyser);
            analyser.connect(audioContext.destination);

            isInitialized = true;
            
            // Start animation loop
            animateVisualEffects();
        } catch (error) {
            console.log('Audio context initialization failed:', error);
        }
    }

    // ============================================
    // AUDIO ANALYSIS FUNCTIONS
    // ============================================
    
    /**
     * Calculate RMS (Root Mean Square) level for accurate amplitude detection
     */
    function getRMSLevel() {
        if (!analyser || !timeData) return 0;

        analyser.getByteTimeDomainData(timeData);
        
        let sumSquares = 0;
        for (let i = 0; i < timeData.length; i++) {
            const normalized = (timeData[i] - 128) / 128;
            sumSquares += normalized * normalized;
        }
        
        const rms = Math.sqrt(sumSquares / timeData.length);
        return Math.min(1, Math.max(0, rms)); // Clamp to 0-1
    }

    /**
     * Get frequency bands (bass, kick/snare, mid, treble) normalized values
     */
    function getFrequencyBands() {
        if (!analyser || !frequencyData) return { bass: 0, kickSnare: 0, mid: 0, treble: 0 };

        analyser.getByteFrequencyData(frequencyData);
        
        const sampleRate = audioContext.sampleRate;
        const nyquist = sampleRate / 2;
        const binWidth = nyquist / frequencyData.length;
        
        let bassSum = 0;
        let kickSnareSum = 0;
        let midSum = 0;
        let trebleSum = 0;
        let bassCount = 0;
        let kickSnareCount = 0;
        let midCount = 0;
        let trebleCount = 0;
        
        for (let i = 0; i < frequencyData.length; i++) {
            const frequency = i * binWidth;
            const value = frequencyData[i] / 255;
            
            if (frequency < CONFIG.bassMax) {
                bassSum += value;
                bassCount++;
            }
            
            // Kick/snare detection range (150-400 Hz)
            if (frequency >= CONFIG.kickSnareMin && frequency < CONFIG.kickSnareMax) {
                kickSnareSum += value;
                kickSnareCount++;
            }
            
            if (frequency >= CONFIG.bassMax && frequency < CONFIG.midMax) {
                midSum += value;
                midCount++;
            } else if (frequency >= CONFIG.midMax) {
                trebleSum += value;
                trebleCount++;
            }
        }
        
        return {
            bass: bassCount > 0 ? bassSum / bassCount : 0,
            kickSnare: kickSnareCount > 0 ? kickSnareSum / kickSnareCount : 0,
            mid: midCount > 0 ? midSum / midCount : 0,
            treble: trebleCount > 0 ? trebleSum / trebleCount : 0
        };
    }

    /**
     * Detect transient/beat changes using time-domain analysis
     */
    function getTransientLevel() {
        if (!analyser || !timeData || !previousTimeData) return 0;

        analyser.getByteTimeDomainData(timeData);
        
        let maxChange = 0;
        for (let i = 0; i < timeData.length; i++) {
            const change = Math.abs(timeData[i] - previousTimeData[i]) / 255;
            maxChange = Math.max(maxChange, change);
        }
        
        // Copy current data to previous for next frame
        previousTimeData.set(timeData);
        
        // Normalize and apply threshold
        const transient = Math.min(1, maxChange / CONFIG.transientThreshold);
        return transient > CONFIG.noiseThreshold ? transient : 0;
    }

    /**
     * Exponential moving average smoothing
     */
    function smoothValue(current, target, smoothingRate) {
        return current + (target - current) * (1 - smoothingRate);
    }

    // ============================================
    // VISUAL EFFECTS ANIMATION
    // ============================================
    
    function animateVisualEffects() {
        if (!audioPlayer.paused && !audioPlayer.ended && isInitialized) {
            // Get audio analysis data
            const rms = getRMSLevel();
            const bands = getFrequencyBands();
            const transient = getTransientLevel();
            
            // Apply noise threshold
            const effectiveRMS = rms > CONFIG.noiseThreshold ? rms : 0;
            const effectiveBass = bands.bass > CONFIG.noiseThreshold ? bands.bass : 0;
            const effectiveKickSnare = bands.kickSnare > CONFIG.noiseThreshold ? bands.kickSnare : 0;
            const effectiveMid = bands.mid > CONFIG.noiseThreshold ? bands.mid : 0;
            const effectiveTreble = bands.treble > CONFIG.noiseThreshold ? bands.treble : 0;
            
            // Calculate target values for each effect
            const targets = {
                // Scale: React to overall RMS level
                scale: CONFIG.ranges.scale.min + 
                       (effectiveRMS * CONFIG.intensity.scale * 
                        (CONFIG.ranges.scale.max - CONFIG.ranges.scale.min)),
                
                // Rotation: React to bass frequencies
                rotation: (effectiveBass - 0.5) * 2 * CONFIG.intensity.rotation * 
                         (CONFIG.ranges.rotation.max - CONFIG.ranges.rotation.min) / 2,
                
                // Skew: React to mid frequencies
                skew: (effectiveMid - 0.5) * 2 * CONFIG.intensity.skew * 
                      (CONFIG.ranges.skew.max - CONFIG.ranges.skew.min) / 2,
                
                // Opacity: React to treble frequencies
                opacity: CONFIG.ranges.opacity.min + 
                        (effectiveTreble * CONFIG.intensity.opacity * 
                         (CONFIG.ranges.opacity.max - CONFIG.ranges.opacity.min)),
                
                // Glow: React to overall level with transient boost
                glow: (effectiveRMS + transient * 0.5) * CONFIG.intensity.glow * 
                      CONFIG.ranges.glow.max,
                
                // Color: React to frequency balance
                color: ((effectiveBass + effectiveMid) - effectiveTreble) * 
                       CONFIG.intensity.color * CONFIG.ranges.color.max,
                
                // Blur: Only activates at extreme low end of spectrum
                blur: effectiveRMS < CONFIG.blurThreshold 
                    ? Math.pow((CONFIG.blurThreshold - effectiveRMS) / CONFIG.blurThreshold, 3) * 
                      CONFIG.intensity.blur * CONFIG.ranges.blur.max
                    : 0,
                
                // Brightness: React to overall level
                brightness: CONFIG.ranges.brightness.min + 
                           (effectiveRMS * CONFIG.intensity.brightness * 
                            (CONFIG.ranges.brightness.max - CONFIG.ranges.brightness.min)),
                
                // Letter-spacing: React to overall level (improved version)
                letterSpacing: baseLetterSpacing + 
                              (effectiveRMS * CONFIG.intensity.letterSpacing * 
                               (CONFIG.ranges.letterSpacing.max - baseLetterSpacing))
            };
            
            // Apply smoothing to each value
            smoothedValues.scale = smoothValue(
                smoothedValues.scale, 
                targets.scale, 
                CONFIG.smoothing.scale
            );
            smoothedValues.rotation = smoothValue(
                smoothedValues.rotation, 
                targets.rotation, 
                CONFIG.smoothing.rotation
            );
            smoothedValues.skew = smoothValue(
                smoothedValues.skew, 
                targets.skew, 
                CONFIG.smoothing.skew
            );
            smoothedValues.opacity = smoothValue(
                smoothedValues.opacity, 
                targets.opacity, 
                CONFIG.smoothing.opacity
            );
            smoothedValues.glow = smoothValue(
                smoothedValues.glow, 
                targets.glow, 
                CONFIG.smoothing.glow
            );
            smoothedValues.color = smoothValue(
                smoothedValues.color, 
                targets.color, 
                CONFIG.smoothing.color
            );
            smoothedValues.blur = smoothValue(
                smoothedValues.blur, 
                targets.blur, 
                CONFIG.smoothing.blur
            );
            smoothedValues.brightness = smoothValue(
                smoothedValues.brightness, 
                targets.brightness, 
                CONFIG.smoothing.brightness
            );
            smoothedValues.letterSpacing = smoothValue(
                smoothedValues.letterSpacing, 
                targets.letterSpacing, 
                CONFIG.smoothing.letterSpacing
            );
            
            // Store for transient detection
            previousRMS = effectiveRMS;
            smoothedValues.rms = effectiveRMS;
            smoothedValues.bass = effectiveBass;
            smoothedValues.kickSnare = effectiveKickSnare;
            smoothedValues.mid = effectiveMid;
            smoothedValues.treble = effectiveTreble;
            
            // Apply all effects to DOM (batched for performance)
            applyVisualEffects();
        } else {
            // Reset to base values when not playing
            resetToBaseValues();
        }

        // Continue animation loop
        requestAnimationFrame(animateVisualEffects);
    }

    /**
     * Apply all visual effects to the mainText element
     */
    function applyVisualEffects() {
        // Build transform string (combines scale, rotation, skew)
        const transform = `scale(${smoothedValues.scale}) rotate(${smoothedValues.rotation}deg) skewX(${smoothedValues.skew}deg)`;
        
        // Build filter string (combines blur, brightness, color)
        const filters = `blur(${smoothedValues.blur}px) brightness(${smoothedValues.brightness}) hue-rotate(${smoothedValues.color}deg)`;
        
        // Build text-shadow for glow effect
        const glowShadow = `0 0 ${smoothedValues.glow}px rgba(0, 0, 0, ${smoothedValues.opacity * 0.5})`;
        
        // Apply all effects in a single batch
        mainText.style.transform = transform;
        mainText.style.opacity = smoothedValues.opacity;
        mainText.style.filter = filters;
        mainText.style.textShadow = glowShadow;
        mainText.style.letterSpacing = `${smoothedValues.letterSpacing}em`;
        
        // Update ghost text effects
        updateGhostEffects();
    }

    /**
     * Update ghost text pulse effects
     */
    function updateGhostEffects() {
        const currentTime = performance.now() / 1000; // Convert to seconds
        const kickSnare = smoothedValues.kickSnare;
        const transient = getTransientLevel();
        
        // Check if we should trigger a new ghost pulse (requires BOTH kick/snare frequency AND transient)
        // This filters out sustained bass notes and only catches actual drum hits
        if (kickSnare > CONFIG.ghost.kickSnareThreshold && 
            transient > CONFIG.ghost.transientThreshold &&
            currentTime - lastPulseTime > CONFIG.ghost.cooldown) {
            triggerGhostPulse();
            lastPulseTime = currentTime;
        }
        
        // Update each ghost layer
        ghostLayers.forEach((ghost, index) => {
            if (ghost.pulseStartTime !== undefined) {
                const elapsed = currentTime - ghost.pulseStartTime - ghost.delay;
                
                if (elapsed >= 0 && elapsed < CONFIG.ghost.duration) {
                    // Pulse is active
                    const progress = elapsed / CONFIG.ghost.duration;
                    const easeOut = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
                    
                    // Scale expands from 1.0 to scaleMax
                    ghost.scale = 1.0 + (CONFIG.ghost.scaleMax - 1.0) * easeOut;
                    
                    // Opacity fades from opacityMax to 0
                    ghost.opacity = CONFIG.ghost.opacityMax * (1 - progress);
                    
                    // Apply transform and opacity
                    ghost.element.style.transform = `translateX(-50%) scale(${ghost.scale})`;
                    ghost.element.style.opacity = ghost.opacity;
                } else if (elapsed >= CONFIG.ghost.duration) {
                    // Pulse completed, reset
                    ghost.pulseStartTime = undefined;
                    ghost.element.style.opacity = 0;
                    ghost.element.style.transform = 'translateX(-50%) scale(1)';
                }
            }
        });
    }

    /**
     * Trigger a new ghost pulse on all layers
     */
    function triggerGhostPulse() {
        const currentTime = performance.now() / 1000;
        ghostLayers.forEach(ghost => {
            ghost.pulseStartTime = currentTime;
        });
    }

    /**
     * Reset all effects to base values
     */
    function resetToBaseValues() {
        smoothedValues.scale = 1.0;
        smoothedValues.rotation = 0;
        smoothedValues.skew = 0;
        smoothedValues.opacity = 1.0;
        smoothedValues.glow = 0;
        smoothedValues.color = 0;
        smoothedValues.blur = 0;
        smoothedValues.brightness = 1.0;
        smoothedValues.letterSpacing = baseLetterSpacing;
        
        applyVisualEffects();
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    // Initialize audio context on first play
    audioPlayer.addEventListener('play', () => {
        if (!isInitialized) {
            initializeAudioContext();
        }
        // Resume audio context if suspended
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    });

    // Optional: Add visual feedback when audio context is ready
    audioPlayer.addEventListener('canplay', () => {
        if (!isInitialized && !audioPlayer.paused) {
            initializeAudioContext();
        }
    });
    
    // Reset on pause
    audioPlayer.addEventListener('pause', () => {
        resetToBaseValues();
    });
})();
