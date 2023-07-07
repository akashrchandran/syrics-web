const downloadbtn = document.getElementsByName('download');
const downzip = document.getElementById('downzip');
const album_name = document.getElementById('album_name').textContent;

async function get_lyrics(id) {
    const response = await fetch(`https://spotify-lyric-api.herokuapp.com/?trackid=${id}&format=lrc`);
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
        data.lines.forEach(line => {
            lyrics.push(`[${line['timeTag']}] ${line['words']}\n`);
        });
    }
    return [lyrics, sync];
}

save_lyrics = (lyrics, name) => {
    const blob = new Blob(lyrics, { type: "text/plain;charset=utf-8" });
    window.saveAs(blob, name);
}

noramlDownload = () => {
    const zip = new JSZip();
    const promises = [];
    let count = 0;
    downzip.innerHTML = `<i class="fa fa-spinner fa-spin" aria-hidden="true"></i>`;
    downzip.classList.add('disabled');
    let bar = document.getElementById('progress');
    downloadbtn.forEach((btn) => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        promises.push(get_lyrics(id).then(response => {
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
            zip.file(`${name}.lrc`, lyrics.join(""));
            count++;
            let variable = ((count / downloadbtn.length) * 100).toFixed(2);
            bar.style.width = `${variable}%`;
            bar.textContent = `${variable}%`;
            console.log(variable);
        }));
    });
    Promise.all(promises).then(() => {
        if (count != 0) {
            zip.generateAsync({ type: "blob" }).then((content) => {
                window.saveAs(content, `${album_name}.zip`);
                setInterval(() => {
                    downzip.innerHTML = '<span class="fs-4"><i class="fa fa-download" aria-hidden="true"></i> ZIP</span>';
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
    });
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
        let variable = ((progress / length) * 100).toFixed(2);
        bar.style.width = `${variable}%`;
        bar.textContent = `${variable}%`;
        res_lyric = await get_lyrics(trackid);
        const lyrics = res_lyric[0];
        if (lyrics != null) {
            zip.file(`${songs[trackid][1]}. ${songs[trackid][0]}.lrc`, lyrics.join(""));
            progress++;
        }
    };
    if (progress != 0) {
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
    if (tracks > 100 && type == 'playlist') {
        maxDownload('playlist', id);
    } else if (tracks > 50 && type == 'album') {
        maxDownload('album', id);
    } else {
        noramlDownload();
    }
}
downzip.addEventListener('click', downlodDecider);

downloadbtn.forEach((btn) => {
    btn.addEventListener('click', async () => {
        btn.innerHTML = '<i class="fa fa-spinner fa-spin" aria-hidden="true"></i>';
        btn.classList.add('disabled');
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
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
        save_lyrics(lyrics, `${name}.lrc`);
        btn.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i>';
        setInterval(() => {
            btn.innerHTML = '<i class="fa fa-download" aria-hidden="true"></i>';
            btn.classList.remove('disabled');
        }, 2000);
    });
});