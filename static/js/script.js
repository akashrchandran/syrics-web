const toastmessage = document.getElementById('liveToast')
const toastbody = document.getElementsByClassName('toast-body')
showToast = (msg) => {
    const toast = new bootstrap.Toast(toastmessage)
    toastbody[0].textContent = msg;
    toast.show()
}
document.addEventListener('DOMContentLoaded', function () {
    const settingsForm = document.getElementById('settingsForm');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
    const fileNameFormat = document.getElementById('fileNameFormat');

    const tagify = new Tagify(fileNameFormat, {
        whitelist: ["track_name", "track_no", "album"],
        dropdown: {
            enabled: 0,
            maxItems: 20,
            classname: "tags-look",
            closeOnSelect: false
        },
        pattern: /^[a-zA-Z0-9_\-\.]+$/
    });
    var dragsort = new DragSort(tagify.DOM.scope, {
        selector: '.'+tagify.settings.classNames.tag,
        callbacks: {
            dragEnd: onDragEnd
        }
    })
    
    // must update Tagify's value according to the re-ordered nodes in the DOM
    function onDragEnd(elm){
        tagify.updateValueByDOMTags()
    }

    // Load settings from local storage
    const savedSettings = JSON.parse(localStorage.getItem('lyricsSettings'));
    if (savedSettings) {
        document.getElementById('lyricsType').value = savedSettings.lyricsType;
        tagify.addTags(savedSettings.fileNameFormat);
    } else {
        // Set default tags
        tagify.addTags([{ value: "track_name" }, { value: "track_no" }, { value: "album" }]);
    }

    saveSettingsBtn.addEventListener('click', function () {
        const formData = new FormData(settingsForm);
        const lyricsType = formData.get('lyricsType');

        // Get the file name format
        const fileNameFormatValues = tagify.value.map(tag => tag.value);

        // Save settings to local storage
        const settings = {
            lyricsType: lyricsType,
            fileNameFormat: fileNameFormatValues
        };
        localStorage.setItem('lyricsSettings', JSON.stringify(settings));

        // Here you can handle the selected lyrics type and file name format
        console.log('Selected lyrics type:', lyricsType);
        console.log('File name format:', fileNameFormatValues);

        // Close the modal
        console.log('Settings saved successfully!');
        settingsModal.hide();

        // Show success message
        showToast("Settings saved successfully!");
    });
});