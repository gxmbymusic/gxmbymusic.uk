// Music Player Functionality
const audioPlayer = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const trackList = document.getElementById('trackList');
const playIcon = document.querySelector('.play-icon');
const pauseIcon = document.querySelector('.pause-icon');
const progressFill = document.getElementById('progressFill');
const progressBuffer = document.getElementById('progressBuffer');
const progressBar = document.querySelector('.progress-bar');
const elapsedTime = document.getElementById('elapsedTime');
const totalTime = document.getElementById('totalTime');
const orderToggle = document.getElementById('orderToggle');
const orderModeText = document.getElementById('orderModeText');
const audioMetadata = document.getElementById('audioMetadata');

// Track mapping from server (populated on load)
let trackMapping = {};
let tracksLoaded = false;

// Sample track data - Generate 365 tracks for 2026
// URLs will be updated after fetching track mapping
const tracks = Array.from({ length: 365 }, (_, i) => ({
    id: i + 1,
    name: "REDACTED",
    url: null, // Will be set from mapping
    isAvailable: false // Will be set based on release date
}));

let currentTrackIndex = 0;
let isPlaying = false;
let playOrderMode = 'dynamic'; // 'dynamic' or 'sequential'

// Fetch track mapping from server
async function fetchTrackMapping() {
    try {
        console.log('Fetching track mapping from /tracks.json...');
        // Use absolute URL to ensure it hits the Worker route
        const tracksUrl = window.location.hostname === '365.gxmbymusic.uk' 
            ? 'https://gxmbymusic.uk/tracks.json' 
            : '/tracks.json';
        console.log('Fetching from:', tracksUrl);
        const response = await fetch(tracksUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        trackMapping = await response.json();
        console.log('Track mapping received:', trackMapping);
        tracksLoaded = true;
        
        // Update tracks with URLs from mapping and availability
        updateTracksFromMapping();
        console.log('Tracks updated. Available tracks:', tracks.filter(t => t.isAvailable).length);
        
        // Initialize track list after mapping is loaded
        initializeTrackList();
    } catch (error) {
        console.error('Error fetching track mapping:', error);
        // Still initialize with unavailable tracks
        tracksLoaded = true;
        initializeTrackList();
    }
}

// Update track URLs and availability from mapping
function updateTracksFromMapping() {
    console.log('Updating tracks from mapping. Mapping keys:', Object.keys(trackMapping));
    tracks.forEach(track => {
        // Check if track is in mapping (released or test file)
        // Server-side already validated availability, so if it's in mapping, it's available
        const trackIdStr = track.id.toString();
        if (trackMapping[trackIdStr]) {
            // Use absolute URL for audio files to ensure they hit the Worker route
            const audioBaseUrl = window.location.hostname === '365.gxmbymusic.uk' 
                ? 'https://gxmbymusic.uk/audio' 
                : '/audio';
            track.url = `${audioBaseUrl}/${trackMapping[trackIdStr]}`;
            track.isAvailable = true;
            console.log(`Track ${track.id} is available: ${trackMapping[trackIdStr]}`);
        } else {
            // Track not in mapping = not released yet or doesn't exist
            track.url = null;
            track.isAvailable = false;
        }
    });
}

// Get current day of year (1-365) in GMT/UTC (client-side for UI)
function getCurrentDayOfYear() {
    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const diff = now - startOfYear;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    
    const year = now.getUTCFullYear();
    
    // Before 2026: return 0 (no tracks available)
    if (year < 2026) {
        return 0;
    }
    
    // After 2026: return 365 (all tracks available)
    if (year > 2026) {
        return 365;
    }
    
    // During 2026: return actual day of year
    return dayOfYear;
}

// Check if track is available
function isTrackAvailable(trackId) {
    const currentDayOfYear = getCurrentDayOfYear();
    const track = tracks.find(t => t.id === trackId);
    
    if (!track) return false;
    
    // Must be in mapping (released) and date check passes
    return track.isAvailable && trackId <= currentDayOfYear && trackId > 0;
}

// Initialize track list
function initializeTrackList() {
    // Clear existing list
    trackList.innerHTML = '';
    
    tracks.forEach((track, index) => {
        const li = document.createElement('li');
        // Format track number as #001, #002, etc.
        const trackNumber = `#${String(track.id).padStart(3, '0')}`;
        
        // Add unavailable class if track is not available
        if (!track.isAvailable) {
            li.classList.add('unavailable');
        }
        
        li.innerHTML = `
            <span class="track-name">${track.name}</span>
            <span class="track-number">${trackNumber}</span>
        `;
        li.dataset.trackIndex = index; // Store the original track index
        li.dataset.trackId = track.id; // Store track ID
        
        // Only allow clicking if track is available
        if (track.isAvailable) {
            li.addEventListener('click', function() {
                selectTrack(parseInt(this.dataset.trackIndex));
            });
        } else {
            // Prevent interaction with unavailable tracks
            li.style.cursor = 'not-allowed';
        }
        
        trackList.appendChild(li);
    });
    
    // Set first available track as active
    const firstAvailableIndex = tracks.findIndex(t => t.isAvailable);
    if (firstAvailableIndex >= 0) {
        trackList.children[firstAvailableIndex].classList.add('active');
        audioPlayer.src = tracks[firstAvailableIndex].url;
        currentTrackIndex = firstAvailableIndex;
        // Update metadata when initial track is set
        audioPlayer.addEventListener('loadedmetadata', updateAudioMetadata, { once: true });
    }
}

// Play function
function play() {
    audioPlayer.play().catch(error => {
        console.log('Playback failed:', error);
        // Handle playback error (e.g., file not found)
    });
    isPlaying = true;
    playBtn.classList.remove('active');
    pauseBtn.classList.add('active');
}

// Pause function
function pause() {
    audioPlayer.pause();
    isPlaying = false;
    playBtn.classList.add('active');
    pauseBtn.classList.remove('active');
}

// Select and play a track
function selectTrack(trackIndex) {
    const track = tracks[trackIndex];
    
    // Validate track is available
    if (!track || !track.isAvailable || !track.url) {
        console.log('Track not available:', trackIndex);
        return;
    }
    
    currentTrackIndex = trackIndex;
    
    // Handle audio loading errors
    audioPlayer.onerror = () => {
        console.error('Failed to load audio:', track.url);
        isPlaying = false;
        playBtn.classList.add('active');
        pauseBtn.classList.remove('active');
    };
    
    audioPlayer.src = track.url;
    
    // Reset buffer progress when loading new track
    progressBuffer.style.width = '0%';
    progressFill.style.width = '0%';
    
    // Find the track element with this trackIndex
    let clickedTrack = null;
    Array.from(trackList.children).forEach((li) => {
        if (parseInt(li.dataset.trackIndex) === trackIndex) {
            clickedTrack = li;
        }
    });
    
    // Only move clicked track to the top in dynamic mode
    if (playOrderMode === 'dynamic') {
        if (clickedTrack && clickedTrack !== trackList.firstChild) {
            trackList.insertBefore(clickedTrack, trackList.firstChild);
        }
    }
    
    // Update active state
    Array.from(trackList.children).forEach((li) => {
        li.classList.remove('active');
    });
    if (clickedTrack) {
        clickedTrack.classList.add('active');
    }
    
    // Always play when selecting a track
    play();
    
    // Update metadata textarea
    updateAudioMetadata();
}

// Play next track when current ends
function playNextTrack() {
    if (playOrderMode === 'sequential') {
        // In sequential mode, play next available track by ID number
        const currentTrack = tracks[currentTrackIndex];
        let nextIndex = -1;
        
        // Find next available track
        for (let i = currentTrack.id; i <= 365; i++) {
            const candidateTrack = tracks.find(t => t.id === i);
            if (candidateTrack && candidateTrack.isAvailable) {
                nextIndex = tracks.findIndex(t => t.id === i);
                break;
            }
        }
        
        if (nextIndex >= 0) {
            selectTrack(nextIndex);
            if (isPlaying) {
                audioPlayer.play();
            }
        } else {
            // No more tracks, stop playback
            isPlaying = false;
            playBtn.classList.add('active');
            pauseBtn.classList.remove('active');
        }
    } else {
        // In dynamic mode, play next available track in DOM order
        const currentTrackElement = Array.from(trackList.children).find(
            li => parseInt(li.dataset.trackIndex) === currentTrackIndex
        );
        
        if (currentTrackElement) {
            let nextElement = currentTrackElement.nextElementSibling;
            
            // Skip unavailable tracks
            while (nextElement && nextElement.classList.contains('unavailable')) {
                nextElement = nextElement.nextElementSibling;
            }
            
            if (nextElement) {
                const nextTrackIndex = parseInt(nextElement.dataset.trackIndex);
                selectTrack(nextTrackIndex);
                if (isPlaying) {
                    audioPlayer.play();
                }
            } else {
                // No more tracks, stop playback
                isPlaying = false;
                playBtn.classList.add('active');
                pauseBtn.classList.remove('active');
            }
        } else {
            // No more tracks, stop playback
            isPlaying = false;
            playBtn.classList.add('active');
            pauseBtn.classList.remove('active');
        }
    }
}

// Toggle play order mode
function togglePlayOrder() {
    if (playOrderMode === 'dynamic') {
        playOrderMode = 'sequential';
        orderModeText.textContent = 'SEQUENTIAL';
        // Reset track list to original order
        resetTrackListOrder();
    } else {
        playOrderMode = 'dynamic';
        orderModeText.textContent = 'DYNAMIC';
    }
}

// Reset track list to original order (sorted by track ID)
function resetTrackListOrder() {
    const trackElements = Array.from(trackList.children);
    trackElements.sort((a, b) => {
        const indexA = parseInt(a.dataset.trackIndex);
        const indexB = parseInt(b.dataset.trackIndex);
        return tracks[indexA].id - tracks[indexB].id;
    });
    
    // Clear and re-append in sorted order
    trackList.innerHTML = '';
    trackElements.forEach(el => trackList.appendChild(el));
}

// Event listeners
playBtn.addEventListener('click', play);
pauseBtn.addEventListener('click', pause);
audioPlayer.addEventListener('ended', playNextTrack);
orderToggle.addEventListener('click', togglePlayOrder);

// Click on progress bar to seek
progressBar.addEventListener('click', (e) => {
    const width = progressBar.clientWidth;
    const clickX = e.offsetX;
    const duration = audioPlayer.duration;
    
    if (duration > 0) {
        audioPlayer.currentTime = (clickX / width) * duration;
    }
});

// Handle audio errors
audioPlayer.addEventListener('error', (e) => {
    console.log('Audio error:', e);
    isPlaying = false;
    playBtn.classList.add('active');
    pauseBtn.classList.remove('active');
});

// Format time in MM:SS format
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update progress bar and time display
function updateProgress() {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    
    if (duration > 0) {
        const progressPercent = (currentTime / duration) * 100;
        progressFill.style.width = `${progressPercent}%`;
        elapsedTime.textContent = formatTime(currentTime);
        
        // Update buffering progress
        updateBufferProgress();
    }
}

// Update buffering progress to show how much of the file has loaded
function updateBufferProgress() {
    const duration = audioPlayer.duration;
    const buffered = audioPlayer.buffered;
    
    if (duration > 0 && buffered.length > 0) {
        // Get the end of the last buffered range (most browsers only have one range)
        const bufferedEnd = buffered.end(buffered.length - 1);
        const bufferPercent = (bufferedEnd / duration) * 100;
        progressBuffer.style.width = `${bufferPercent}%`;
    } else {
        progressBuffer.style.width = '0%';
    }
}

// Update metadata container with disclaimer and download link
function updateAudioMetadata() {
    const track = tracks[currentTrackIndex];
    
    if (!track || !track.isAvailable || !track.url) {
        audioMetadata.innerHTML = '';
        return;
    }
    
    const trackNumber = `#${String(track.id).padStart(3, '0')}`;
    const duration = audioPlayer.duration ? formatTime(audioPlayer.duration) : '--:--';
    const downloadUrl = track.url;
    
    // Extract filename from URL
    const filename = downloadUrl.split('/').pop() || downloadUrl;
    
    const disclaimer = `Stems/Projects/Licencing - samples@gxmbymusic.uk\n\n`;
    const trackInfo = `Track: ${trackNumber}\nDuration: ${duration}\n\n`;
    const downloadLink = `Download: <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer">${filename}</a>`;
    
    audioMetadata.innerHTML = disclaimer + trackInfo + downloadLink;
}

// Update total time when metadata is loaded
audioPlayer.addEventListener('loadedmetadata', () => {
    totalTime.textContent = formatTime(audioPlayer.duration);
    updateAudioMetadata();
});

// Update progress bar as audio plays
audioPlayer.addEventListener('timeupdate', updateProgress);

// Update buffering progress when data is loaded
audioPlayer.addEventListener('progress', updateBufferProgress);
audioPlayer.addEventListener('loadeddata', updateBufferProgress);
audioPlayer.addEventListener('canplay', updateBufferProgress);
audioPlayer.addEventListener('canplaythrough', updateBufferProgress);

// Initialize on load - fetch mapping first, then initialize
fetchTrackMapping();
