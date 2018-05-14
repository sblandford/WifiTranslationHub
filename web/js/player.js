var gStatus = {};
var gStatusUpdate = false;

var gPacket;
var gUpdateSeq = false;
var seqTimer = false;
var gCtx;

//Starting buffer time, can increase as required
var gFutureTime = 0.5;
var gAudioBufferTime = 0.3;
var gFutureIncrement = 0.1;
var gMaxChannels = 10;
var gAppUrl = "https://play.google.com/store/apps/details?id=eu.bkwsu.webcast.wifitranslation";

var gPrevChannel = 0;
var gPlaying = false;
var gSubsequentError = false;
var gPrevPlaying = false;
var gPlayError = false;
var gPrevPlayError = false;
var gLang = window.navigator.language.substring(0,2);

var gTimeMsLocalStart, gTimeMsRtpStart, gTimeCtxStart, gTimePresentationPrev, gTimeCtxRtpOffset;

var gAmrwbWorker = new Worker('js/amrwb-worker.js');

//Context menu
var gMenuDisplayed = false;
var gMenuBox = null;

//Goelocation
var gGeoActive = false;
var gGeoRequired = false;
var gGeoLat = null;
var gGeoLon = null;


function mobileAndTabletcheck () {
    var check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
}

//JSONP loader by Gianni Chiappetta
//https://gist.github.com/gf3/132080
var loadJSONP = (function(){
    var unique = 0;
    return function(url, callback, context) {
    // INIT
    var name = "jp" + unique++;
    if (url.match(/\?/)) url += "&callback="+name;
    else url += "?callback="+name;
    
    // Create script
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    
    // Setup handler
    window[name] = function(data){
        callback.call((context || window), data);
        document.getElementsByTagName('head')[0].removeChild(script);
        script = null;
        delete window[name];
    };
    
    // Load JSON
    document.getElementsByTagName('head')[0].appendChild(script);
  };
})();

//Poll status every two seconds
function pollStatus () {
    pollGeo ();
    loadJSONP(
        "/json/stat.json",
        function(newStatus) {
            if (JSON.stringify(gStatus) !== JSON.stringify(newStatus)) {
                console.log(newStatus);
                gStatus = newStatus;
                gStatusUpdate = true;
                updateDisplay();
            }
        }
    );
}

function updateDisplay() {
    var listHtml = '';
    for (var channel in gStatus) {
        if (!isNormalInteger(channel)) {
            continue;
        }
        var status = false;
        var name = (parseInt(channel) + 1).toString();
        var customName = false;
        
        if (gStatus[channel].hasOwnProperty('valid')) {
            status = gStatus[channel]['valid'];
        }
        if (gStatus[channel].hasOwnProperty("name")) {
            name = gStatus[channel]["name"];
            customName = true;
        }
        if (!customName) {
            name = LANG[gLang]["channel"] + " " + ((parseInt(channel) < 9)?"0":"") + name;
        }            
        if (status || (channel == 0) || (customName)) {

            if (status) {
                listHtml += "<a href=\"#\"" +
                " onclick=\"onclickChannel(" + channel + ");\"" +
                " ontouchend=\"ontouchendChannel(" + channel + ");\"" +
                ">" + name + "</a>\n";
            } else {
                listHtml += "<a href=\"#\" class=\"disabled\">" + name + "</a>\n";
            }
        }
        if (parseInt(channel) == parseInt(localStorage.channel)) {
            var chNameId = document.getElementById("chName");
            var startStopButtonId = document.getElementById("startStopButton");
            chNameId.innerHTML = name;
            if (status) {
                if (chNameId.classList.contains('chNameDead')) {
                    chNameId.classList.remove('chNameDead');
                }
                startStopButtonId.innerText = LANG[gLang][(gPlaying)?"stop":"start"];
                startStopButtonId.disabled = false;
                
            } else {
                if (!chNameId.classList.contains('chNameDead')) {
                    chNameId.classList.add('chNameDead');
                }
                startStopButtonId.innerText = (gPlaying)?LANG[gLang]["stop"]:"-";
                startStopButtonId.disabled = !gPlaying;
            }
        }
    }
    var element = document.getElementById("chSelectList");
    element.innerHTML = listHtml;
    document.getElementById("chSelectBtn").innerText = LANG[gLang]["select"];
    
    document.getElementById("geoBoxText").innerText = LANG[gLang]["geoText"];    
    document.getElementById("geoConfirmButton").innerText = LANG[gLang]["geoYes"];
    document.getElementById("geoDeclineButton").innerText = LANG[gLang]["geoNo"];
}

