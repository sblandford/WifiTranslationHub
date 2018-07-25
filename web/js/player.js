var gStatus = {};
var gStatusUpdate = false;

var gPacket;
var gUpdateSeq = false;
var seqTimer = false;
var gCtx;

//Packet capture
var gNextSeqQry = -1;
var gPktTime = -1;
var gPkts = {};
var gPktFails = 0;
var gMaxPktFails = 20;
var gPktLifetime = 1000;
var gPktRetry = 20;
var gBuffStarted = false;
var gBufferLoop = null;
var gSeqUpdateLoop = null;
var gWatchDogTmr = null;
var gWatchDogInterval = 2000;
var gSeq = -1;
var gSeqArrived = -1;
var gMaxSeqOops = 10;
var gSeqUpdateTime = 60000;
var gSeqStatCount = 10;
var gWatchDogOK = true;

//Audio parameters
var gDecodeLoop = null;
var gAudioPacketBufferTime = 200;
var gstartDecodeTimeStamp = null;
var gDecodeTime = null;

//Starting buffer time, can increase as required
var gFutureTime = 0.05;
var gAudioBufferTime = 0.3;
var gFutureIncrement = 0.01;
var gMaxChannels = 10;
var gAppUrl = "https://play.google.com/store/apps/details?id=eu.bkwsu.webcast.wifitranslation";
var gJsonpTimeout = 500;

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
var gGeoLat = null;
var gGeoLon = null;
var gGeoInRange = false;
var gOnLan = false;
var gStartAfterGeo = false;


var gPlayTimeout;
var gPlayTimeoutMs = 1000 * 60 * 60 * 2; // 2 hours


function mobileAndTabletcheck () {
    var check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
}

//Based on JSONP loader by Gianni Chiappetta
//https://gist.github.com/gf3/132080
var loadJSONP = (function(){
    var unique = 0;
    return function(url, callback, errCallback, context, callbackName) {
    // INIT
    var name = "jp" + unique++;
    if (callbackName) {
        name = callbackName;
    }
    if (url.match(/\?/)) {
        url += "&callback="+name;
    } else {
        url += "?callback="+name;
    }
    
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
    
    // Timeout (assume error)
    setTimeout(function () {
        expireJSONP(name, script, errCallback, context);
    }, gJsonpTimeout);
    
    // Load JSON
    document.getElementsByTagName('head')[0].appendChild(script);
  };
})();
function expireJSONP (name, script, errCallback, context) {
    //If handler hasn't triggered then callback will still exist
    if (window.hasOwnProperty(name)) {
        if (errCallback) {
            errCallback.call((context || window));
        }
        //Clean up
        try {
            document.getElementsByTagName('head')[0].removeChild(script);
        } catch (err) {
            ;//Pass
        }
        script = null;
        delete window[name];
    }
}


//Poll status every two seconds
function pollStatus () {
    //Quick polling until location known
    if (!gOnLan && !gGeoLat) {
        pollGeo ();
    }
    loadJSONP(
        "/json/stat.json",
        function(newStatus) {
            if (JSON.stringify(gStatus) !== JSON.stringify(newStatus)) {
                console.log(newStatus);
                gStatus = newStatus;
                gStatusUpdate = true;
                updateDisplay();
                if (!checkStreamOK) {
                    stopPlayer();
                    updateDisplay();
                }
            }
        }, null, null, "jpstat"
    );
}

function checkStreamOK () {
    var channel = parseInt(localStorage.channel);
    return (gStatus.hasOwnProperty[channel] && gStatus[channel].hasOwnProperty['valid'] && gStatus[channel]['valid']);
}

function watchDog () {
    gWatchDogTmr = setInterval(function () {
        if (!gWatchDogOK) {
            stopPlayer();
            updateDisplay();
        }
        gWatchDogOK = false;
    }, gWatchDogInterval);
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
            if (gOnLan || gGeoInRange || !gGeoLat) {
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
            } else {
                startStopButtonId.innerText = LANG[gLang]["outRange"];
                startStopButtonId.disabled = true;
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

function getNextSeq () {
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
                var seq = (thisSeq["seq"] + 1) & 0xFFFF;
                console.log("Next Seq available : " + seq);
                if (gSeq == -1) {
                    testPacket (seq);
                }
                //Panic if wildly wrong
                if ((gSeq != -1) && diffSeq(gNextSeqQry, seq) > gMaxSeqOops) {
                    console.log("Large difference between calculated and actual seq");
                    stopPlayer();
                    updateDisplay();
                }
                gNextSeqQry = seq;                
            }
        },
        function () {
            stopPlayer();
            updateDisplay();
        }
    );
}

