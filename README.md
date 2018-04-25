# WifiTranslationHub
Hub writing in Python 3.5 for the Wifi Translation Android app to enable management and unicast web-player fallback

Intended for use with the WifiTranslation Android app https://github.com/sblandford/WifiTranslation.

### What it is for

The WifiTranslation Android app uses multicast to transmit simultaneous translation over a Wifi network. This is fine if everyone is using an Android phone that has multicast enabled however many people will be using IOS devices or mutlicast just doens't work because it is, for example, not enabled in the device kernel.

Another issue is that the WifiTranslation app lets the user transmit as easily as receive. This is fine for small groups of people or venues but for larger installations it is necessary to restrict who can transmit to prevent possible deliberate or accidental hijacking of a translation channel.

### What it does (or will do)

The hub listens to all the translation channels and ensures that all except the intended translator can transmit for any given language. When the translation is received the hub relays the translation over a web interface that can be received on any device with a new enough web browser via http.

It can also print off a QR code and web address that people can use to get themselves connected. If they scan the QR code using an Android device it will trigger a link to the GooglePlay page for the Android app and if they don't have an Android phone then they get the web interface.

The http system of sending the audio is designed to be cache-friendly to reduce the load on the hub if, say, a cache such as Varnish is used. It would also be possible to serve the http audio over the WAN so that it doesn't even matter if they aren't on the LAN, although some kind of (future) security would be needed to prevent eavesdropping and access in any way to the admin interface.

### What is done so far

1) RTSP relay (although it doesn't currently have a use)
2) HTTP relay

### What is to do

1) Admin interface and full back end
2) WAN security
3) Transmit locking

## How to use

Run wifitranslationhub.py on the same LAN as the WifiTranslation multicast.

Access the IP address of the host from a phone web browser to get the relay.