function isNormalInteger(str) {
    return /^\+?(0|[1-9]\d*)$/.test(str);
}

/* TODO If status has "geo" property then location must be sent to host
 * The host then checks if location is in range and if so allows
 * packets to be sent
 */


function readPackets () {
    var channel = parseInt(localStorage.channel);

    var channelText = (channel <= 9)?("0" + channel):channel.toString();
    channelText = channelText.substr(channelText.length - 2);
    var url = "/rtp/" + channelText + "?uuid=" + localStorage.uuid;
    
    if (gGeoLat) {
        url += "&lat=" + gGeoLat + "&lon=" + gGeoLon;
    }

    gUpdateSeq = false;
    loadJSONP(
        url,
        function(thisSeq) {
            if (thisSeq.hasOwnProperty("seq")) {
                //Wait for next packet
                var seq = (thisSeq["seq"] + 1 + (gPlayError?1:0)) & 0xFFFF;
                console.log("Next Seq available : " + seq);
                readNextPacket(seq);
            }
        }
    );       
}


//Read RTP packets over HTTP
function readNextPacket (seq) {
    var req = new XMLHttpRequest();
    
    var channel = parseInt(localStorage.channel);

    var channelText = (channel <= 9)?("0" + channel):channel.toString();
    channelText = channelText.substr(channelText.length - 2);
    var url = "/rtp/" + channelText + "/" + seq;

    console.log("Request seq : " + seq);
    req.onload = function () {
        if (req.status == 200) {
            var arrayBuffer = req.response;

            gSubsequentError = false;
            if (arrayBuffer) {
                gPacket = new Uint8Array(arrayBuffer);

                if (gPacket && gPlaying) {
                    //Only proceed if packet is for this channel
                    var channel = parseInt(req.responseURL.match(/\/[0-9][0-9](\?|\/)/)[0].match(/[0-9][0-9]/)[0]);
                    if (channel == channel) {
                        playRtpPacket(gPacket);
                    }
                }
                
                //Next gPacket
                if (gPlaying) {
                    if (gUpdateSeq) {
                        //Query next packet
                        readPackets();
                    } else {
                        //Calculate next packet
                        seq = (seq + 1) & 0xFFFF;
                        readNextPacket(seq);
                    }
                }
            }
        } else {
            badPacket();
        }
    };
    //Try again after time
    req.onerror = function () {
        badPacket();
    };

    req.responseType = "arraybuffer";
    req.open("GET", url);
    req.setRequestHeader("Cache-Control","");
    req.setRequestHeader("pragma","");
    req.send();
    
}

function badPacket () {
    if (gPlaying) {
        if (gSubsequentError) {
            setTimeout(function () {
                readPackets();
            }, 1000);
        } else {
            reallyBad = true;
            gPlayError = true;
            readPackets();
        }
    }
    gPlayError = true;
}

function playRtpPacket(gPacket) {
    
    var timePresentation;
    if (gPlaying) {        
        //Quit if this doesn't look like a valid AMR RTP packet
        if ((gPacket[0] != 0x80) && (gPacket[1] != 0xE1)) {
            return;
        }
        
        var rtpTimeCode = (gPacket[4] << 24) + (gPacket[5] << 16) + (gPacket[6] << 8) + gPacket[7];
        
        //Sample rate is always 16000 Hz
        var timeRtpMsNow = (rtpTimeCode / 16);
        if ((!gTimeMsRtpStart || gPlayError) && gPlaying) {
            gTimeMsRtpStart = timeRtpMsNow;
            gTimeCtxRtpOffset = gCtx.currentTime;
        }
        if (!gTimeMsLocalStart) {
            gTimeMsLocalStart = ((new Date).getTime() / 1000.0);
        }
        //Loop round
        if (timeRtpMsNow < gTimeMsRtpStart) {
            gTimeMsRtpStart -= parseInt("0x100000000", 16);
        }
        var timeRtp = ((timeRtpMsNow - gTimeMsRtpStart) / 1000.0) + gTimeCtxRtpOffset;
    
    
        gAmrwbWorker.postMessage([gPacket, timeRtp]);
    }
}

