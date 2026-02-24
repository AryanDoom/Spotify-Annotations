// Helper function to extract song info
function getSongInfo() {
    let trackName = "";
    let artistName = "";

    // 1. Try document title (Spotify usually updates this: "Song - Artist")
    // Note: The title format might vary, e.g., "Song • Artist" or "Song - Artist"
    const title = document.title;
    if (title && !title.startsWith("Spotify")) {
        // Regex to separate Song and Artist. 
        // Handles "Song • Artist" (common) or "Song - Artist"
        const parts = title.split(/ • | - /);
        if (parts.length >= 2) {
            trackName = parts[0].trim();
            artistName = parts[1].trim();
        }
    }

    // 2. Fallback: Parse DOM if title is generic "Spotify"
    if (!trackName) {
        // These selectors are subject to change by Spotify!
        // [data-testid="now-playing-widget"] is a common container
        const nowPlayingWidget = document.querySelector('[data-testid="now-playing-widget"]');
        if (nowPlayingWidget) {
            const trackElement = nowPlayingWidget.querySelector('[data-testid="context-item-link"]');
            const artistElement = nowPlayingWidget.querySelector('[data-testid="context-item-info-artist"]');

            if (trackElement) trackName = trackElement.innerText;
            if (artistElement) artistName = artistElement.innerText;
        }
    }

    // 3. Fallback: Look for aria-labels or known footer classes
    if (!trackName) {
        const footer = document.querySelector('footer'); // The player bar is usually in a footer
        if (footer) {
            const links = footer.querySelectorAll('a[href^="/album/"], a[href^="/track/"]');
            if (links.length > 0) trackName = links[0].innerText;

            // Artists are usually links to /artist/
            const artistLinks = footer.querySelectorAll('a[href^="/artist/"]');
            if (artistLinks.length > 0) artistName = artistLinks[0].innerText;
        }
    }

    // Get album art
    let artUrl = "";
    const nowPlaying = document.querySelector('[data-testid="now-playing-widget"]');
    if (nowPlaying) {
        const img = nowPlaying.querySelector('img');
        if (img) artUrl = img.src;
    }
    if (!artUrl) {
        const footerImg = document.querySelector('footer img');
        if (footerImg) artUrl = footerImg.src;
    }

    return { trackName, artistName, artUrl };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_song") {
        const info = getSongInfo();
        sendResponse(info);
    }
});

// Optional: Observe title changes to auto-update (if we wanted to push updates)
// const observer = new MutationObserver(() => { ... });
// observer.observe(document.querySelector('title'), {childList: true});
