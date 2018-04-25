var gStatus = {};
var gStatusUpdate = false;


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

//Poll status every two seconds
function pollStatus () {
    loadJSONP(
        "/json/admin.json",
        function(newStatus) {
            if (JSON.stringify(gStatus) !== JSON.stringify(newStatus)) {          
                console.log(newStatus);
                gStatus = newStatus;
                gStatusUpdate = true;
                //updateDisplay();
            }
        }
    );
}

function hashCode(s){
  return Math.abs(s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)).toString(16);
}

if (!localStorage.adminPassword) {
    localStorage.adminPassword = "admin";
}

window.onload = function () {
    //updateDisplay();
    setInterval(pollStatus, 2000);
}
