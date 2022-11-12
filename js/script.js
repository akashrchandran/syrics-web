const button = document.getElementById('download-button');
const text = document.getElementById('search');
const lyrics_api = 'https://spotify-lyric-api.herokuapp.com/?format=lrc&';
button.addEventListener('click', function() {
  let trackid = text.value;
  let array = [];
  fetch(lyrics_api + `trackid=${trackid}`)
    .then(response => response.json())
    .then(data => {
      for(lyrics of data.lines) {
        array.push(`[${lyrics['timeTag']}] ${lyrics['words']}\n`);
        var blob = new Blob(array, {type: "text/plain;charset=utf-8"});
      }
      window.saveAs(blob, "helloworld.lrc");
    }).catch(err => {
      console.log("Error" + err);
    });
});