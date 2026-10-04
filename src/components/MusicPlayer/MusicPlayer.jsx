/* ============================================================
   MusicPlayer.jsx
   The release browser. Motion follows the "Progressive Blur
   Modal" (Kiran Patel; 21st.dev brief in
   react-bits/music-player.md, CSS from the user's CodePen fork
   dariusatsudev/pen/QwpqXoN), rebuilt around the real catalogue
   with its own layout:

   - left column: artwork, title and meta of the selected
     release (newest by default)
   - right column: every release as a numbered row; clicking
     one opens the song modal
   - song modal: grows out of the clicked row and holds the
     embed (mounted on first open, kept alive after so playback
     resumes), the CometDial volume and the permalink
   - "about gxmby" bar: grows into the artist panel, which
     mirrors the main layout (avatar left; bio and links right)

   All player text is lowercase (CSS); the DOM keeps the real
   capitalisation for screen readers.

   Behaviour carried over from media.js: lazy embeds, pause on
   close, one panel at a time, pause the visuals when the tab
   is hidden, Expressions drives engine.js.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react';

import CometDial from '../CometDial/CometDial';
import { MEDIA, SOURCE_LABEL, SC_AVATAR, artUrl, canonicalUrl, embedUrl, formatDate, years } from '../../catalogue';
import { ARTIST_BIO, SOCIAL } from '../../config';
import { attachEmbed, stopReactive } from '../../embeds';
import { usePalette } from '../../theme';

import './MusicPlayer.css';

const DEFAULT_VOLUME = 100; // match the platforms' own default
const [FIRST_YEAR, LAST_YEAR] = years();
const pad2 = n => String(n).padStart(2, '0');

const AddIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 12H6M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const GradientBlur = () => (
    <div className="gradient-blur" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => <div key={i} />)}
    </div>
);

// Artwork with its soft glow behind (the pen's blurred duplicate).
const Artwork = ({ src, alt }) => (
    <div className="photo-wrapper">
        <img className="photo photo--glow" src={src} alt="" aria-hidden="true" />
        <img className="photo" src={src} alt={alt} />
    </div>
);

// One mounted iframe. Never unmounted once created, so the playhead survives
// closing the modal; hidden while another release is open.
function Embed({ item, active, register }) {
    const frameRef = useRef(null);

    useEffect(() => {
        const controller = register(item, frameRef.current);
        return () => controller.dispose();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className={`frame-box frame-box--${item.kind}`} hidden={!active}>
            <iframe
                ref={frameRef}
                className="frame"
                src={embedUrl(item)}
                title={`${item.title} — ${SOURCE_LABEL[item.kind]}`}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen={item.kind !== 'sc'}
            />
        </div>
    );
}

export default function MusicPlayer() {
    const palette = usePalette();

    const [selected, setSelected] = useState(0);
    const [openIndex, setOpenIndex] = useState(-1); // song modal
    const [artistOpen, setArtistOpen] = useState(false);
    const [mounted, setMounted] = useState([]); // indexes with a live embed
    const [playingId, setPlayingId] = useState(null);
    const [from, setFrom] = useState({ top: 0, left: 0, width: 0 }); // clicked row, in card coordinates

    const contentRef = useRef(null);
    const rowRefs = useRef([]);
    const closeRef = useRef(null);
    const toggleRef = useRef(null);
    const returnFocus = useRef(null);
    const controllers = useRef(new Map());
    const volume = useRef(DEFAULT_VOLUME);

    const songOpen = openIndex >= 0;
    const anyModalActive = songOpen || artistOpen;
    const current = MEDIA[selected];
    const openItem = songOpen ? MEDIA[openIndex] : current;

    const register = useCallback((item, iframe) => {
        const controller = attachEmbed(item, iframe, {
            getVolume: () => volume.current,
            onPlaying: playing => setPlayingId(id => (playing ? item.id : id === item.id ? null : id))
        });
        controllers.current.set(item.id, controller);
        return {
            dispose() {
                controller.dispose();
                controllers.current.delete(item.id);
            }
        };
    }, []);

    const openSong = index => {
        const row = rowRefs.current[index];
        const content = contentRef.current;
        if (!row || !content) return;
        // The modal starts exactly over the clicked row, then grows to fill
        // the card (the demo measured only its first row, with a magic offset).
        const r = row.getBoundingClientRect();
        const c = content.getBoundingClientRect();
        setFrom({
            top: r.top - c.top - content.clientTop,
            left: r.left - c.left - content.clientLeft,
            width: r.width
        });
        returnFocus.current = row;
        setArtistOpen(false);
        setSelected(index);
        setMounted(m => (m.includes(index) ? m : [...m, index]));
        setOpenIndex(index);
    };

    const openRef = useRef(openIndex);
    openRef.current = openIndex;

    const closeSong = useCallback(() => {
        const index = openRef.current;
        if (index < 0) return;
        const item = MEDIA[index];
        controllers.current.get(item.id)?.pause();
        stopReactive(item);
        setOpenIndex(-1);
    }, []);

    // Focus: into the modal on open, back to its row on close.
    useEffect(() => {
        if (songOpen) closeRef.current?.focus({ preventScroll: true });
        else if (returnFocus.current) {
            returnFocus.current.focus({ preventScroll: true });
            returnFocus.current = null;
        }
    }, [songOpen]);

    // Escape closes whichever modal is open.
    useEffect(() => {
        if (!anyModalActive) return undefined;
        const onKey = e => {
            if (e.key !== 'Escape') return;
            if (songOpen) closeSong();
            else {
                setArtistOpen(false);
                toggleRef.current?.focus({ preventScroll: true });
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [anyModalActive, songOpen, closeSong]);

    // A hidden tab stops driving the visuals (as media.js did).
    useEffect(() => {
        const onVisibility = () => {
            if (document.hidden && songOpen) stopReactive(MEDIA[openIndex]);
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [songOpen, openIndex]);

    const onVolume = v => {
        volume.current = v;
        controllers.current.forEach(c => c.setVolume(v));
    };

    return (
        <div className="gx-player">
            <div ref={contentRef} className={`content ${anyModalActive ? 'active' : ''}`}>
                <div className="main-content" inert={anyModalActive}>
                    <div className="now">
                        <Artwork src={artUrl(current)} alt={`${current.title} artwork`} />
                        <div className="now-text">
                            <h3 className="title">{current.title}</h3>
                            <p className="meta">
                                {SOURCE_LABEL[current.kind]} · {formatDate(current.date)}
                            </p>
                        </div>
                    </div>
                    <ol className="songs" aria-label="Releases">
                        {MEDIA.map((item, i) => (
                            <li key={item.id}>
                                <button
                                    ref={el => {
                                        rowRefs.current[i] = el;
                                    }}
                                    type="button"
                                    className={[
                                        'song',
                                        i === selected ? 'is-current' : '',
                                        playingId === item.id ? 'is-playing' : ''
                                    ].join(' ').trim()}
                                    aria-haspopup="dialog"
                                    aria-expanded={openIndex === i}
                                    aria-controls="gx-song-modal"
                                    onClick={() => openSong(i)}
                                >
                                    <span className="index meta" aria-hidden="true">{pad2(i + 1)}</span>
                                    <span className="name">{item.title}</span>
                                    <span className="date meta">{formatDate(item.date)}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </div>

                <div
                    id="gx-song-modal"
                    className={`song-modal ${songOpen ? 'active' : ''}`}
                    style={{
                        top: `${from.top}px`,
                        '--rise': `${-from.top}px`,
                        '--from-left': `${from.left}px`,
                        '--from-width': from.width ? `${from.width}px` : '100%'
                    }}
                    role="dialog"
                    aria-labelledby="gx-song-title"
                    inert={!songOpen}
                >
                    <div className="song-head">
                        <span className="index meta" aria-hidden="true">{pad2(MEDIA.indexOf(openItem) + 1)}</span>
                        <span id="gx-song-title" className="name">{openItem.title}</span>
                        <button ref={closeRef} type="button" className="close" aria-label="Close" onClick={closeSong}>
                            <AddIcon />
                        </button>
                    </div>
                    <div className="song-body">
                        {mounted.map(i => (
                            <Embed key={MEDIA[i].id} item={MEDIA[i]} active={i === openIndex} register={register} />
                        ))}
                    </div>
                    <div className="song-foot">
                        <div className="volume">
                            <CometDial
                                defaultValue={DEFAULT_VOLUME}
                                min={0}
                                max={100}
                                step={1}
                                unit="%"
                                label="Volume"
                                {...palette.dial}
                                size={88}
                                sweep={320}
                                thickness={3}
                                speed={25}
                                tapBounce={0.22}
                                flickBounce={0.26}
                                momentum={1.6}
                                cometReach={135}
                                cometWidth={6}
                                onChange={onVolume}
                            />
                            <span className="meta" aria-hidden="true">volume</span>
                        </div>
                        <div className="song-links">
                            <p className="meta">
                                {SOURCE_LABEL[openItem.kind]} · {formatDate(openItem.date)}
                            </p>
                            <a className="permalink" href={canonicalUrl(openItem)} target="_blank" rel="noopener noreferrer">
                                open on {SOURCE_LABEL[openItem.kind]} <span aria-hidden="true">↗</span>
                            </a>
                            {openItem.notes ? <p className="notes">{openItem.notes}</p> : null}
                        </div>
                    </div>
                    <GradientBlur />
                </div>

                <div className={`modal ${artistOpen ? 'active' : ''}`} hidden={songOpen}>
                    <button
                        ref={toggleRef}
                        type="button"
                        className="toggle"
                        aria-expanded={artistOpen}
                        aria-controls="gx-artist"
                        aria-label={artistOpen ? 'Close artist info' : 'About GXMBY'}
                        onClick={() => setArtistOpen(o => !o)}
                    >
                        <span className="toggle-label" aria-hidden="true">about gxmby</span>
                        <span className="toggle-icon">
                            <AddIcon />
                        </span>
                    </button>
                    <div id="gx-artist" className="modal-content" inert={!artistOpen}>
                        <div className="now">
                            <Artwork src={SC_AVATAR} alt="GXMBY" />
                            <div className="now-text">
                                <h3 className="title">GXMBY</h3>
                                <p className="meta">
                                    {MEDIA.length} releases · {FIRST_YEAR}–{LAST_YEAR}
                                </p>
                            </div>
                        </div>
                        <div className="info">
                            <p className="bio">{ARTIST_BIO}</p>
                            <ul className="links" aria-label="GXMBY elsewhere">
                                {SOCIAL.map(s => (
                                    <li key={s.label}>
                                        <a className="link-row" href={s.href} target="_blank" rel="noopener noreferrer">
                                            <span className="name">{s.label}</span>
                                            <span className="meta">
                                                {s.handle} <span aria-hidden="true">↗</span>
                                            </span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <GradientBlur />
                    <div className="shade" />
                </div>
            </div>
        </div>
    );
}
