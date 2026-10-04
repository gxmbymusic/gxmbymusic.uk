/* ============================================================
   theme.js (React side)
   public/theme.js owns the theme and writes it to
   <html data-theme>. Islands are separate React roots, so they
   share it by watching that attribute rather than via context.

   PALETTES holds every component colour that differs between
   themes, so a palette change is made in one place.
   ============================================================ */

import { useSyncExternalStore } from 'react';

const root = document.documentElement;

const getTheme = () => (root.dataset.theme === 'light' ? 'light' : 'dark');

function subscribe(onChange) {
    const observer = new MutationObserver(onChange);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
}

export const useTheme = () => useSyncExternalStore(subscribe, getTheme);

export const PALETTES = {
    dark: {
        bg: '#0b0a0f',
        molten: { color1: '#5227FF', color2: '#d3e45a', color3: '#FFFFFF', lightMode: false, opacity: 1.0 },
        veil: { inkColor: '#120f17', paperColor: '#3B82F6', rimColor: '#9c8ccc' },
        depth: { faceColor: '#f8fafc', depthColor: '#3B82F6' },
        dial: { accent: '#f5f5f5', ink: '#fdfdfd' },
        warp: { color: '#f8f5ff' },
        tech: { color: '#ffffff', accent: '#ffffff' }
    },
    light: {
        bg: '#ffffff',
        // Light mode paints a wash, not glowing filaments, so it stays pale
        molten: { color1: '#e4e0ff', color2: '#8f7bff', color3: '#5227FF', lightMode: true, opacity: 0.7 },
        veil: { inkColor: '#ffffff', paperColor: '#3B82F6', rimColor: '#5227FF' },
        depth: { faceColor: '#0b0a0f', depthColor: '#3B82F6' },
        dial: { accent: '#0b0a0f', ink: '#0b0a0f' },
        warp: { color: '#0b0a0f' },
        tech: { color: '#0b0a0f', accent: '#3B82F6' }
    }
};

export const usePalette = () => PALETTES[useTheme()];
