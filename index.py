from flask import Flask, render_template, request
from spotify import get_album, get_track, get_play, check_regex

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/spotify",  methods=['POST'])
def download():
    if not request.form:
        return "No arguments provided"
    url_type, id = check_regex(request.form.get('url'))
    if url_type == 'album':
        return render_template("spotify.html", data=get_album(id), types='album')
    elif url_type == 'track':
        return render_template("spotify.html", data=get_track(id), types='track')
    elif url_type == 'playlist':
        return render_template("spotify.html", data=get_play(id), types='playlist')
    else:
        return render_template("index.html", error="Invalid URL...Please check the URL and try again"), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0',port=5000)