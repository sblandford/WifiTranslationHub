var gStatus = {};
var gStatusUpdate = false;

var gPacket;
var gUpdateSeq = false;
var gCtx;

//Packet capture
var gMinPacketTimeMs = 10;
var gPacketTimeCount = 1;
var gPacketTimeCountMax = 10;
var gNextSeqQry = -1;
var gPktTime = -1;
var gPkts = {};
var gPktFails = 0;
var gMaxPktFails = 20;
var gPktLifetime = 1000;
var gPktRetryDiv = 3
var gPktRetryMinMs = 20;
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
var gWatchDogBusy = false;

//Audio parameters
var gDecodeLoop = null;
var gAudioPacketBufferTime = 200;
var gstartDecodeTimeStamp = null;
var gDecodeTime = null;
var gDecodeTimeAv = null;
var gDecodeTimeAvN = 50;

//Starting buffer time, can increase as required
var gFutureTime = 0.10;
var gFutureTimeMin = 0.05;
var gAudioBufferTime = 0.3;
var gFutureChangeThreshold = 0.2;
var gFutureMargin = 3;
var gFutureHoldoff = 10;
var gFutureHoldoffCount = 0;
var gMaxChannels = 10;
var gAppUrl = "https://play.google.com/store/apps/details?id=eu.bkwsu.webcast.wifitranslation";
var gJsonpTimeout = 1000;
var gDecreaseCount = 0;
var gDecreaseHoldoff = 10;

var gPrevChannel = 0;
var gPlaying = false;
var gSubsequentError = false;
var gPrevPlayIntention = false;
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
var gOnLanValid = false;
var gGeoDeclined = false;
var gGeoStart2 = false;


//State
var gPlayTimeout;
var gPlayTimeoutMs = 1000 * 60 * 60 * 2; // 2 hours
var gPlayIntention = false;
var gPlayerHope = false;
var gEnacting = false;

var dAudio;

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
    if (gOnLanValid && !gOnLan && !gGeoLat) {
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
                    fullStopPlayer();
                    updateDisplay();
                }
            }
        }, null, null, "jpstat"
    );
    //Get player into intended state
    if (gPlayIntention && !gPlaying && !gEnacting) {
        startPlayer();
        updateDisplay();
    }
    if (!gPlayIntention && gPlaying && !gEnacting) {
        console.log("Stopping to intended state");
        stopPlayer();
        updateDisplay();
    }
}

function checkStreamOK () {
    //Check channel is still valid and in range
    var channel = parseInt(localStorage.channel);
    return (gStatus.hasOwnProperty[channel] && gStatus[channel].hasOwnProperty['valid'] && gStatus[channel]['valid']);
}

function watchDog () {
    if (!gWatchDogTmr) {
        gWatchDogTmr = setInterval(function () {
            if (!gWatchDogOK && !gWatchDogBusy) {
                gWatchDogBusy = true;
                console.log("Watchdog timeout");
                stopPlayer();
                updateDisplay();
                gWatchDogOK = true;
                gWatchDogBusy = false;
            } else {
                gWatchDogOK = false;
            }
        }, gWatchDogInterval);
    }
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
            if (status && (gOnLan || gGeoInRange || !gOnLanValid || (!gGeoLat && !gGeoDeclined))) {
                if (chNameId.classList.contains('chNameDead')) {
                    chNameId.classList.remove('chNameDead');
                }
                startStopButtonId.innerText = LANG[gLang][(gPlayIntention)?"stop":"start"];
                startStopButtonId.disabled = false;
            } else {
                if (!chNameId.classList.contains('chNameDead')) {
                    chNameId.classList.add('chNameDead');
                }
                startStopButtonId.innerText = (gPlayIntention)?LANG[gLang]["stop"]:"Start";
                startStopButtonId.disabled = !gPlayIntention;
            }
            if (!gOnLan && !gGeoInRange && gOnLanValid && (gGeoLat || gGeoDeclined)) {
                document.getElementById("stat").innerText = (gGeoDeclined)?LANG[gLang]["geoDeclined"]:LANG[gLang]["outRange"];
            } else {
                document.getElementById("stat").innerText = "";
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
                    watchDog();
                    testPacket (seq);
                }
                //Panic if wildly wrong
                if ((gSeq != -1) && diffSeq(gSeq, seq) > gMaxSeqOops) {
                    console.log("Large difference between calculated and actual seq");
                    stopPlayer();
                }
                gNextSeqQry = seq;                
            }
        },
        function () {
            console.log("Stop at getNextSeq timeout");
            stopPlayer();
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
                    console.log("Packet time (attempt " + gPacketTimeCount + ") is : " + gPktTime + "ms");
                    if (gPktTime < gMinPacketTimeMs) {
                        if (gPacketTimeCount++ < gPacketTimeCountMax) {
                            testPacket (seq);
                        }
                    } else {
                        fillBuffer(seq);
                        playBuffer(seq);
                        watchDog();
                    }
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
    if (!gSeqUpdateLoop) {
        gSeqUpdateLoop = setInterval(function() {
            getNextSeq ();
        }, gSeqUpdateTime);
    }
    //Just keep loading packets like crazy
    if (!gBufferLoop) {
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
    if (!gDecodeLoop) {
        gDecodeLoop = setInterval(function() {
            var seqPrev = seq;
            var seqPrevOk = ((gPkts.hasOwnProperty(seqPrev) && gPkts[seqPrev]) != false);
            
            seq = (seq + 1) & 0xFFFF;
            
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

            //Verbose
            //console.log ((seqPrevOk | 0) + " " + (seqOK | 0) + " " + (seqNextOk| 0) + " " + (seqFutureOk| 0) + ", Seq : " + seq + ", Available : " + gSeqArrived );
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

                console.log ((seqPrevOk | 0) + " " + (seqOK | 0) + " " + (seqNextOk| 0) + " " + (seqFutureOk| 0) + ", Seq : " + seq + ", Available : " + gSeqArrived + ", DSP time allowance : " + gFutureTime );

                
                //Increase lag if problems or potential problems occured
                if (currentFail || nextFail) {
                    seq = (seq - 1) & 0xFFFF;
                    reSync = true;
                    console.log("Increasing buffer length by 1 : " + (gSeqArrived - seq));
            } else {           
                    //Decrease lag if safe to do so
                    if (!futureFail && ((gSeq - seq) > 1)) {
                        if (gDecreaseCount++ > gDecreaseHoldoff) {
                            console.log("Decreasing buffer length by 1");
                            if (seqOK) {
                                console.log("Filling in for missing packet : " + (seq + 1) + " with " + seq);
                                pokePktTimeCode(gPkts[seq], 1);
                                playRtpPacket(gPkts[seq]);
                            }
                            seq = (seq + 1) & 0xFFFF;
                            reSync = true;
                        }
                    } else {
                        gDecreaseCount = 0;
                    }
                }
                currentFail = false;
                nextFail = false;
                futureFail = false;
            }
            
            
        }, gPktTime);
    }
}

