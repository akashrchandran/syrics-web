const downloadbtn = document.getElementsByName('download');
const downzip = document.getElementById('downzip');
const album_name = document.getElementById('album_name').textContent;

async function get_lyrics(id) {
    const response = await fetch(`https://spotify-lyric-api.herokuapp.com/?trackid=${id}&format=lrc`);
    if (response.status != 200) {
        return [];
    }
    const data = await response.json();
    lyrics = [];
    data.lines.forEach(line => {
        lyrics.push(`[${line['timeTag']}] ${line['words']}\n`);
    });
    return lyrics;
}

save_lyrics = (lyrics, name) => {
    const blob = new Blob(lyrics, {type: "text/plain;charset=utf-8"});
    window.saveAs(blob, name);
}

downzip.addEventListener('click', () => {
    const zip = new JSZip();
    const promises = [];
    let count = 0;
    downzip.innerHTML = `<i class="fa fa-spinner fa-spin" aria-hidden="true"></i>`;
    downzip.classList.add('disabled');
    downloadbtn.forEach((btn) => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        promises.push(get_lyrics(id).then(lyrics => {
            if (lyrics.length == 0) {
                btn.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
                btn.classList.add('disabled');
                btn.previousElementSibling.classList.add('badge');
                btn.previousElementSibling.textContent = 'No lyrics found';
                return;
            }
            zip.file(`${name}.lrc`, lyrics.join(""));
            count++;
        }));
    });
    Promise.all(promises).then(() => {
        if (count != 0) {
            zip.generateAsync({type: "blob"}).then((content) => {
            window.saveAs(content, `${album_name}.zip`);
            setInterval(() => {
            downzip.innerHTML = '<span class="fs-4"><i class="fa fa-check" aria-hidden="true"></i> ZIP</span>';
            downzip.classList.remove('disabled');
            }, 2000);
        })}
        else {
            showToast('None of the tracks have lyrics');
            downzip.innerHTML = '<span class="fs-4"><i class="fa fa-times" aria-hidden="true"></i> ZIP</span>';
        }
    });
});

downloadbtn.forEach((btn) => {
    btn.addEventListener('click', async () => {
        btn.innerHTML = '<i class="fa fa-spinner fa-spin" aria-hidden="true"></i>';
        btn.classList.add('disabled');
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const lyrics = await get_lyrics(id);
        if (lyrics.length == 0) {
            btn.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
            btn.previousElementSibling.classList.add('badge');
            btn.previousElementSibling.textContent = 'No lyrics found';
            return;
        }
        save_lyrics(lyrics, `${name}.lrc`);
        btn.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i>';
        setInterval(() => {
            btn.innerHTML = '<i class="fa fa-download" aria-hidden="true"></i>';
            btn.classList.remove('disabled');
        }, 2000);
    });
});