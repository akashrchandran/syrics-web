const downloadbtn = document.getElementsByName('download');
const downzip = document.getElementById('downzip');
const album_name = document.getElementById('album_name').textContent;
const lyricsSettings = JSON.parse(localStorage.getItem('lyricsSettings'));
const lyricsType = lyricsSettings ? lyricsSettings.lyricsType : 'lrc';
const fileNameFormat = lyricsSettings ? lyricsSettings.fileNameFormat : ["track_name", "track_no", "album"];

async function get_lyrics(id) {
    const response = await fetch(`https://spotify-lyrics-api-pi.vercel.app/?trackid=${id}&format=${lyricsType}`);
    if (response.status != 200) {
        return [null, null];
    }
    const data = await response.json();
    lyrics = [];
    let sync = true;
    if (data.syncType == "UNSYNCED") {
        data.lines.forEach(line => {
            lyrics.push(`${line['words']}\n`);
        });
        sync = false;
    } else {
        if (lyricsType === 'srt') {
            data.lines.forEach((line) => {
                lyrics.push(`${line["index"]}\n${line["startTime"]} --> ${line["endTime"]}\n${line["words"]}\n\n`);
            });
        } else {
            data.lines.forEach(line => {
                lyrics.push(`[${line['timeTag']}] ${line['words']}\n`);
            });
        }
    }
    return [lyrics, sync];
}

function renameUsingFormat(string, data) {
    const matches = string.match(/{(.+?)}/g);
    if (matches) {
        matches.forEach(match => {
            console.log(match);
            const key = match.slice(1, -1);
            string = string.replace(match, data[key] || '');
        });
    }
    return string;
}

save_lyrics = (lyrics, track_details, type) => {
    const blob = new Blob(lyrics, { type: "text/plain;charset=utf-8" });
    const nameTemplate = fileNameFormat.join("");
    const name = renameUsingFormat(nameTemplate, track_details);
    window.saveAs(blob, sanitizeFilename(name + '.' + type));
}

