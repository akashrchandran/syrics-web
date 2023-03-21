import re
import requests
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import os

# from dotenv import load_dotenv
# load_dotenv()

cid = os.getenv("SPOTIFY_CLIENT_ID")
secret = os.getenv("SPOTIFY_CLIENT_SECRET")
client_credentials_manager = SpotifyClientCredentials(client_id=cid, client_secret=secret)
sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)

REGEX = r"^(?:spotify:(track|album|playlist):|https:\/\/[a-z]+\.spotify\.com\/(track|playlist|album)\/)(.\w+)?.*$"
SHORT_URL_REGEX = r'window.top.location = validateProtocol\("(\S+)"\);'


def get_album(album_id):
    album_data = sp.album(album_id)
    album_data['artists'] = ','.join([artist['name'] for artist in album_data['artists']])
    return {
            "name": album_data['name'], 
            "id": album_id,
            "artist": album_data['artists'], 
            "total_tracks": album_data['total_tracks'],
            "release_date": album_data['release_date'],
            "label": album_data['label'],
            "image": album_data['images'][0]['url'],
            "tracks": album_data['tracks']['items']
            }

def get_track(track_id):
    track_data = sp.track(track_id)
    track_data['artist'] = ','.join([artist['name'] for artist in track_data['artists']])
    return {
        "name": track_data['name'],
        "id": track_id,
        "artist": track_data['artist'],
        "album": track_data['album']['name'],
        "image": track_data['album']['images'][0]['url'],
        "explicit": 'Explicit' if track_data['explicit'] else 'Not Explicit',
        "release_date": track_data['album']['release_date'],
        'popularity': track_data['popularity'],
        'track_number': track_data['track_number'],
        'id': track_data['id'],
    }


def get_play(play_id):
    play_data = sp.playlist(play_id)
    play_data['owner'] = play_data['owner']['display_name']
    play_data['total_tracks'] = play_data['tracks']['total']
    play_data['collaborative'] = 'Collaborative' if play_data['collaborative'] else 'Not Collaborative'
    return {
        "name": play_data['name'],
        "id": play_id,
        "owner": play_data['owner'],
        "total_tracks": play_data['total_tracks'],
        "desc": play_data['description'] or 'No Description',
        'followers': play_data['followers']['total'],
        "image": play_data['images'][0]['url'],
        "tracks": play_data['tracks']['items'],
    }

def check_regex(url):
    url = requests.get(url, allow_redirects=True).url
    if 'spotify.link' in url or 'spotify.app.link' in url:
        req = requests.get(url, allow_redirects=True).text
        match = re.search(SHORT_URL_REGEX, req)
        if match:
            url = match[1]
    match = re.match(REGEX, url)
    if not match:
        return None, None
    if match[2]:
        return match[2], match[3]
    elif match[1]:
        return match[1], match[3]
    else:
        return None, None
    
def query_spotify(q=None, type='track,album,playlist'):
    data = sp.search(q=q, type=type, limit=1)
    response = []
    if data['tracks']['items']:
        response.append({'name': data['tracks']['items'][0]['name'], 'type': 'track', 'image;:': data['tracks']['items'][0]['album']['images'][0]['url']})
    if data['albums']['items']:
        response.append({'name': data['albums']['items'][0]['name'], 'type': 'album', 'image': data['albums']['items'][0]['images'][0]['url']})
    if data['playlists']['items']:
        response.append({'name': data['playlists']['items'][0]['name'], 'type': 'playlist', 'image': data['playlists']['items'][0]['images'][0]['url']})
    return response

def get_all_trackids(_id, album=False):
    offset = 0
    limit = 50
    tracks = {}
    if album:
        while True:
            results = sp.album_tracks(_id, offset=offset, limit=limit)
            for track in results['items']:
                if not track['track']['id']:
                    continue
                tracks[track['id']] = [track['name'], track['track_number']]
            offset += limit
            if len(results['items']) < limit:
                break
    else:
        while True:
            results = sp.playlist_tracks(_id, offset=offset, limit=limit)
            for track in results['items']:
                if not track['track']['id']:
                    continue
                tracks[track['track']['id']] = [track['track']['name'], track['track']['track_number']]
            offset += limit
            if len(results['items']) < limit:
                break
    print(tracks)
    return tracks