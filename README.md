# Spotify Genius Annotations

A Chrome extension that brings Genius lyrics and annotations directly into your Spotify Web Player. It detects what you are listening to and fetches rich annotations for deeper song insights.

## Features

*   **Real-time Detection**: Automatically syncs with your Spotify Web Player session.
*   **Genius Annotations**: Clickable lyrics that reveal the meaning and background of lines.
*   **Dynamic UI**: The popup background changes color to match the song's album art.
*   **Proxy Backend**: Uses a Flask server to bypass CORS and extract clean lyrics.

---

## Installation Guide

### 1. Prerequisites
*   Python 3.x installed.
*   Google Chrome or a Chromium based browser.

### 2. Backend Setup
The extension requires a local Python server to fetch and process lyrics.

```bash
# Clone the repository
git clone https://github.com/yourusername/Spotify-Annotations.git
cd Spotify-Annotations

# Create a virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
python app.py
```
The server will start on `http://127.0.0.1:5000`. Keep this window open while using the extension.

### 3. Extension Setup
1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** in the top right corner.
3.  Click **Load unpacked**.
4.  Select the `extension` folder from this project directory.

---

## Genius API Configuration

For better search accuracy, it is highly recommended to use a Genius API token.

1.  Go to the [Genius API Clients page](https://genius.com/api-clients).
2.  Login and click **New API Client**.
3.  Give it a name (e.g., "Spotify Annotations") and anything for the website URL (e.g., `http://localhost`).
4.  Copy your **Client Access Token**.
5.  Open the extension popup in Chrome.
6.  Click the **Settings Icon** (gear icon) and paste your token.
7.  Click **Save Token**.

---

## How to Run

1.  Ensure the Flask backend is running (`python app.py`).
2.  Open [Spotify Web Player](https://open.spotify.com) and play a song.
3.  Click the Extension icon in your browser toolbar.
4.  Click **Load Lyrics** to see the song text.
5.  Click on any highlighted (green) text to view the annotation.

> [!NOTE]  
> If the backend is not running, the extension will show an error alert when searching for lyrics.
