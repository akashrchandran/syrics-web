import re
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv
import os

load_dotenv()

cid = os.getenv("SPOTIFY_CLIENT_ID")
secret = os.getenv("SPOTIFY_CLIENT_SECRET")
client_credentials_manager = SpotifyClientCredentials(client_id=cid, client_secret=secret)
sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)

REGEX = r"^(?:spotify:(track|album|playlist):|https:\/\/[a-z]+\.spotify\.com\/(track|playlist|album)\/)(.\w+)?.*$"


def get_album(album_id):
    album_data = sp.album(album_id)
    album_data['artists'] = ','.join([artist['name'] for artist in album_data['artists']])
    return {
            "name": album_data['name'], 
            "artist": album_data['artists'], 
            "total_tracks": album_data['total_tracks'],
            "release_date": album_data['release_date'],
            "label": album_data['label'],
            "image": album_data['images'][1]['url'],
            "tracks": album_data['tracks']['items']
            }

def get_track(track_id):
    return sp.track(track_id)

def get_play(play_id):
    play_data = sp.playlist(play_id)
    play_data['owner'] = play_data['owner']['display_name']
    play_data['total_tracks'] = play_data['tracks']['total']
    play_data['collaborative'] = '[C]' if play_data['collaborative'] else ''
    return {"name": play_data['name'], 
            "owner": play_data['owner'], 
            "total_tracks": play_data['total_tracks'], 
            "collaborative": play_data['collaborative'],
            "image": play_data['images'][1]['url'],
            "tracks": play_data['tracks']['items']
            }

def check_regex(url):
    print(url)
    match = re.match(REGEX, url)
    print(match)
    if match.group(2):
        return match[2], match[3]
    elif match.group(1):
        return match[1], match[3]
    else:
        return None, None