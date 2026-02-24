document.addEventListener('DOMContentLoaded', () => {
    const trackNameEl = document.getElementById('track-name');
    const artistNameEl = document.getElementById('artist-name');
    const loadLyricsBtn = document.getElementById('load-lyrics-btn');
    const lyricsContent = document.getElementById('lyrics-content');
    const loadingSpinner = document.getElementById('loading-spinner');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsToggle = document.getElementById('settings-icon');
    const tokenInput = document.getElementById('genius-token');
    const saveTokenBtn = document.getElementById('save-token-btn');
    const statusMsg = document.getElementById('status-msg');

    let currentTrack = "";
    let currentArtist = "";

    // Load saved token
    chrome.storage.local.get(['geniusToken'], (result) => {
        if (result.geniusToken) {
            tokenInput.value = result.geniusToken;
        }
    });

    // Toggle Settings
    settingsToggle.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
    });

    // Save Token
    saveTokenBtn.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        chrome.storage.local.set({ geniusToken: token }, () => {
            statusMsg.innerText = "Token Saved!";
            setTimeout(() => statusMsg.innerText = "", 2000);
        });
    });

    // Get current song from active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].url.includes("open.spotify.com")) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "get_song" }, (response) => {
                if (response && response.trackName) {
                    currentTrack = response.trackName;
                    currentArtist = response.artistName;
                    trackNameEl.innerText = currentTrack;
                    artistNameEl.innerText = currentArtist || "Unknown Artist";

                    // Apply album art gradient
                    if (response.artUrl) {
                        applyGradient(response.artUrl);
                    }
                } else {
                    trackNameEl.innerText = "No song detected";
                    artistNameEl.innerText = "Make sure Spotify is playing";
                    loadLyricsBtn.disabled = true;
                    loadLyricsBtn.style.backgroundColor = "#555";
                }
            });
        } else {
            trackNameEl.innerText = "Not on Spotify";
            artistNameEl.innerText = "Open Spotify Web Player";
            loadLyricsBtn.disabled = true;
            loadLyricsBtn.style.backgroundColor = "#555";
        }
    });

    // Load Lyrics
    loadLyricsBtn.addEventListener('click', () => {
        if (!currentTrack) return;

        loadLyricsBtn.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
        lyricsContent.classList.add('hidden');
        lyricsContent.innerHTML = "";

        chrome.storage.local.get(['geniusToken'], (result) => {
            const token = result.geniusToken;

            // 1. Search for the song URL via Python Backend
            fetch('http://127.0.0.1:5000/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    track: currentTrack,
                    artist: currentArtist,
                    token: token
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.url) {
                        // 2. Fetch the song page content via Python Backend
                        fetch('http://127.0.0.1:5000/lyrics', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: data.url })
                        })
                            .then(response => response.json())
                            .then(lyricsData => {
                                loadingSpinner.classList.add('hidden');
                                if (lyricsData.html) {
                                    lyricsContent.innerHTML = lyricsData.html;

                                    // Remove junk elements (Contributors, Translations widgets)
                                    lyricsContent.querySelectorAll('img, svg').forEach(el => el.remove());
                                    lyricsContent.querySelectorAll('div, span').forEach(el => {
                                        if (el.children.length === 0) {
                                            const text = el.textContent.trim();
                                            if (text.includes('Contributors') || text.includes('Translations') || text.includes('Português')) {
                                                el.remove();
                                            }
                                        }
                                    });

                                    lyricsContent.classList.remove('hidden');

                                    // Add click listeners to all links for annotations
                                    const links = lyricsContent.querySelectorAll('a');
                                    links.forEach(a => {
                                        a.addEventListener('click', (e) => {
                                            e.preventDefault();
                                            const href = a.getAttribute('href');
                                            // Try to find ID in href (e.g. /12345/...)
                                            const match = href.match(/\/(\d+)\//) || href.match(/^(\d+)$/);

                                            if (match && match[1]) {
                                                openAnnotation(match[1]);
                                            } else if (a.dataset.id) {
                                                openAnnotation(a.dataset.id);
                                            } else {
                                                window.open(href, '_blank');
                                            }
                                        });
                                        a.style.cursor = "pointer";
                                        a.style.color = "#1db954";
                                        a.style.textDecoration = "none";
                                    });

                                } else {
                                    lyricsContent.innerText = "Could not extract lyrics.";
                                    lyricsContent.classList.remove('hidden');
                                }
                            })
                            .catch(error => {
                                console.error('Error fetching lyrics:', error);
                                loadingSpinner.classList.add('hidden');
                                lyricsContent.innerText = "Error fetching lyrics.";
                                lyricsContent.classList.remove('hidden');
                            });
                    } else {
                        loadingSpinner.classList.add('hidden');
                        loadLyricsBtn.classList.remove('hidden');
                        alert(data.error || 'Song not found on Genius.');
                    }
                })
                .catch(error => {
                    console.error('Error searching:', error);
                    loadingSpinner.classList.add('hidden');
                    loadLyricsBtn.classList.remove('hidden');
                    alert('Backend Error: Is python app.py running?');
                });
        });
    });

    // Annotation Modal Logic
    const modal = document.getElementById('annotation-modal');
    const closeModal = document.getElementById('close-modal');
    const annotationText = document.getElementById('annotation-text');

    if (closeModal) {
        closeModal.onclick = () => {
            modal.classList.add('hidden');
        };
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.classList.add('hidden');
        }
    };

    function openAnnotation(id) {
        modal.classList.remove('hidden');
        annotationText.innerHTML = "Loading...";

        // Fetch via Python Backend
        fetch('http://127.0.0.1:5000/annotation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        })
            .then(response => response.json())
            .then(data => {
                if (data.html) {
                    // The HTML is already rendered by Python
                    annotationText.innerHTML = data.html;
                } else {
                    annotationText.innerText = data.error || "No annotation text found.";
                }
            })
            .catch(error => {
                console.error('Error fetching annotation:', error);
                annotationText.innerText = "Error fetching annotation.";
            });
    }
});

function applyGradient(imageUrl) {
    fetch(imageUrl)
        .then(res => res.blob())
        .then(blob => createImageBitmap(blob))
        .then(bitmap => {
            const canvas = document.createElement('canvas');
            canvas.width = 50;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, 50, 50);

            const data = ctx.getImageData(0, 0, 50, 50).data;
            let r = 0, g = 0, b = 0, count = 0;

            for (let i = 0; i < data.length; i += 16) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }

            r = Math.min(255, Math.floor(r / count * 1.4));
            g = Math.min(255, Math.floor(g / count * 1.4));
            b = Math.min(255, Math.floor(b / count * 1.4));

            document.body.style.background = `linear-gradient(to bottom, rgb(${r},${g},${b}) 0%, #121212 50%)`;
        })
        .catch(err => console.log('Gradient error:', err));
}

