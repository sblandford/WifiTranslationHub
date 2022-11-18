# WifiTranslationHub
Hub written in Python 3.5+ for the Wifi Translation Android app to enable management and unicast web-player fallback

Source code : https://github.com/sblandford/WifiTranslationHub

Intended for use with the WifiTranslation Android app : https://github.com/sblandford/WifiTranslation

I have sinced written a new WiFi translation application based on WebRTC that runs on mobile device web browsers : https://github.com/sblandford/wifi-xlation

### What it is for

The WifiTranslation Android app uses multicast to transmit simultaneous translation over a Wifi network. This is fine if everyone is using an Android phone that has multicast enabled however many people will be using IOS devices or mutlicast just doens't work because it is, for example, not enabled in the device kernel.

Another issue is that the WifiTranslation app lets the user transmit as easily as receive. This is fine for small groups of people or venues but for larger installations it is necessary to restrict who can transmit to prevent possible deliberate or accidental hijacking of a translation channel.

### What it does (or will do)

The hub listens to all the translation channels and ensures that all except the intended translator can transmit for any given language. When the translation is received the hub relays the translation over a web interface that can be received on any device with a new enough web browser via http.

It can also print off a QR code and web address that people can use to get themselves connected. If they scan the QR code using an Android device it will trigger a link to the GooglePlay page for the Android app and if they don't have an Android phone then they get the web interface.

The http system of sending the audio is designed to be cache-friendly to reduce the load on the hub if, say, a cache such as Varnish is used. It would also be possible to serve the http audio over the WAN so that it doesn't even matter if they aren't on the LAN, although some kind of (future) security would be needed to prevent eavesdropping and access in any way to the admin interface.

# How to use

docker run --net=host --name wifitranslationhub simonblandford/wifitranslationhub

#### Use config file on host

docker run --net=host -v config.py:/app/config.py --name wifitranslationhub simonblandford/wifitranslationhub

#### Store state in directory on host

docker run --net=host -v /path/to/.configdir:/app/.config --name wifitranslationhub simonblandford/wifitranslationhub