function playPcm(samples, timeRtp) {
    
    if (samples && gPlaying) {
        //Append new samples to buffer
        var newBuffer = new Float32Array(playPcm.buffer.length + samples.length);
        newBuffer.set(playPcm.buffer);
        newBuffer.set(samples, playPcm.buffer.length);
        playPcm.buffer = newBuffer;

        if (playPcm.buffer.length >= (gAudioBufferTime * 32000)) {
        
            var src = gCtx.createBufferSource();
            var buffer = gCtx.createBuffer(1, playPcm.buffer.length, 32000);
            buffer.getChannelData(0).set(playPcm.buffer);
            src.buffer = buffer;
            src.connect(gCtx.destination);
            timePresentation = gTimeCtxStart + timeRtp + gFutureTime;
            
            src.start(timePresentation);
            
            /*var out = new Uint8Array(samples.length);
            for (var i = 0; i < out.length * 2; i += 2) {
                var int16sample = (samples[i] * 32768)
                out[i] = int16sample / 256
                out[i + 1] = int16sample & 255
            }
            document.getElementById("out").innerHTML = toHex(out, 48);*/
            gPlayError = false;

            if (!timePresentation) {
                timePresentation = 0;
            }

            timeMargin = timePresentation - gCtx.currentTime;
            
            //console.log("Presentation time : " + timePresentation + ", Presentation - RTPtime : " + (timePresentation - timeRtp) + ", Presentation - CTXtime: " + timeMargin + ", Buffer time : " + gFutureTime);
            gTimePresentationPrev = timePresentation;
            
            /* if (timeMargin < 0.1) {
                timeMargin += gFutureIncrement;
            }*/
            
            document.getElementById("stat").innerText = timeMargin.toFixed(2);;
            
            playPcm.buffer = new Float32Array(0);
        }
    
    }
}

gAmrwbWorker.onmessage = function (e) {
    var samples = e.data[0];
    var timeRtp = e.data[1];
    playPcm(samples, timeRtp);
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}

function toHex(buffer, width) {
    var str = "";
    for (var i = 0; i < buffer.length; i++) {
        var s = buffer[i].toString(16);
        if (s.length == 1) {
            s = "0" + s;
        }
        str += s;
        if (i % width == width - 1) { // bytes per line
            str += "\n";
        } else if (i % 2 == 1) { // add a space seperator every two bytes.
            str += " ";
        }
    }
    return str;
}


function onclickStart() {
    if (!mobileAndTabletcheck()) {
        startPlayer();
    }
}
function ontouchendStart() {
    if (mobileAndTabletcheck()) {
        startPlayer();
    }    
}
function onclickChannel(channel) {
    if (!mobileAndTabletcheck()) {
        localStorage.channel = channel;
        updateDisplay();
        if (gPlaying) {
            stopPlayer();
            startPlayer(localStorage.channel);
        }
    }
}
function ontouchendChannel(channel) {
    if (mobileAndTabletcheck()) {
        localStorage.channel = channel;
        updateDisplay();
        if (gPlaying) {
            stopPlayer();
            startPlayer(localStorage.channel);
        }
    }
}

function startStopPlayerClick() {
    if (!mobileAndTabletcheck()) {
        if (gPlaying) {
            stopPlayer();
        } else {
            startPlayer();
        }
        updateDisplay();
    }
}

function startStopPlayerTouchend() {
    if (mobileAndTabletcheck()) {
        if (gPlaying) {
            stopPlayer();
        } else {
            startPlayer();
        }
        updateDisplay();
    }
    
}



function buttonStatus () {
    channel = parseInt(localStorage.channel);
    if ((gPlayError != gPrevPlayError) ||
        (gPlaying != gPrevPlaying) ||
        (channel != gPrevChannel)) {
        for (var i=0; i < gMaxChannels; i++) {
            var element = document.getElementById("channelButton" + i);
            if ((i == channel) && gPlaying) {
                element.classList.add(gPlayError?"errorState":"playing");
                element.classList.remove(!gPlayError?"errorState":"playing");
            } else {
                element.classList.remove("errorState");
                element.classList.remove("playing");
            }
        }
        gPrevChannel = channel;
        gPrevPlayError = gPlayError;
        gPrevPlaying = gPlaying;
    }
}
//setInterval(buttonStatus, 500);

