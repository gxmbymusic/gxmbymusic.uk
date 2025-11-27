// Cloudflare Worker for automated secure song release system
// Handles /tracks.json (mapping) and /audio/* (file serving) endpoints

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Route to appropriate endpoint
    if (path === '/tracks.json') {
      return handleTracksMapping(request, env);
    } else if (path.startsWith('/audio/')) {
      return handleAudioFile(request, env);
    }

    // 404 for other paths
    return new Response('Not Found', { status: 404 });
  }
};

// Handle /tracks.json endpoint - returns mapping of released tracks
async function handleTracksMapping(request, env) {
  try {
    // Get current day of year in GMT/UTC
    const currentDayOfYear = getCurrentDayOfYear();

    // List all files in R2 bucket
    const listResult = await env.GXMBY365.list();
    
    // Extract track numbers from filenames and filter by release date
    const trackMapping = {};
    
    for (const object of listResult.objects) {
      const trackNumber = extractTrackNumber(object.key);
      const isTestFile = object.key.toLowerCase().includes('gxtest');
      
      // Include test files or files that are released
      if (trackNumber !== null && (isTestFile || trackNumber <= currentDayOfYear)) {
        trackMapping[trackNumber.toString()] = object.key;
      }
    }

    // Return JSON mapping with CORS headers
    return new Response(JSON.stringify(trackMapping), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error generating tracks mapping:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate mapping' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle /audio/* endpoint - serves files with validation
async function handleAudioFile(request, env) {
  try {
    const url = new URL(request.url);
    const filename = url.pathname.replace('/audio/', '');
    
    if (!filename) {
      return new Response('Filename required', { status: 400 });
    }

    // Extract track number from filename
    const trackNumber = extractTrackNumber(filename);
    
    if (trackNumber === null) {
      return new Response('Invalid track filename', { status: 400 });
    }

    // Get current day of year in GMT/UTC
    const currentDayOfYear = getCurrentDayOfYear();

    // Validate track is released (allow test files)
    const isTestFile = filename.toLowerCase().includes('gxtest');
    if (!isTestFile && trackNumber > currentDayOfYear) {
      return new Response('Track not yet released', { status: 403 });
    }

    // Get file from R2
    const object = await env.GXMBY365.get(filename);
    
    if (object === null) {
      return new Response('File not found', { status: 404 });
    }

    // Get file metadata
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range');
    headers.set('Accept-Ranges', 'bytes');

    // Return file with appropriate headers
    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error('Error serving audio file:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Extract track number from filename (first 3-digit number, zero-padded)
function extractTrackNumber(filename) {
  // Match first occurrence of 3-digit number (001-365)
  // Handles underscores, hyphens, and other separators
  const match = filename.match(/(?:^|\D)(\d{3})(?:\D|$)/);
  if (match) {
    const num = parseInt(match[1], 10);
    // Validate it's a valid track number (1-365)
    if (num >= 1 && num <= 365) {
      return num;
    }
  }
  return null;
}

// Get current day of year (1-365) in GMT/UTC
function getCurrentDayOfYear() {
  const now = new Date();
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const diff = now - startOfYear;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  
  // Handle edge cases
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

