// Track name formatter - adjusts letter spacing for uniform width and colors words differently
(function() {
    const trackOriginalText = new Map(); // Store original text with spaces

    function formatTrackNames() {
        const trackNames = document.querySelectorAll('.track-name');
        if (trackNames.length === 0) return;

        // First pass: split words and apply alternating colors
        trackNames.forEach(trackName => {
            const text = trackName.textContent.trim();
            trackOriginalText.set(trackName, text); // Store original text
            const words = text.split(' ');
            
            // Clear existing content
            trackName.innerHTML = '';
            
            // Create spans for each word with alternating opacity
            words.forEach((word, index) => {
                const wordSpan = document.createElement('span');
                wordSpan.textContent = word;
                wordSpan.className = 'track-word';
                // Alternate between full opacity and 60% opacity
                wordSpan.style.opacity = index % 2 === 0 ? '1' : '0.6';
                trackName.appendChild(wordSpan);
            });
        });

        // Second pass: measure widths and calculate letter spacing
        setTimeout(() => {
            let maxWidth = 0;
            const trackData = [];

            // Find the maximum natural width
            trackNames.forEach(trackName => {
                const width = trackName.offsetWidth;
                const text = trackName.textContent.replace(/\s/g, ''); // Remove spaces
                const charCount = text.length;
                
                trackData.push({ element: trackName, width, text, charCount });
                if (width > maxWidth) maxWidth = width;
            });

            // Apply letter spacing to make all tracks the same width
            trackData.forEach(({ element, width, text, charCount }) => {
                if (charCount > 1) {
                    // Calculate required letter spacing
                    const extraSpace = maxWidth - width;
                    const letterSpacing = extraSpace / (charCount - 1);
                    element.style.letterSpacing = `${letterSpacing}px`;
                    element.dataset.originalLetterSpacing = `${letterSpacing}px`;
                }
                element.style.width = `${maxWidth}px`;
            });
        }, 10);

        // Add hover listeners to show normal spacing with word spaces
        document.querySelectorAll('.track-list li').forEach(li => {
            const trackName = li.querySelector('.track-name');
            if (!trackName) return;

            li.addEventListener('mouseenter', () => {
                const originalText = trackOriginalText.get(trackName);
                if (originalText) {
                    trackName.textContent = originalText;
                    trackName.style.letterSpacing = 'normal';
                    // Keep the fixed width and justify the text
                    trackName.style.textAlign = 'justify';
                    trackName.style.textAlignLast = 'justify';
                }
            });

            li.addEventListener('mouseleave', () => {
                // Restore formatted version
                const originalText = trackOriginalText.get(trackName);
                if (originalText) {
                    const words = originalText.split(' ');
                    trackName.innerHTML = '';
                    
                    words.forEach((word, index) => {
                        const wordSpan = document.createElement('span');
                        wordSpan.textContent = word;
                        wordSpan.className = 'track-word';
                        wordSpan.style.opacity = index % 2 === 0 ? '1' : '0.6';
                        trackName.appendChild(wordSpan);
                    });
                    
                    // Restore letter spacing and reset alignment
                    if (trackName.dataset.originalLetterSpacing) {
                        trackName.style.letterSpacing = trackName.dataset.originalLetterSpacing;
                    }
                    trackName.style.textAlign = '';
                    trackName.style.textAlignLast = '';
                }
            });
        });
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', formatTrackNames);
    } else {
        formatTrackNames();
    }
})();