//Measure the timecode difference between two packets
function testPacket (seq) {
    fetchNewPacket(seq, function (seq) {
        if (pktValid(gPkts[seq])) {
            var time1 = pktTimeCode(gPkts[seq]);
            seq++;
            fetchNewPacket(seq, function (seq) {
                if (pktValid(gPkts[seq])) {
                    var time2 = pktTimeCode(gPkts[seq]);
                    gPktTime = time2 - time1;
                    console.log("Packet time is : " + gPktTime + "ms");
                    fillBuffer(seq);
                    playBuffer(seq);
                    watchDog();
                }
            });
        }
    });
}


function fillBuffer(seq) {
    if (gPktTime < 0) {
        return;
    }
    gSeq = seq;
    gNextSeqQry = -1;
    //Re-check seq number with server every minute
    //Also refreshes UUID timeout for stats
    gSeqUpdateLoop = setInterval(function() {
        getNextSeq ();
    }, gSeqUpdateTime);
    //Just keep loading packets like crazy
    gBufferLoop = setInterval(function() {
        gSeq = (gSeq + 1) & 0xFFFF;
        //If we have new sync for server use that
        if (gNextSeqQry > 0) {
            gSeq = gNextSeqQry;
            gNextSeqQry = -1;
        }
        fetchNewPacket(gSeq);
    }, gPktTime);
}

//Returns true if sequence number a > b, or a >= b
//Assumes that both a and b are incrementing counters
//closely following each other
function cmpSeq(a, b, isEqual = false) {
    if ((a & 0x8000) && !(b & 0xC000)) {
        //b > a rollover assumed
        return false;
    }
    if (!(a & 0xC000) && (b & 0x8000)) {
        //a > b rollover assumed
        return true;
    }
    return (isEqual)?(a >= b):(a > b);
}

function diffSeq(a, b) {
    if ((a & 0x8000) && !(b & 0xC000)) {
        //b > a rollover assumed
        b += 0x10000;
    }
    if (!(a & 0xC000) && (b & 0x8000)) {
        //a > b rollover assumed
         a += 0x10000;
    }
    return Math.abs(a - b);
}

function playBuffer(seq) {
    var packetLag = Math.ceil(gAudioPacketBufferTime / gPktTime)
    var statCounter = 0;
    var nextFail = false;
    var futureFail = false;
    var currentFail = false;
    var reSync = false;
    console.log("Playing behind by " + packetLag + " packets");
    seq = (seq - packetLag) & 0xFFFF;
    gDecodeLoop = setInterval(function() {
        var seqPrev = seq;
        var seqPrevOk = ((gPkts.hasOwnProperty(seqPrev) && gPkts[seqPrev]) != false);
        
        seq = (seq + 1) & 0xFFFF;
        
        //This should happen but reset if it does
        /*if (cmpSeq(seq, gSeq, true)) {
            console.log("Resetting wayward audio seq from " + seq + " to " + (gSeq - packetLag));
             seq = (gSeq - packetLag) & 0xFFFF;
        }*/
        //Pull back if polling too soon
        /*if (cmpSeq(seq, gSeqArrived)) {
            console.log("Audio polling queue to soon shifting seq from " + seq + " to " + (gSeqArrived - packetLag) & 0xFFFF);
            seq = (gSeqArrived - packetLag) & 0xFFFF;
        }*/
        var seqOK = ((gPkts.hasOwnProperty(seq) && gPkts[seq]) != false);
        var seqNext = (seq + 2) & 0xFFFF;
        var seqNextOk = ((gPkts.hasOwnProperty(seqNext) && gPkts[seqNext]) != false);
        var seqFuture = (seq + 3) & 0xFFFF;
        var seqFutureOk = ((gPkts.hasOwnProperty(seqFuture) && gPkts[seqFuture]) != false);
        
        if (!seqNextOk) {
            nextFail = true;
        }
        if (!seqFutureOk) {
            futureFail = true;
        }

        console.log ((seqPrevOk | 0) + " " + (seqOK | 0) + " " + (seqNextOk| 0) + " " + (seqFutureOk| 0) + ", Seq : " + seq + ", Available : " + gSeqArrived );
        if (seqOK) {
            playRtpPacket(gPkts[seq], reSync);
            //Clear reSync flag
            reSync = false;
            //Delete last packet
            if (gPkts.hasOwnProperty(seqPrev)) {
                delete gPkts[seqPrev];
            }
        } else {
            currentFail = true;
            if (seqPrevOk) {
                //This isn't delete but will be picked up
                //by lifetime expire
                pokePktTimeCode(gPkts[seqPrev], (seqPrev - seq));
                console.log("Filling in for missing packet : " + seq + " with " + seqPrev);
                playRtpPacket(gPkts[seqPrev]);
            }
        }
        //Evaluate stats
        if (statCounter++ > gSeqStatCount) {
            statCounter = 0;
            
            //Increase lag if problems or potential problems occured
            if (currentFail || nextFail) {
                console.log("Increasing buffer length by 1");
                seq = (seq - 1) & 0xFFFF;
                reSync = true;
            } else {           
                //Decrease lag if safe to do so
                if (!futureFail && ((gSeq - seq) > 1)) {
                    console.log("Decreasing buffer length by 1");
                    if (seqOK) {
                        console.log("Filling in for missing packet : " + (seq + 1) + " with " + seq);
                        pokePktTimeCode(gPkts[seq], 1);
                        playRtpPacket(gPkts[seq]);
                    }
                    seq = (seq + 1) & 0xFFFF;
                    reSync = true;
                }
            }
            currentFail = false;
            nextFail = false;
            futureFail = false;
        }
        
        
    }, gPktTime);           
}

