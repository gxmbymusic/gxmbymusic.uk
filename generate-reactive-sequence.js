const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = process.cwd();
const inputPath = path.resolve(projectRoot, process.argv[2] || 'audio/Expressions.mp3');
const outputPath = path.resolve(projectRoot, process.argv[3] || 'audio/Expressions-reactive.json');
const sampleRate = 11025;
const fps = 24;

function percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
    return sorted[index] || 1;
}

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function smooth(values, radius) {
    const output = new Array(values.length).fill(0);
    for (let i = 0; i < values.length; i++) {
        let sum = 0;
        let count = 0;
        const start = Math.max(0, i - radius);
        const end = Math.min(values.length - 1, i + radius);
        for (let j = start; j <= end; j++) {
            sum += values[j];
            count += 1;
        }
        output[i] = count ? sum / count : 0;
    }
    return output;
}

const ffmpeg = spawnSync(
    'ffmpeg',
    [
        '-v', 'error',
        '-i', inputPath,
        '-ac', '1',
        '-ar', String(sampleRate),
        '-f', 'f32le',
        'pipe:1'
    ],
    {
        encoding: null,
        maxBuffer: 1024 * 1024 * 128
    }
);

if (ffmpeg.status !== 0) {
    process.stderr.write(ffmpeg.stderr ? ffmpeg.stderr.toString() : 'ffmpeg failed\n');
    process.exit(ffmpeg.status || 1);
}

const rawBuffer = ffmpeg.stdout;
const floatBuffer = rawBuffer.buffer.slice(
    rawBuffer.byteOffset,
    rawBuffer.byteOffset + rawBuffer.byteLength
);
const samples = new Float32Array(floatBuffer);
const samplesPerFrame = Math.max(1, Math.round(sampleRate / fps));
const frameCount = Math.ceil(samples.length / samplesPerFrame);

const energy = new Array(frameCount).fill(0);
const transient = new Array(frameCount).fill(0);
const peak = new Array(frameCount).fill(0);

for (let frame = 0; frame < frameCount; frame++) {
    const start = frame * samplesPerFrame;
    const end = Math.min(samples.length, start + samplesPerFrame);
    let sumSquares = 0;
    let maxAbs = 0;

    for (let i = start; i < end; i++) {
        const sample = samples[i] || 0;
        const abs = Math.abs(sample);
        sumSquares += sample * sample;
        if (abs > maxAbs) {
            maxAbs = abs;
        }
    }

    const length = Math.max(1, end - start);
    energy[frame] = Math.sqrt(sumSquares / length);
    peak[frame] = maxAbs;
}

const smoothEnergy = smooth(energy, 3);
const longEnergy = smooth(energy, 18);

for (let i = 0; i < frameCount; i++) {
    const delta = i === 0 ? 0 : smoothEnergy[i] - smoothEnergy[i - 1];
    transient[i] = Math.max(0, delta + Math.max(0, smoothEnergy[i] - longEnergy[i]) * 0.75);
}

const energyScale = percentile(smoothEnergy, 0.97);
const transientScale = percentile(transient, 0.98);
const peakScale = percentile(peak, 0.98);

const frames = new Array(frameCount);
for (let i = 0; i < frameCount; i++) {
    frames[i] = {
        e: Number(clamp01(smoothEnergy[i] / energyScale).toFixed(4)),
        p: Number(clamp01(transient[i] / transientScale).toFixed(4)),
        k: Number(clamp01(peak[i] / peakScale).toFixed(4))
    };
}

const output = {
    fps,
    frameCount,
    duration: Number((samples.length / sampleRate).toFixed(4)),
    frames
};

fs.writeFileSync(outputPath, JSON.stringify(output));
process.stdout.write(`Wrote ${path.relative(projectRoot, outputPath)} with ${frameCount} frames\n`);