function fetchNewPacket (seq, handler) {
    //Create placeholder for received packet
    gPkts[seq] = null;
    fetchPacket(seq, handler, true);
}

function packetFail () {
    if (gPktFails++ > gMaxPktFails) {
        console.log("Too many consecutive bad packets");
        stopPlayer();
    }
}

function fetchPacket (seq, handler, cache) {
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

    //Verbose
    //console.log("Request seq : " + seq);
    req.onload = function () {
        if (req.status == 200) {
            //Abort if not playing
            if (!gPlaying) {
                return
            }
            
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
            console.log("Retrying packet " + seq + " on " + req.status);
            retryPacket(seq, handler);
        }
    };
    //Try again after time
    req.onerror = function () {
        console.log("Retrying packet " + seq + " on packet error");
        retryPacket(seq, handler);
    };
    req.ontimeout = function () {
        if (gPkts.hasOwnProperty(seq)) {
            delete gPkts[seq];
        }        
        packetFail();
    }

    req.responseType = "arraybuffer";
    req.open("GET", url);
    req.setRequestHeader("Cache-Control",(cache)?"":"no-cache");
    req.timeout = gPktLifetime;
    req.send();    
}
function retryPacket (seq, handler) {
    //Retry packet after delay if still valid
    if (gPlaying) {
        retryTime = (gPktTime / gPktRetryDiv);
        if (gPktRetryMinMs > retryTime) {
            retryTime = gPktRetryMinMs;
        }
        if (gPkts.hasOwnProperty(seq)) {
            packetFail();
            //Only retry while packet still relavent
            if (gSeq < (seq + 1)) {
                setTimeout(function () {
                    console.log("Retrying packet : " + seq);
                    fetchPacket(seq, handler, false);
                }, retryTime);
            } else {
                console.log("Retry window has expired for packet : " + seq);
            }
        }
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
            
            //document.getElementById("stat").innerText = timeMargin.toFixed(2);;
            
            playPcm.buffer = new Float32Array(0);
        }
    
    }
}