function fetchNewPacket (seq, handler) {
    //Create placeholder for received packet
    gPkts[seq] = null;
    fetchPacket(seq, handler);
}

function packetFail () {
    if (gPktFails++ > gMaxPktFails) {
        console.log("Too many consecutive bad packets");
        stopPlayer();
        updateDisplay();
    }
}

function fetchPacket (seq, handler) {
    //Abort if packet has expired
    if (!gPkts.hasOwnProperty(seq)) {
        return
    }
    
    var req = new XMLHttpRequest();
    
    //Create URL
    var channel = parseInt(localStorage.channel);
    var channelText = (channel <= 9)?("0" + channel):channel.toString();
    channelText = channelText.substr(channelText.length - 2);
    var url = "/rtp/" + channelText + "/" + seq;

    console.log("Request seq : " + seq);
    req.onload = function () {
        if (req.status == 200) {
            //Abort if packet placeholder has expired
            if (!gPkts.hasOwnProperty(seq)) {
                return;
            }

            var arrayBuffer = req.response;
            
            //Abort if no data
            if (!arrayBuffer) {
                return
            }
            
            var packet = new Uint8Array(arrayBuffer);
            
            if (packet) {
                //Only proceed if packet is for this channel
                var channel = parseInt(req.responseURL.match(/\/[0-9][0-9](\?|\/)/)[0].match(/[0-9][0-9]/)[0]);
                if (channel == channel) {
                    gPktFails = 0;
                    gPkts[seq] = packet;
                    //Most recently arrived packet
                    if (cmpSeq(seq, gSeqArrived) > gMaxSeqOops) {
                        console.log("Massive calculed seq: " + seq + " vs available seq : " + gSeqArrived);
                        gSeqArrived = seq;
                    }
                    if (seq > gSeqArrived) {
                        gSeqArrived = seq;
                    }
                    if (handler) {
                        handler(seq);
                    }
                }
            }
        } else {
            retryPacket();
        }
    };
    //Try again after time
    req.onerror = function () {
        retryPacket(seq);
    };
    req.ontimeout = function () {
        if (gPkts.hasOwnProperty(seq)) {
            delete gPkts[seq];
        }        
        packetFail();
    }

    req.responseType = "arraybuffer";
    req.open("GET", url);
    req.setRequestHeader("Cache-Control","");
    req.setRequestHeader("pragma","");
    req.timeout = gPktLifetime;
    req.send();    
}
function retryPacket (seq) {
    //Retry packet after delay if still valid
    if (gPkts.hasOwnProperty(seq)) {
        packetFail();
        setTimeout(function () {
            console.log("Retrying packet : " + seq);
            fetchPacket(seq);
        }, gPktRetry);        
    }
}


