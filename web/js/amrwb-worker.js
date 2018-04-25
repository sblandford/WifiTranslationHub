importScripts("amrwb.js");
importScripts("amrwb-util.js");

onmessage = function(e) {
    var packet = e.data[0];
    var timeRtp = e.data[1];
    
    //Close the decoder if no data
    if (!packet) {
        AMRWB.decodeExit();
    } else {
        AMRWB.decodeInit();
        var samples = AMRWB.decodeRtp(packet);
    
        postMessage([samples, timeRtp]);
    }
    
}