sanitizeFilename = (filename) => filename.replace(/[\/\\:*?"<>|]/g, '_');

noramlDownload = async () => {
    const zip = new JSZip();
    const promises = [];
    let count = 0;
    downzip.innerHTML = `<i class="fa fa-spinner fa-spin" aria-hidden="true"></i>`;
    downzip.classList.add('disabled');
    let bar = document.getElementById('progress');
    downloadbtn.forEach((btn) => {
        const id = btn.getAttribute('data-id');
        promises.push(get_lyrics(id).then(response => {
            const attributes = ['data-name', 'data-album', 'data-artist', 'data-title', 'data-length'];
            const [name, album, artist, title, length] = attributes.map(attr => btn.getAttribute(attr));
            const lyrics = response[0]
            const sync = response[1]
            if (lyrics == null) {
                btn.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
                btn.classList.add('disabled');
                btn.previousElementSibling.classList.add('badge', 'bg-danger');
                btn.previousElementSibling.textContent = 'No lyrics found';
                return;
            }
            else if (!sync) {
                btn.previousElementSibling.classList.add('badge', 'bg-warning');
                btn.previousElementSibling.textContent = 'Synced lyrics not available';
            }
            lyrics.unshift(`[ar:${artist}]\n[al:${album}]\n[ti:${title}]\n[length:${length}]\n\n`);
            if (lyricsType === 'lrc') {
                zip.file(`${sanitizeFilename(name)}.lrc`, lyrics.join(""));
            } else if (lyricsType === 'srt') {
                zip.file(`${sanitizeFilename(name)}.srt`, lyrics.join(""));
            }
            count++;
            let variable = ((count / downloadbtn.length) * 100).toFixed(2);
            bar.style.width = `${variable}%`;
            bar.textContent = `${variable}%`;
            console.log(variable);
        }));
    });
    try {
        await Promise.all(promises);

        if (count !== 0) {
            const content = await zip.generateAsync({ type: "blob" });
            window.saveAs(content, `${album_name}.zip`);
            downzip.innerHTML = '<span class="fs-4"><i class="fa fa-download" aria-hidden="true"></i> ZIP</span>';
            downzip.classList.remove('disabled');
        } else {
            showToast('None of the tracks have lyrics');
            downzip.innerHTML = '<span class="fs-4"><i class="fa fa-times" aria-hidden="true"></i> ZIP</span>';
        }
    } catch (error) {
        console.error(error);
    } finally {
        let myModalEl = document.getElementById('staticBackdrop');
        let modal = bootstrap.Modal.getInstance(myModalEl);
        modal.hide();
    }
}

maxDownload = async (type, id) => {
    const zip = new JSZip();
    downzip.innerHTML = `<i class="fa fa-spinner fa-spin" aria-hidden="true"></i>`;
    downzip.classList.add('disabled');
    response = await fetch(`/api/getalltracks?id=${id}&album=${type == 'album' ? 'true' : ''}`);
    const songs = await response.json();
    const { length } = Object.keys(songs);
    let progress = 0;
    bar = document.getElementById('progress');
    for (const trackid in songs) {
        let variable = parseInt((progress / length) * 100);
        bar.style.width = `${variable}%`;
        bar.textContent = `${variable}%`;
        res_lyric = await get_lyrics(trackid);
        const lyrics = res_lyric[0];
        if (lyrics != null) {
            if (lyricsType === 'lrc') {
                lyrics.unshift(`[ar:${songs[trackid]["artist"]}]\n[al:${album_name}]\n[ti:${songs[trackid]['name']}]\n[length:${songs[trackid]['duration']}]\n\n`);
                zip.file(`${songs[trackid]["track_number"]}. ${sanitizeFilename(songs[trackid]["name"])}.lrc`, lyrics.join(""));
            } else if (lyricsType === 'srt') {
                zip.file(`${songs[trackid]["track_number"]}. ${sanitizeFilename(songs[trackid]["name"])}.srt`, lyrics.join(""));
            }
        }
        progress++;
    };
    if (Object.keys(zip.files).length > 0) {
        document.getElementById('staticBackdropLabel').textContent = "Downloading..."
        zip.generateAsync({ type: "blob" }).then((content) => {
            window.saveAs(content, `${album_name}.zip`);
            setInterval(() => {
                downzip.innerHTML = '<span class="fs-4"><i class="fa fa-check" aria-hidden="true"></i> ZIP</span>';
                downzip.classList.remove('disabled');
            }, 2000);
        })
    }
    else {
        showToast('None of the tracks have lyrics');
        downzip.innerHTML = '<span class="fs-4"><i class="fa fa-times" aria-hidden="true"></i> ZIP</span>';
    }
    let myModalEl = document.getElementById('staticBackdrop');
    let modal = bootstrap.Modal.getInstance(myModalEl)
    modal.hide();
}

function downlodDecider() {
    tracks = parseInt(document.getElementById('total_tracks').textContent.replace(" Tracks"));
    data = document.getElementById('music_cover');
    type = data.getAttribute('data-type');
    id = data.getAttribute('data-id');
    if (tracks > 100 && type == 'playlist')
        maxDownload('playlist', id);
    else if (tracks > 50 && type == 'album')
        maxDownload('album', id);
    else
        noramlDownload();
}
downzip.addEventListener('click', downlodDecider);

downloadbtn.forEach((btn) => {
    btn.addEventListener('click', async () => {
        btn.innerHTML = '<i class="fa fa-spinner fa-spin" aria-hidden="true"></i>';
        btn.classList.add('disabled');
        const attributes = ['data-id', 'data-name', 'data-album', 'data-artist', 'data-title', 'data-length'];
        const track_details = await fetch(`/api/tracks/${btn.getAttribute('data-id')}`).then(response => response.json());
        const [id, name, album, artist, title, length] = attributes.map(attr => btn.getAttribute(attr));
        const response = await get_lyrics(id); 
        let lyrics = response[0];
        let sync = response[1];
        if (lyrics == null) {
            btn.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
            btn.previousElementSibling.classList.add('badge', 'bg-danger');
            btn.previousElementSibling.textContent = 'No lyrics found';
            return;
        }
        else if (!sync) {
            btn.previousElementSibling.classList.add('badge', 'bg-warning');
            btn.previousElementSibling.textContent = 'Synced lyrics not available';
        }
        if (lyricsType === 'lrc') {
            lyrics.unshift(`[ar:${artist}]\n[al:${album}]\n[ti:${title}]\n[length:${length}]\n\n`);
            save_lyrics(lyrics, track_details, 'lrc');
        } else if (lyricsType === 'srt') {
            save_lyrics(lyrics, track_details, 'srt');
        }
        btn.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i>';
        setInterval(() => {
            btn.innerHTML = '<i class="fa fa-download" aria-hidden="true"></i>';
            btn.classList.remove('disabled');
        }, 2000);
    });
});