function startPlayer() {
    //Do we need to get position
    if (gStatus.hasOwnProperty('onLan') && !gStatus['onLan'] && !gGeoLat) {
        var geoDiv = document.getElementById("geoBox");
        geoDiv.classList.add("geoShow");
    } else {
        startPlayer2();
    }
}

function startPlayer2 () {
    gPlaying = true;
    if (!gCtx) {
        gCtx = new (window.AudioContext || window.webkitAudioContext)();

        // create a dummy sound - and play it immediately in same 'thread'
        var blankBuffer = gCtx.createBuffer(1, 1600, 32000);
        var source = gCtx.createBufferSource();
        source.buffer = blankBuffer;
        source.connect(gCtx.destination);
        if (!gTimeCtxStart) {
            gTimeCtxStart = gCtx.currentTime;
        }        
        source.start();
    }
    
    //Start the sequence query timer to ping every minute
    gUpdateSeq = false;
    seqTimer = setInterval(function() {
        gUpdateSeq = true;
    }, 60 * 1000); 

    playPcm.buffer = new Float32Array(0);
    readPackets();    
}

function stopPlayer() {
    gPlaying = false;
    if (seqTimer) {
        clearInterval(seqTimer);
        seqTimer = false;
    }
    if (gCtx) {
        gCtx.close();
        gCtx = null;
    }
    gPacket = null;
    gTimeMsRtpStart = null;

    gTimeMsLocalStart = null;
    gTimePresentationPrev = null;
    
    gPlayError = false;
    gAmrwbWorker.postMessage([null, null]);
}

//Drop down menu related
function chSelect() {
    document.getElementById("chSelectList").classList.toggle("show");
}
// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {

    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
  //Hide QR code if showing
  if (!event.target.matches('.qrBtn')) {
    var boxDiv = document.getElementById("qrBox");
    if (boxDiv.classList.contains("qrShow")) {
        boxDiv.classList.remove("qrShow");
    }
  }
}

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

//Fetch coordinates if we have permission
function pollGeo () {
    //Check if we have permissions and fetch if we don't already have
    if (navigator.permissions && !gGeoLat) {
        navigator.permissions.query({name: 'geolocation'}).then(function(PermissionStatus) {
            if('granted' === PermissionStatus.state) {
                getGeo ();
            }
        });
    }
}

function getGeo () {
    navigator.geolocation.getCurrentPosition(function(geoposition) {
        gGeoLat = geoposition.coords.latitude;
        gGeoLon = geoposition.coords.longitude;
    });
}

//Get user approval before browser also asks for approval
//This is to reduce the likelyhood of the user refusing permission as a reflex action
//and having to reset the "remembered" response again
function geoApprove() {
    var geoDiv = document.getElementById("geoBox");
    geoDiv.classList.remove("geoShow");
    getGeo ();
}
function geoDecline() {
    var geoDiv = document.getElementById("geoBox");
    geoDiv.classList.remove("geoShow");    
}

//Start here
if (!localStorage.hasOwnProperty("uuid")) {
    localStorage.uuid = guid();
}
if (!localStorage.hasOwnProperty("channel")) {
    localStorage.channel = 0;
}
//Default to English if language not found
if (! LANG.hasOwnProperty(gLang)) {
    gLang = "en";
}

//Bounce Android devices to app on first view
if (includeApp && !localStorage.hasOwnProperty("isAndroid")) {
    var ua = navigator.userAgent.toLowerCase();
    var isAndroid = (ua.indexOf("android") > -1);
    if(isAndroid) {
        window.location = gAppUrl;
    }
    localStorage.isAndroid = isAndroid;
}

console.log("UUID is " + localStorage.uuid);
window.onload = function () {
    if (localStorage.isAndroid === "true" ) {
        document.getElementById("appDiv").classList.add("appShow");
    }
    pollStatus();
    setInterval(pollStatus, 2000);
}
