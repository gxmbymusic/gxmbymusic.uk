/* ============================================================
   MusicPlayer.jsx
   The release browser. Structure and motion follow the
   "Progressive Blur Modal" (Kiran Patel; 21st.dev brief in
   react-bits/music-player.md, CSS from the user's CodePen fork
   dariusatsudev/pen/QwpqXoN), rebuilt around the real catalogue:

   - photo + title: the selected release (newest by default)
   - songs: every release; clicking one opens the song modal
   - song modal: grows out of the clicked row and holds the
     embed (mounted on first open, kept alive after so playback
     resumes), the CometDial volume and the permalink
   - artist modal: the "+" disc, expanding to the bio

   Behaviour carried over from media.js: lazy embeds, pause on
   close, one panel at a time, pause the visuals when the tab
   is hidden, Expressions drives engine.js.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react';

import CometDial from '../CometDial/CometDial';
import { MEDIA, SOURCE_LABEL, SC_AVATAR, artUrl, canonicalUrl, embedUrl, formatDate, years } from '../../catalogue';
import { ARTIST_BIO } from '../../config';
import { attachEmbed, stopReactive } from '../../embeds';
import { usePalette } from '../../theme';

import './MusicPlayer.css';

const DEFAULT_VOLUME = 100; // match the platforms' own default
const [FIRST_YEAR, LAST_YEAR] = years();

const MoreOptionsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10ZM19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z" fill="currentColor" />
    </svg>
);

const AddIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M17.667 11.666H5.66699M11.667 5.66602V17.666" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const GradientBlur = () => (
    <div className="gradient-blur" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => <div key={i} />)}
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
    const [modalTop, setModalTop] = useState(0);

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
        setModalTop(row.getBoundingClientRect().top - content.getBoundingClientRect().top);
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
                    <div className="photo-wrapper">
                        <img className="photo" src={artUrl(current)} alt={`${current.title} artwork`} />
                        <img className="photo photo--glow" src={artUrl(current)} alt="" aria-hidden="true" />
                    </div>
                    <div className="main-info">
                        <div className="title-container">
                            <h3 className="title">{current.title}</h3>
                            <div className="title-info">
                                <span className="light">{SOURCE_LABEL[current.kind]}</span>
                                <span className="divider" />
                                <span className="light">{formatDate(current.date)}</span>
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
                                        className={`song ${playingId === item.id ? 'is-playing' : ''}`}
                                        aria-haspopup="dialog"
                                        aria-expanded={openIndex === i}
                                        aria-controls="gx-song-modal"
                                        onClick={() => openSong(i)}
                                    >
                                        <span className="bold">{item.title}</span>
                                        <span className="end">
                                            <MoreOptionsIcon />
                                            <span className="light">{formatDate(item.date)}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>

                <div
                    id="gx-song-modal"
                    className={`song-modal ${songOpen ? 'active' : ''}`}
                    style={{ top: `${modalTop}px`, '--rise': `${-modalTop}px` }}
                    role="dialog"
                    aria-labelledby="gx-song-title"
                    inert={!songOpen}
                >
                    <div className="song song--head">
                        <span id="gx-song-title" className="bold">{openItem.title}</span>
                        <span className="end">
                            <button ref={closeRef} type="button" className="close" aria-label="Close" onClick={closeSong}>
                                <AddIcon />
                            </button>
                            <span className="light">{formatDate(openItem.date)}</span>
                        </span>
                    </div>
                    <div className="song-modal-info">
                        {mounted.map(i => (
                            <Embed key={MEDIA[i].id} item={MEDIA[i]} active={i === openIndex} register={register} />
                        ))}
                        <div className="song-controls">
                            <CometDial
                                defaultValue={DEFAULT_VOLUME}
                                min={0}
                                max={100}
                                step={1}
                                unit="%"
                                label="Volume"
                                {...palette.dial}
                                size={128}
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
                            <div className="song-links">
                                <span className="light">
                                    {SOURCE_LABEL[openItem.kind]} · {formatDate(openItem.date)}
                                </span>
                                <a className="permalink" href={canonicalUrl(openItem)} target="_blank" rel="noopener noreferrer">
                                    open on {SOURCE_LABEL[openItem.kind]} ↗
                                </a>
                            </div>
                        </div>
                        {openItem.notes ? <p className="bold notes">{openItem.notes}</p> : null}
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
                        <AddIcon />
                    </button>
                    <div id="gx-artist" className="modal-content" inert={!artistOpen}>
                        <div className="photo-wrapper">
                            <h3>GXMBY</h3>
                            <img className="photo" src={SC_AVATAR} alt="GXMBY" />
                            <img className="photo photo--glow" src={SC_AVATAR} alt="" aria-hidden="true" />
                        </div>
                        <div className="info">
                            <div className="info-top">
                                <div className="info-top-left">
                                    <span className="genre light">{MEDIA.length} releases</span>
                                    <span className="divider" />
                                    <span className="light">{FIRST_YEAR}–{LAST_YEAR}</span>
                                </div>
                                <span className="light">youtube · soundcloud</span>
                            </div>
                            <p className="bold">{ARTIST_BIO}</p>
                        </div>
                    </div>
                    <GradientBlur />
                    <div className="shade" />
                </div>
            </div>
        </div>
    );
}
