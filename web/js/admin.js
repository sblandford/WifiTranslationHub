var gStatus = {};
var gStatusUpdate = false;
var gLang = window.navigator.language.substring(0,2);
var gEditing = false;
var gSettingPw = false;


var gDoubletapDeltaTime = 700;
var gDoubletap1Function = null;
var gDoubletap2Function = null;
var gDoubletapTimer = null;

var gMenuBox = null;
var gMenuDisplayed = false;
gMenuChannel = 0;
var gMenuUuid = null;


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
    var script = document.createElement("script");
    script.type = "text/javascript";
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
            if (newStatus.hasOwnProperty('channels')) {
            
                if (statCompare(gStatus, newStatus)) {
                    //console.log(newStatus);
                    gStatus = newStatus;
                    gStatusUpdate = true;
                }
            } else {
                if (newStatus.hasOwnProperty('problem') && /^Forbidden/.test(newStatus['problem']) && !gSettingPw) {
                    //Password is wrong
                    setAdminPw();
                }
            }
        }
    );
    if (gStatusUpdate) {
        updateDisplay ();
        gStatusUpdate = false;
    }
}

//Compare old and new status ignoring timestamps
function statCompare (stat1, stat2) {
    var statJson1 = JSON.stringify(stat1).replace(/:[0-9]{8,}\.[0-9]{5,}/,":0.0");
    var statJson2 = JSON.stringify(stat2).replace(/:[0-9]{8,}\.[0-9]{5,}/,":0.0");
    
    return (statJson1 !== statJson2);
}

//Send command
function sendCommand (command, value) {
    var url = "/json/admin.json" + "?";
    if (Array.isArray(command) && Array.isArray(value)) {
        for (var i = 0; i < command.length; i++ ) {
            if ( i > 0) {
                url += "&";
            }
            url += command[i] + "=" + encodeURIComponent(value[i])
        }
    } else {
        url += command + "=" + encodeURIComponent(value);
    }
    loadJSONP(
        url,
        function(newStatus) {
            if (JSON.stringify(gStatus) !== JSON.stringify(newStatus)) {          
                //console.log(newStatus);
                gStatus = newStatus;
                gStatusUpdate = true;
                updateDisplay ();
            }
        }
    );
}

