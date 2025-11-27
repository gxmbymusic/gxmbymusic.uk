# Deployment Guide for GXMBY365 Song Release System

## Prerequisites

1. Cloudflare account with Workers enabled
2. R2 bucket `gxmby365` created (already done)
3. Wrangler CLI installed: `npm install -g wrangler`

## Deployment Steps

### 1. Authenticate with Cloudflare

```bash
wrangler login
```

### 2. Deploy the Worker

From the project directory:

```bash
wrangler deploy
```

### 3. Configure Routes in Cloudflare Dashboard

After deployment, configure routes in Cloudflare Dashboard:

1. Go to Workers & Pages → Your Worker (`gxmby365-worker`)
2. Go to Settings → Triggers
3. Add routes:
   - Route 1: `yourdomain.com/tracks.json`
   - Route 2: `yourdomain.com/audio/*`

Or use `wrangler.toml` routes (uncomment and configure):

```toml
routes = [
  { pattern = "yourdomain.com/tracks.json", zone_name = "yourdomain.com" },
  { pattern = "yourdomain.com/audio/*", zone_name = "yourdomain.com" }
]
```

### 4. Verify R2 Bucket Binding

Ensure the R2 bucket binding is correct in Cloudflare Dashboard:
- Workers & Pages → Your Worker → Settings → Variables
- Verify `GXMBY365` binding points to `gxmby365` bucket

### 5. Test Endpoints

Test the endpoints:

```bash
# Test tracks mapping
curl https://yourdomain.com/tracks.json

# Test audio file (replace with actual filename)
curl -I https://yourdomain.com/audio/001-song-title.mp3
```

## File Naming Convention

Audio files in R2 should follow this pattern:
- Include track number as first 3-digit number (zero-padded)
- Examples:
  - `001-song-title.mp3`
  - `042-another-track.mp3`
  - `365-final-track.mp3`

## Security Notes

- R2 bucket should remain private (not publicly accessible)
- All file access goes through Worker validation
- Unreleased tracks are filtered out in `/tracks.json` endpoint
- Server-side validation prevents unauthorized access

## Troubleshooting

- **403 errors**: Check that track number <= current day of year
- **404 errors**: Verify file exists in R2 bucket with correct name
- **Mapping empty**: Ensure files are uploaded to R2 and follow naming convention
- **CORS issues**: Worker includes CORS headers, but verify if needed

