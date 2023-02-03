from flask import Flask, render_template, request
from spotify import get_album, get_track, get_play

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/spotify",  methods=['GET', 'POST'])
def download():
    if request.args:
        if request.args.get('type') == 'album':
            return render_template("spotify.html", data=get_album(request.args.get('id')))
        elif request.args.get('type') == 'track':
            return render_template("spotify.html", data=get_track(request.args.get('id')))
        elif request.args.get('type') == 'playlist':
            return render_template("spotify.html", data=get_play(request.args.get('id')))
        else:
            return "Invalid type"
    elif request.form:
        if request.form.get('type') == 'album':
            return render_template("spotify.html", data=get_album(request.form.get('id')))
        elif request.form.get('type') == 'track':
            return render_template("spotify.html", data=get_track(request.form.get('id')))
        elif request.form.get('type') == 'playlist':
            return render_template("spotify.html", data=get_play(request.form.get('id')))
        else:
            return "Invalid type"
    else:
        return "No arguments provided"

app.run(host='0.0.0.0', debug=True)