gAmrwbWorker.onmessage = function (e) {
    var averageDelta = 0;
    var futureToAverage = 0;
    
    if (gstartDecodeTimeStamp) {
        //Time decoder just took
        gDecodeTime = ((new Date).getTime() - gstartDecodeTimeStamp) / 1000.0;
        //Update average
        if (gFutureHoldoffCount > gFutureHoldoff) {
            if (!gDecodeTimeAv) {
                gDecodeTimeAv = gDecodeTime;
            } else {
                averageDelta = (gDecodeTime - gDecodeTimeAv) / gDecodeTimeAvN;
                gDecodeTimeAv = gDecodeTimeAv + averageDelta;
                futureToAverage = Math.abs(((gDecodeTimeAv * gFutureMargin) - gFutureTime) / gFutureTime);
            }
        } else {
            gFutureHoldoffCount++;
            gDecodeTimeAv = gFutureTime / gFutureMargin;
        }
        //If average is >gFutureChangeThreshold different to 1/gFutureMargin current future allowence then update
        if (futureToAverage > gFutureChangeThreshold) {
            if ((gDecodeTimeAv * gFutureMargin) < gFutureTimeMin) {
                gFutureTime = gFutureTimeMin;
            } else {
                console.log("Updating audio DSP time allocation seconds");
                gFutureTime = Math.round(gDecodeTimeAv * gFutureMargin * 100) / 100;
            }
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
            console.log("Stop on channel change");
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

// The main start/stop button handler
function clickEnact() {
    dAudio = document.getElementById('dummyAudio');
    if (gPlayIntention) {
        gPlayIntention = false;
        /* if (mobileAndTabletcheck()) {
            closeFullscreen();
        } */
        console.log("Stop on clickEnact");
        stopPlayer();
        dAudio.onpause = null;
        dAudio.pause();
        dAudio.onplay = function () {
            gPlayIntention = false;
            clickEnact();
        };
    } else {
        gPlayIntention = true;
        /* if (mobileAndTabletcheck()) {
            openFullscreen();
        } */
        dAudio.onplay = null;
        dAudio.play();
        dAudio.onpause = function () {
            gPlayIntention = true;
            clickEnact();
        };
        startPlayer();        
    }
    updateDisplay();    
}

function startStopPlayerClick() {
    if (!mobileAndTabletcheck()) {
        clickEnact();
    }
}

function startStopPlayerTouchend() {
    if (mobileAndTabletcheck()) {
        clickEnact();
    }
}



function buttonStatus () {
    channel = parseInt(localStorage.channel);
    if ((gPlayError != gPrevPlayError) ||
        (gPlayIntention != gPrevPlayIntention) ||
        (channel != gPrevChannel)) {
        for (var i=0; i < gMaxChannels; i++) {
            var element = document.getElementById("channelButton" + i);
            if ((i == channel) && gPlayIntention) {
                element.classList.add(gPlayError?"errorState":"playing");
                element.classList.remove(!gPlayError?"errorState":"playing");
            } else {
                element.classList.remove("errorState");
                element.classList.remove("playing");
            }
        }
        gPrevChannel = channel;
        gPrevPlayError = gPlayError;
        gPrevPlayIntention = gPlayIntention;
    }
}
//setInterval(buttonStatus, 500);

function startPlayer() {
    if (!gStartAfterGeo && gOnLanValid) {
        gEnacting = true;
        //Kill any existing players
        console.log("Stop any existing");
        stopPlayer();
        console.log("Starting player");
        gFutureHoldoffCount = 0;
        //Do we need to get position
        if (!gOnLan && !gGeoLat) {
            if (!gGeoDeclined) {
                var geoDiv = document.getElementById("geoBox");
                gStartAfterGeo = true;
                geoDiv.classList.add("geoShow");
            } else {
                fullStopPlayer();
            }
        } else {
            startPlayer2();
        }
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
    
    gPacketTimeCount = 1;
    gSeq = -1;
    getNextSeq ();
    
    //Stop player eventually to prevent forgotten app using too much data
    gPlayTimeout = setTimeout(function () {
        console.log("Player time out after " + (gPlayTimeoutMs / (1000 * 60 * 60)) + " hours");
        fullStopPlayer();
        updateDisplay();
    }, gPlayTimeoutMs);
    gEnacting = false;
}

function fullStopPlayer () {
    gPlayIntention = false;
    
    if (gCtx) {
        gCtx.close();
        gCtx = null;
    }
    
    if (gPlayTimeout) {
        clearInterval(gPlayTimeout);
        gPlayTimeout = null;
    }
    console.log("Full stop");
    stopPlayer();
}

function stopPlayer() {
    gEnacting = true;
    gStartAfterGeo = false;
    
    console.log("Stopping player");
    
    gPlaying = false;
    gNextSeqQry = -1;
    gPktTime = -1;    
    
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
    gEnacting = false;
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

//Fetch coordinates if we have permission and we need to
function pollGeo () {

    //Check if we have permissions and fetch if we don't already have
    if (navigator.permissions) {
        navigator.permissions.query({name: 'geolocation'}).then(function(PermissionStatus) {
            if ('granted' === PermissionStatus.state) {
                getGeo ();
            }
            gGeoDeclined = ('denied' === PermissionStatus.state);
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
        }
        if (gStartAfterGeo) {
            gStartAfterGeo = false;
            gGeoStart2 = true;
        }
    }, function(err) {
        console.log("Geolocation: error code : " + err.code + ", " + err.message);
        gStartAfterGeo = false;
        gGeoDeclined = true;
        fullStopPlayer();
        updateDisplay();
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
            //gGeoInRange = false; gOnLan = false;  // TEST TEST

            
            
            if ((onLanPrev != gOnLan) || (geoInRangePrev != gGeoInRange) || !gOnLanValid) {
                gOnLanValid = true;
                updateDisplay();
            }
            gOnLanValid = true;
            if (gGeoStart2) {
                gGeoStart2 = false;
                if (gGeoInRange) {
                    startPlayer2();
                } else {
                    fullStopPlayer();
                    updateDisplay();
                }
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
    fullStopPlayer();
    updateDisplay();
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
    setInterval(updateDisplay, 10000);
}
