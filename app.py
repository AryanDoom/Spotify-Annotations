from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import re

app = Flask(__name__)
CORS(app)


@app.route('/search', methods=['POST'])
def search():
    data = request.json
    track = data.get('track')
    artist = data.get('artist')
    token = data.get('token')

    if not track or not artist:
        return jsonify({'error': 'Missing track or artist'}), 400

    if not token:
        query = f"{track} {artist}"
        return jsonify({'url': f"https://genius.com/search?q={query}", 'simple_search': True})

    clean_track = re.sub(r' - .*', '', track)
    clean_track = re.sub(r'\(.*\)', '', clean_track).strip()

    search_url = f"https://api.genius.com/search?q={clean_track} {artist}"
    headers = {'Authorization': f'Bearer {token}'}

    try:
        response = requests.get(search_url, headers=headers)
        response.raise_for_status()
        data = response.json()

        if data['response']['hits']:
            best_match = data['response']['hits'][0]['result']
            return jsonify({
                'url': best_match['url'],
                'title': best_match['full_title'],
                'thumb': best_match['header_image_thumbnail_url']
            })
        else:
            return jsonify({'error': 'No results found.'}), 404

    except:
        return jsonify({'error': 'API Error'}), 500


@app.route('/lyrics', methods=['POST'])
def get_lyrics():
    data = request.json
    url = data.get('url')

    if not url:
        return jsonify({'error': 'Missing URL'}), 400

    try:
        headers = {'Accept-Language': 'en-US,en;q=0.9'}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        for junk in soup.select('[class*="Contributors"], [class*="Translations"], [class*="HeaderArtistAndTracklistdesktop"]'):
            junk.decompose()

        lyrics_html = ""
        containers = soup.find_all(attrs={"data-lyrics-container": "true"})

        if containers:
            for container in containers:
                lyrics_html += str(container) + "<br><br>"
        else:
            old_container = soup.select_one('.lyrics')
            if old_container:
                lyrics_html = str(old_container)

        if lyrics_html:
            return jsonify({'html': lyrics_html})
        else:
            return jsonify({'error': 'Could not extract lyrics'}), 404

    except:
        return jsonify({'error': 'Failed to fetch page'}), 500


@app.route('/annotation', methods=['POST'])
def get_annotation():
    data = request.json
    annotation_id = data.get('id')

    if not annotation_id:
        return jsonify({'error': 'Missing annotation ID'}), 400

    api_url = f"https://genius.com/api/annotations/{annotation_id}"

    try:
        response = requests.get(api_url)
        response.raise_for_status()
        json_data = response.json()

        if 'response' in json_data and 'annotation' in json_data['response']:
            body = json_data['response']['annotation']['body']
            if 'dom' in body:
                html = render_dom(body['dom'])
                return jsonify({'html': html})

        return jsonify({'error': 'No annotation text found.'}), 404

    except:
        return jsonify({'error': 'Failed to fetch annotation'}), 500


def render_dom(node):
    if isinstance(node, str):
        return node

    if isinstance(node, dict):
        tag = node.get('tag')
        children = node.get('children', [])
        children_html = "".join([render_dom(child) for child in children])

        if tag == 'a':
            href = node.get('attributes', {}).get('href', '#')
            return f'<a href="{href}" target="_blank" style="color:#1db954;">{children_html}</a>'

        if tag in ['p', 'i', 'b', 'em', 'strong', 'blockquote']:
            return f"<{tag}>{children_html}</{tag}>"

        return children_html

    return ""


if __name__ == '__main__':
    app.run(debug=True, port=5000)