function updateDisplay () {
    if (gEditing) {
        return;
    }
    if (gStatus.hasOwnProperty('mandatoryHeadphones')) {
        document.getElementById('headphonesCheckbox').checked = gStatus['mandatoryHeadphones'];
    }
    channelTable();
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
                txField(newRow, channel);
                countFields(newRow, channel);
                
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
    nameInput.onblur = function(e) {
        if (gDoubletapTimer) {
            clearTimeout(gDoubletapTimer);
            gDoubletapTimer = null;
        }
    };
    nameInput.onclick = function() {
        tap(this, function(thisPassed) {
            gEditing = true;
            thisPassed.removeAttribute('readonly');
            setTimeout(function() {
                //this.setAttribute('readonly', true);
                gEditing = false;
            }, 10000);
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
    var cell = newRow.insertCell(-1);
    if (gStatus['channels'][channel].hasOwnProperty('valid') && gStatus['channels'][channel]['valid']) {
        if (gStatus['channels'][channel].hasOwnProperty('kbps')) {
            cell.innerHTML = gStatus['channels'][channel]['kbps'] + "kbps";
        }
        cell.className += " statusGood";
        statusFound = true;
    } else if (gStatus['channels'][channel].hasOwnProperty('busy') && gStatus['channels'][channel]['busy']) {
        cell.className += " statusBad";
    } else {
        cell.className += " statusNone";
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

function txField (newRow, channel) {
    var cell = newRow.insertCell(-1);
    //Show currently transmitting UUIDs
    for (var entry in gStatus['channels'][channel]['tx']) {
        var txEntry = document.createElement('button');
        var txText = document.createTextNode(friendlyName(entry));
        txEntry.appendChild(txText);
        txEntry.id = channel + "|" + entry;
        if (gStatus['channels'][channel]['open']) {
            if (gStatus['channels'][channel].hasOwnProperty('allowedIds') &&
                (gStatus['channels'][channel]['allowedIds'].indexOf(entry) >= 0)) {
                txEntry.className += " uuidButton uuidButtonEnabled";
            } else {
                txEntry.className += " uuidButton uuidButtonAvailable";
            }
        } else {
            txEntry.className += " uuidButton uuidButtonClosed";
            txEntry.disabled = true;
        }
        txEntry.addEventListener("contextmenu", rightClick, false);
        cell.appendChild(txEntry);
    }
    //Show enabled but off-air UUIDs
    if (gStatus['channels'][channel].hasOwnProperty('allowedIds')) {
        for (var entry in gStatus['channels'][channel]['allowedIds']) {
            var uuid = gStatus['channels'][channel]['allowedIds'][entry];
            var txEntry = document.createElement('button');
            var txText = document.createTextNode(friendlyName(uuid));
            txEntry.appendChild(txText);
            txEntry.id = channel + "|" + uuid;
            if (!gStatus['channels'][channel].hasOwnProperty('tx') ||
                !gStatus['channels'][channel]['tx'].hasOwnProperty(uuid)) {
                txEntry.addEventListener("contextmenu", rightClick, false);
                cell.appendChild(txEntry);
                if (gStatus['channels'][channel]['open']) {
                    txEntry.className += " uuidButton uuidButtonOff";
                } else {
                    txEntry.className += " uuidButton uuidButtonClosedOff";
                    txEntry.disabled = true;
                }
            }
        }
    }
}

function countFields (newRow, channel) {
    //Mutlicast count
    var cell = newRow.insertCell(-1);
    cell.className += " countDigits";
    if (gStatus['channels'][channel].hasOwnProperty('rx')) {
        cell.innerHTML = Object.keys(gStatus['channels'][channel]['rx']).length
    } else {
        cell.innerHTML = 0;
    }
    
    //HTTP LAN count
    cell = newRow.insertCell(-1);
    cell.className += " countDigits";
    if (gStatus['channels'][channel].hasOwnProperty('httpLanSessions')) {
        cell.innerHTML = gStatus['channels'][channel]['httpLanSessions'].length
    } else {
        cell.innerHTML = 0;
    }
    
    //HTTP WAN count (not implemented yet)
    cell = newRow.insertCell(-1);
    cell.className += " countDigits";
    if (gStatus['channels'][channel].hasOwnProperty('httpWanSessions')) {
        cell.innerHTML = gStatus['channels'][channel]['httpWanSessions'].length
    } else {
        cell.innerHTML = 0;
    }
    
    //RTSP count
    cell = newRow.insertCell(-1);
    cell.className += " countDigits";
    if (gStatus['channels'][channel].hasOwnProperty('rtspSessions')) {
        cell.innerHTML = gStatus['channels'][channel]['rtspSessions'].length
    } else {
        cell.innerHTML = 0;
    }
    
}

//Look up friendly name for uuid if it exists
function friendlyName (uuid) {
    var name = uuid;
    if (gStatus.hasOwnProperty('friendlyNames') && gStatus['friendlyNames'].hasOwnProperty(uuid)) {
        name = gStatus['friendlyNames'][uuid];
    }
    return name;
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


//Right-click handler
function rightClick (e) {
    var left = arguments[0].clientX;
    var top = arguments[0].clientY;
    
    gMenuBox = window.document.querySelector(".uuid-menu-unselected");
    gMenuUuid = e.target.id.split("|")[1];
    gMenuChannel = e.target.id.split("|")[0];
    
    if (gStatus['channels'][gMenuChannel].hasOwnProperty('allowedIds') && (gStatus['channels'][gMenuChannel]['allowedIds'].indexOf(gMenuUuid) >= 0)) {
        gMenuBox = window.document.querySelector(".uuid-menu-enabled");
    }
    
    gMenuBox.style.left = left + "px";
    gMenuBox.style.top = top + "px";
    gMenuBox.style.display = "block";
    
    arguments[0].preventDefault();
    
    gMenuDisplayed = true;
}
window.addEventListener("click", function(e) {
    e = e || window.event;
    if(gMenuDisplayed == true){
        var target = e.target || e.srcElement;
        var text = target.id.match(/[^-]*$/)[0];
        
        switch (text) {
            case "enable" :
                sendCommand("id", chToParam(gMenuChannel) + "+" + gMenuUuid);
                break;
            case "disable" :
                sendCommand("id", chToParam(gMenuChannel) + "-" + gMenuUuid);
                break;
            case "rename" :
                var newName = prompt("Please enter new name", gMenuUuid);
                sendCommand(["idrename", "name"], [gMenuUuid, newName]);
                break;
        }
    
        gMenuBox.style.display = "none"; 
    }
    gMenuDisplayed = false;
}, true);    


function headphonesToggle() {
    var hpState = document.getElementById('headphonesCheckbox').checked;
    sendCommand("headphones", hpState);
}

function setAdminPw() {
    var modal = document.getElementById('pwModalBox');
    gSettingPw = true;
    document.getElementById("pwAdminInput").value = localStorage.adminPassword;
    modal.style.display = "block";
}

function pwSet(e) {
    var modal = document.getElementById('pwModalBox');
    var newPw = document.getElementById("pwAdminInput").value;
    sendCommand("adminpw", newPw);
    localStorage.adminPassword = newPw;
    modal.style.display = "none";
    gSettingPw = false;
}

if (!localStorage.adminPassword) {
    localStorage.adminPassword = "admin";
}


window.onload = function () {
    pollStatus();
    setInterval(pollStatus, 2000);

  
    
}