function playRtpPacket(gPacket, reSync = false) {
    
    var timePresentation;
    if (gPlaying) {        
        //Quit if this doesn't look like a valid AMR RTP packet
        if (!pktValid(gPacket)) {
            return;
        }
        
        var timeRtpMsNow = pktTimeCode (gPacket);
        if ((!gTimeMsRtpStart || gPlayError || reSync) && gPlaying) {
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
    
        if (!gstartDecodeTimeStamp) {
            gstartDecodeTimeStamp = (new Date).getTime();
        }
        gAmrwbWorker.postMessage([gPacket, timeRtp]);
    }
}

function pktValid(packet) {
    //Valid AMR-WB packet?
    return (packet && ((packet[0] == 0x80) && (packet[1] == 0xE1)))
}
function pktTimeCode (packet) {
    var rtpTimeCode = (packet[4] << 24) + (packet[5] << 16) + (packet[6] << 8) + packet[7];
    //Magic number 16 is because AMR-WB sample rate is always 16000 Hz
    return (rtpTimeCode / 16);    
}
function pokePktTimeCode (packet, seqOffset) {
    var rtpTimeCode = (packet[4] << 24) + (packet[5] << 16) + (packet[6] << 8) + packet[7];
    //Magic number 16 is because AMR-WB sample rate is always 16000 Hz
    var offset = seqOffset * gPktTime * 16;
    
    rtpTimeCode += offset;
    
    //Insert new timecode
    packet[4] = rtpTimeCode >> 24;
    packet[5] = (rtpTimeCode >> 16) & 0xFF;
    packet[6] = (rtpTimeCode >> 8) & 0xFF;
    packet[7] = rtpTimeCode & 0xFF;
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
            gWatchDogOK = true;
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
    if (gstartDecodeTimeStamp) {
        gDecodeTime = ((new Date).getTime() - gstartDecodeTimeStamp) / 1000.0;
        
        if (gDecodeTime > (gFutureTime / 2)) {
            console.log("Increasing audio DSP time allocation from " + gFutureTime + " by " + gFutureIncrement);
            gFutureTime += gFutureIncrement;
        }
    }
    gstartDecodeTimeStamp = null;
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
    //Kill any existing players
    stopPlayer();
    //Do we need to get position
    if (!gOnLan && !gGeoLat) {
        var geoDiv = document.getElementById("geoBox");
        gStartAfterGeo = true;
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
    
    playPcm.buffer = new Float32Array(0);
    
    gSeq = -1;
    getNextSeq ();
    
    //Stop player eventually to prevent forgotten app using too much data
    gPlayTimeout = setTimeout(function () {
        console.log("Player time out after " + (gPlayTimeoutMs / (1000 * 60 * 60)) + " hours");
        stopPlayer();
        updateDisplay();
    }, gPlayTimeoutMs);  
}

function stopPlayer() {
    gPlaying = false;
    gNextSeqQry = -1;
    gPktTime = -1;    
    
    if (seqTimer) {
        clearInterval(seqTimer);
        seqTimer = false;
    }
    if (gPlayTimeout) {
        clearInterval(gPlayTimeout);
        gPlayTimeout = null;
    }    
    if (gCtx) {
        gCtx.close();
        gCtx = null;
    }
    
    //Stop packet reading loops
    clearInterval(gBufferLoop);
    clearInterval(gSeqUpdateLoop);
    clearInterval(gDecodeLoop);
    clearInterval(gWatchDogTmr);
    gBufferLoop = null;
    gSeqUpdateLoop = null;
    gDecodeLoop = null;
    gWatchDogTmr = null;
    
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

//Fetch coordinates if we have permission and we need to
function pollGeo () {

    //Check if we have permissions and fetch if we don't already have
    if (navigator.permissions) {
        navigator.permissions.query({name: 'geolocation'}).then(function(PermissionStatus) {
            if('granted' === PermissionStatus.state) {
                getGeo ();
            }
        });
    }
}
function getGeo () {
    navigator.geolocation.getCurrentPosition(function(geoposition) {
        var triggerPoll = false
        if (!gGeoLat) {
            triggerPoll = true
        }
        gGeoLat = geoposition.coords.latitude;
        gGeoLon = geoposition.coords.longitude;
        if (triggerPoll) {
            pollLanRange();
            updateDisplay();
        }
        if (gStartAfterGeo) {
            gStartAfterGeo = false;
            startPlayer2();
        }
    });
}
function pollLanRange () {
    pollGeo ();
    url = "/json/lanrange.json";
    if (gGeoLat) {
        url += "?lat=" + gGeoLat + "&lon=" + gGeoLon;
    }    
    loadJSONP(
        url,
        function(langRangeStat) {
            var onLanPrev = gOnLan;
            var geoInRangePrev = gGeoInRange;
            if (langRangeStat.hasOwnProperty('onLan')) {
                gOnLan = langRangeStat['onLan'];
            }
            if (langRangeStat.hasOwnProperty('inRange')) {
                gGeoInRange = langRangeStat['inRange'];
            }
            if ((onLanPrev != gOnLan) || (geoInRangePrev != gGeoInRange)) {
                updateDisplay();
            }
        }
    );    
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
    pollLanRange();
    pollStatus();
    setInterval(pollStatus, 2000);
    setInterval(pollLanRange, 120000);
}
