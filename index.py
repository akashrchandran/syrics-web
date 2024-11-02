from flask import Flask, jsonify, render_template, request
from spotify import (
    get_album,
    get_all_trackids,
    get_track,
    get_play,
    check_regex,
    query_spotify,
    format_duration,
)

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/spotify", methods=["POST"])
def download():
    if not request.form:
        return "No arguments provided"
    url_type, id = check_regex(request.form.get("url"))
    if url_type == "album":
        return render_template("spotify.html", data=get_album(id), types="album")
    elif url_type == "track":
        return render_template("spotify.html", data=get_track(id), types="track")
    elif url_type == "playlist":
        return render_template("spotify.html", data=get_play(id), types="playlist")
    else:
        return (
            render_template(
                "index.html", error="Invalid URL...Please check the URL and try again"
            ),
            400,
        )


@app.route("/api/search")
def api():
    q = request.args.get("q")
    return query_spotify(q) if q else "No arguments provided"


@app.get("/api/getalltracks")
def get_all_tracks():
    album_id = request.args.get("id")
    album = bool(request.args.get("album"))
    if album_id:
        return jsonify(get_all_trackids(album_id, album))
    else:
        return "No arguments provided", 400
    
@app.get("/api/tracks/<string:track_id>")
def track_details(track_id: str):
    if track_id:
        try:
            return jsonify(get_track(track_id))
        except Exception as e:
            return "Invalid Track ID", 400
    else:
        return "No arguments provided", 400

app.add_template_filter(format_duration)
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
