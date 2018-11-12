# WifiTranslationHub Configuration

## config.py
To change the configuration copy config_dist.py to config.py in the same directory. The Hub will then load config.py instead of config_dist.py.

### Config parameters and defaults

##### LOG_LEVEL = logging.INFO
The log level for the Python logger.
See https://docs.python.org/3/library/logging.html

##### LOG_FILE_PLATFORMS = ['Windows']
List of platforms that will write log output to a rotating log file instead of stdout. The platform names must match those returned by platform.system().
See https://docs.python.org/3/library/platform.html

##### LOG_FILE_FILENAME = "wifitranslationhub.log"
Filename of log file. By default this will write in the current directory unless an absolute path is provided.

##### LOG_FILE_MAX_SIZE = 5*1024*1024
Log file size after which rotation takes place.

##### LOG_FILE_ROTATION_COUNT = 2
Number of log files to rotate.

##### LOG_FILE_FORMAT = "%(asctime)s %(levelname)s %(message)s"
Format of log file as set by logging.Formatter.
See https://docs.python.org/3/library/logging.html

##### THREAD_WAIT = 3.0
How long to wait for a thread to stop.

##### HUB_WAN_LOCATION_LATITUDE_DEGREES = 0.000
##### HUB_WAN_LOCATION_LONGITUDE_DEGREES = 0.000
##### HUB_WAN_LOCATION_RADIUS_METERS = 200
Global coordinates and area where WAN access will be accepted. This enables reception of the HTTP player using "Mobile Data" as well as Wifi, if a public IP endpoint is provided, but limits access to the building. Obviously this is not a water-tight security system since any location information from the browser could potentially be manually injected so if privacy is really, really important then don't provide a public endpoint at all. Setting the location to 0.000,0.000 allows unrestricted access.

##### HUB_WAN_LOCATION_EARTH_RADIUS_METERS = 6371E3
This value is unlikely to change!

##### REQUIRED_HOSTNAME = "translation.lan"
If a DNS query of this hostname matches the HUB_ACCESS_IP_ADDRESS then it is shown on the URL/QR code web page instead of just an IP address.

##### HUB_ACCESS_IP_ADDRESS = ""
The IP address of the intended endpoint that user should connect to.

##### HUB_ACCESS_LAN_URL = ""
If an both a WAN and LAN endpoint are available then redirect anyone hitting the WAN endpoint from the LAN back to a LAN endpoint for better routing efficiency.

##### HUB_TAKE_ACCESS_IP_ADDRESS_AS_GOSPEL = False
Override the DNS query on REQUIRED_HOSTNAME and always show REQUIRED_HOSTNAME on the URL/QR web page. 

##### HUB_ACCESS_PORT = 0
If >0 then override the default WEB_SERVER_PORT shown on the URL/QR page.

##### HUB_WAN_PROTOCOL = "https"
If the Hub is exposed via a reverse proxy/cache to a public endpoint then define whether http/https here.

##### HUB_LAN_PROTOCOL = "http"
If the Hub is accessed directory or exposed via a reverse proxy/cache to an internal endpoint then define whether http/https here.

##### QR_CODE_INCLUDE_ANDROID_APP = True
When an Android device first visits the player URL then it is directed to the Wifi Translation app in Google Play store. Subsequent visits just show the web player but with a floating icon to download the app if required. This functionality can be disabled so that only the web player is shown.

##### HUB_CONSIDER_LAN_ADDRESSES = []
Addresses to consider to be LAN even if they are public IP addresses. This could include the gateway address of the LAN, for example.


##### HUB_REWRITE_TO_LAN_URL = []
Public IP addresses to trigger a rewrite to the LAN URL for example if from the LAN gateway address.

##### LAN_RANGES = ["192.168.0.0/16", "10.0.0.0/8", "172.16.0.0/12", "127.0.0.0/8"]
Address ranges to consider LAN.


##### DEFAULT_ADMIN_PASSWORD = "admin"
Default admin interface password to access http://<hub address>/admin.html. Can be changed by the client in the admin web interface.

##### ADMIN_PASSWORD_MIN_LENGTH = 5
Admin password length constraint

##### CONFIG_UPDATE_SECONDS = 2.0
How often to poll for changes and write them out to disk if required.

