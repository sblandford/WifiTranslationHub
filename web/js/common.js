function showQr() {
    var boxDiv = document.getElementById("qrBox");
    var boxObj = document.getElementById("qrObj");
    var boxWidth = boxDiv.offsetWidth;
    var boxHeight = boxDiv.offsetHeight;
    
    boxObj.width = document.documentElement.clientWidth;
    boxObj.height = document.documentElement.clientHeight * 0.6;
    
    if (boxWidth < 400) {
        scale = boxWidth / 400;
        boxObj.style.transform = "scale(" + scale + ")";
    } else {
        boxObj.style.transform = "scale(1)";
    }
    boxDiv.classList.toggle("qrShow");
}

// https://stackoverflow.com/questions/4907843/open-a-url-in-a-new-tab-and-not-a-new-window-using-javascript
function openInNewTab(url) {
    var a = document.createElement("a");
    a.target = "_blank";
    a.href = url;
    a.click();
}
