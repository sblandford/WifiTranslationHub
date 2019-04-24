#### The admin interface

#### Top buttons
##### Set/Change password
It is highly recommended that the default password is changed. There is no need to re-type it when revisiting the admin interface using the same browser.

##### QR/URL
Shows the web address and QR code of the same for devices to use to connect to the translation player. Android devices will offer the Wifitranslation App on Google Play Store on first use. If the web player is still preferred then just revisit the same address and it won't jump to the Play Store again.

##### Player
The translation web player itself. This is useful for monitoring purposes.

#### Channel table
##### Channel
The name of the channel that will be displayed on the client devices. By clicking twice, slowly, in the text box the name can be edited to a more friendly name, such as the name of the language.

##### Status
Shows the current status of the translation channel.
* Grey - no signal
* Orange - invalid signal (e.g. wrong codec)
* Green - valid signal with the bitrate displayed inside

##### Locked
When checked, only approved Android app devices can transmit. To enable _any_ device it is necessary to temporarily unlock the channel otherwise the channel will show as "Unavailable" to the translator.

##### TX
Shows the UUID/name of the device currently transmitting and also UUID/names of devices that have been enabled to transmit when the channel is locked.

When a channel has been opened to allow a device to transmit, right-click on the UUID and select Enable. The channel may now be locked so that only the enabled device can transmit on that channel. More than one device can be enabled in this way.

There is another right-click option to rename the device to a friendly name, e.g. the name of the translator.

##### Client count
Shows the clients using various available methods.
* Mutlicast - Android App clients with devices that successfully are able to receive multicast
* HTTP LAN - Web browser clients connected over the LAN (WiFi)
* HTTP WAN - If the hub is also available as a public website then this represents the web browser clients not using the WAN, e.g. they are using their mobile data connection. Although WiFi is the preferred method of access, some people may not know how to connect to the advertised SSID and this mode ensures they are still able to receive translation. It is possible to limit access to the venue location using client-reported GPS coordinates.
* RTSP - Android App clients that are unable to receive multicast due to hardware or firmware limitations of the device. Hopefully, this will be a minority since the hub has to service all the individual connections and caching is not possible, as it would be for HTTP access.