##### HUB_SERVER_PORT = 8553
Port of an RTSP server that can be accessed on `rtsp://<hub address>:<HUB_SERVER_PORT>/<two digit channel number>`

##### HUB_LISTEN_BACKLOG = 5
Number of unaccepted connections that the system will allow before refusing new connections for RTSP server. See https://docs.python.org/3/library/socket.html.

##### WEB_SERVER_PORT = 8080
Port web server listens on

##### IP_BROADCAST_PORT = 1235
Port of IP address broadcast packets. This is intended as a future way of conveying the IP address of the Hub to the Android Wifi Translation app so it can receive JSON status and configuration.

##### IP_BROADCAST_SECONDS = 5
Frequency of the IP broadcasts

##### MAX_DNS_REQUESTS = 3
How many DNS server requests to make to establish the IP address of REQUIRED_HOSTNAME 


##### SOCKET_TIMEOUT = 2.0
RTSP socket timeout

##### SOCKET_RETRY_SECONDS = 5.0
Time before retrying RTSP socket

##### MAX_CHANNELS = 10
Maximum number of translation channels required.

##### MULTICAST_BASE_ADDR = "228.227.226.225"
The start of the Multicast address range used for receiving multicast from the Android Wifi Translation App Translators

##### MULTICAST_PORT = 1234
Multicast port used for receiving multicast from the Android Wifi Translation App Translators

##### MULTICAST_PACKET_BUFFER_SIZE = 4096
Buffer size for receiving multicast packets

##### MUTLICAST_UUID_OFFSET = 256
Offset from MULTICAST_BASE_ADDR used by the Wifi Translation App to broadcast its UUID. This is used to identify (and in future lock) which Android phone is Translating.

##### MUTLICAST_MANAGEMENT_OFFSET = 0
Offset to MULTICAST_BASE_ADDR to add to Hub-managed Wifi Translation App instances to prevent unmanaged devices transmitting on the same channel (not yet implemented)

##### HUB_PACKET_BUFFER_SIZE = 4096
Buffer size for reading RTCP packets from RTSP clients

##### RTSP_CLIENT_TIME_OUT_SECONDS = 120.0
Timeout for RTSP clients before they are deleted from stats and closed.

##### HTTP_CLIENT_TIME_OUT_SECONDS = 120.0
Timeout for HTTP clients before they are deleted from stats and closed.

##### HTTP_TIME_OUT_SECONDS = 5.0
Not used

##### HTTP_MAX_SEQ_AHEAD = 10
Maximum RTP sequence number ahead of current available RTP sequence number that an RTP-over-HTTP client can request without an error and wait for 

##### HTTP_RTP_CACHE_SECONDS = 1
Cache header time of each RTP packet for any upstream HTTP cache

##### HTTP_SDP_CACHE_SECONDS = 300
Cache header time of multicast SDP file for any upstream HTTP cache

##### HTTP_STAT_CACHE_SECONDS = 10
Cache header time of status json response for any upstream HTTP cache

##### HTTP_QR_CACHE_SECONDS = 300
Cache header time of the QR code response for any upstream HTTP cache

##### HTTP_WEB_CACHE_SECONDS = 300
Cache header time of static web content for any upstream HTTP cache

##### UUID_LENGTH = 36
UUID length constant for checking UUID validity

##### UUID_TIMEOUT_SECONDS = 2.0
Timeout for UUID pings sent by multicast Wifi Translation App clients

##### 
##### MAX_RECV = 256
Maximum size in bytes of received RTSP correspondence

##### SERVER_ID = "TranslationHub"
Used in IP address broadcasts to identify this server (not currently used)

##### SESSION_ID_LENGTH = 16
Length to use for Session ID in RTSP sessions

##### SSRC_LENGTH = 8
Length to use for SSRC in RTSP sessions

##### PACKET_REDUNDANCY_FLAG = "pktredundant"
Name of parameter in SDP URL to indicate packet redundancy if available

##### CACHE_NUMBER_OF_PACKETS = 10
Number of packets to keep in local cache before expiring

##### 
##### RTP_HEADER_SIZE = 12
##### RTP_PAYLOAD_ID = 97
##### RTP_TOC_HEADER = 0xF0
Standard RTP parameters
