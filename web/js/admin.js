var gStatus = {};
var gStatusUpdate = false;
var gLang = window.navigator.language.substring(0,2);
var gEditing = false;


var gDoubletapDeltaTime = 700;
var gDoubletap1Function = null;
var gDoubletap2Function = null;
var gDoubletapTimer = null;


//JSONP loader by Gianni Chiappetta
//https://gist.github.com/gf3/132080
var loadJSONP = (function(){
  var unique = 0;
  return function(url, callback, context) {
    // INIT
    var name = "jp" + unique++;
    if (url.match(/\?/)) url += "&callback=" + name;
    else url += "?callback=" + name;
    
    //Apply authorisation hash
    var hash = hashCode(url + localStorage.adminPassword);
                 
    // Create script
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url + "&hash=" + hash;
    
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

//Poll status every two seconds and update display if pending
function pollStatus () {
    if (gEditing) {
        return;
    }
    loadJSONP(
        "/json/admin.json",
        function(newStatus) {
            if (JSON.stringify(gStatus) !== JSON.stringify(newStatus)) {          
                //console.log(newStatus);
                gStatus = newStatus;
                gStatusUpdate = true;
            }
        }
    );
    if (gStatusUpdate) {
        channelTable ();
        gStatusUpdate = false;
    }
}

//Send command
function sendCommand (command, value) {
    loadJSONP(
        "/json/admin.json" + "?" + command + "=" + encodeURIComponent(value),
        function(newStatus) {
            if (JSON.stringify(gStatus) !== JSON.stringify(newStatus)) {          
                //console.log(newStatus);
                gStatus = newStatus;
                gStatusUpdate = true;
            }
        }
    );
}

function channelTable () {
    var oldTbody = document.getElementById('channelsTable').getElementsByTagName('tbody')[0];
    var newTbody = document.createElement('tbody');
    
    if (gStatus.hasOwnProperty('channels')) {
        for (var channel in gStatus['channels']) {
            if (isNormalInteger(channel)) {

                // Insert a row in the table at the last row
                var newRow   = newTbody.insertRow(newTbody.rows.length);

                nameField(newRow, channel);
                statusField(newRow, channel);
                openField(newRow, channel);
                
                //console.log(gStatus['channels'][channel])
            }
        }
        oldTbody.parentNode.replaceChild(newTbody,oldTbody);
    }
}

function nameField (newRow, channel) {
    var name;
    if (gStatus['channels'][channel].hasOwnProperty('name')) {
        name = gStatus['channels'][channel]['name'];
        customName = true;
    } else {
        name = LANG[gLang]['channel'] + " " + chToText(channel);
    }            

    // Insert a cell in the row at index 0
    var nameInput = document.createElement('input');
    nameInput.type = "text";
    nameInput.id = "nameBox" + channel;
    nameInput.value = name;
    nameInput.setAttribute('readonly', true);
    nameInput.onblur = function() {
        if (gDoubletapTimer) {
            clearTimeout(gDoubletapTimer);
            gDoubletapTimer = null;
        }
        this.setAttribute('readonly', true);
        gEditing = false;
    };
    nameInput.onclick = function() {
        tap(this, function(thisPassed) {
            gEditing = true;
            thisPassed.removeAttribute('readonly');
        });
    };
    nameInput.onkeyup = function() {
        var channel = parseInt(this.id.replace( /^\D+/g, ''));
        var name = this.value.trim();
        var channelText = chToText(channel);
        var channelParamId = chToParam(channel);
        if (name === LANG[gLang]['channel'] + " " + channelText) {
            name = "";
        }
        sendCommand("chname", channelParamId + name);
        //console.log("chname:" + channelParamId + name);
    }
    newRow.insertCell(-1).appendChild(nameInput);
}

function statusField (newRow, channel) {
    if (gStatus['channels'][channel]['status']) {
        newRow.insertCell(-1).className += " statusGood";
    } else {
        newRow.insertCell(-1).className += " statusBad";
    }
}

function openField (newRow, channel) {
    var checkInput = document.createElement('input');
    checkInput.type = "checkbox";
    checkInput.id = "open" + channel;
    checkInput.checked = gStatus['channels'][channel]['open'];
    checkInput.onchange = function () {
        var channel = parseInt(this.id.replace( /^\D+/g, ''));
        var channelParamId = chToParam(channel);
        sendCommand("open", channelParamId + ((checkInput.checked)?"+":"-"));
    }
    newRow.insertCell(-1).appendChild(checkInput);
}

//Double-click that works with touch screens
//Base on https://stackoverflow.com/questions/28940676/how-to-make-ondblclick-event-works-on-phone
function tap(thisPassed, doubleTapFunc) {
    if (gDoubletapTimer == null) {
    // First tap, we wait X ms to the second tap
        gDoubletapTimer = setTimeout(gDoubletapTimeout, gDoubletapDeltaTime);
        gDoubletap2Function = doubleTapFunc;
    } else {
    // Second tap
        clearTimeout(gDoubletapTimer);
        gDoubletapTimer = null;
        gDoubletap2Function(thisPassed);
    }
}

function gDoubletapTimeout() {
    gDubleTapTimer = null;
}

function chToParam(channel) {
    return ((parseInt(channel) < 10)?"0":"") + parseInt(channel).toString();
}
function chToText(channel) {
    return channelText = ((parseInt(channel) < 9)?"0":"") + (parseInt(channel) + 1).toString();
}

function isNormalInteger(str) {
    return /^\+?(0|[1-9]\d*)$/.test(str);
}

function hashCode(s){
  return Math.abs(s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)).toString(16);
}

if (!localStorage.adminPassword) {
    localStorage.adminPassword = "admin";
}

window.onload = function () {
    pollStatus();
    setInterval(pollStatus, 2000);
}
