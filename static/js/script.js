const toastmessage = document.getElementById('liveToast')
const toastbody = document.getElementsByClassName('toast-body')
showToast = (msg) => {
    const toast = new bootstrap.Toast(toastmessage)
    toastbody[0].textContent = msg;
    toast.show()
}