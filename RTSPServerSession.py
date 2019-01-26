__author__ = "Simon Blandford"

from Log import log
import calendar
try:
    import config
except ImportError:
    import config_dist as config
import datetime
import ipaddress
import random
import re
import socket
import string
import time
import threading
import urllib


import MulticastRxUniTx
import BackEnd


# from RtpPacket import RtpPacket

class HubServerSession:

    rtspClient = {}
    ended = False
    thread = False
    newRx = False
    timeOutThread = False

    def __init__(self, rtspClient):
        self.rtspClient = rtspClient

    def runThread(self):
        self.thread = threading.Thread(target=self.handleHubRequest)
        self.thread.start()

    def sigStopThread(self):
        log().info("Ending RTSP handler thread")
        self.ended = True
        self.rtspClient.shutdown(socket.SHUT_WR)

    def waitStopThread(self):
        if self.thread:
            self.thread.join(config.THREAD_WAIT)
        self.thread = False

    def handleHubRequest(self):
        self.ended = False
        lastRxTime = calendar.timegm(time.gmtime())
        self.rtspClient['connection'].settimeout(config.SOCKET_TIMEOUT)
        timeout = config.RTSP_CLIENT_TIME_OUT_SECONDS
        requestCommand = ''
        requestProtocol = ''
        while not self.ended:
            try:
                try:
                    data = self.rtspClient['connection'].recv(config.MAX_RECV)
                except socket.timeout:
                    if ((calendar.timegm(time.gmtime()) - lastRxTime) > timeout):
                        log().info("RTSP/HTTP session time out")
                        self.ended = True
                    if 'rtcpRxEvent' in self.rtspClient and self.rtspClient['rtcpRxEvent']:
                        lastRxTime = calendar.timegm(time.gmtime())
                        self.rtspClient['rtcpRxEvent'] = False
                    continue
                if data:
                    lastRxTime = calendar.timegm(time.gmtime())
                    request = data.decode("utf8").replace('\r', '').split('\n')
                    log().debug("Received: %s", request)

                    firstLine = request[0].split(' ')
                    if len(firstLine) == 1:
                        #requestCommand and requestProtocol remembered from last time
                        requestPath = firstLine[0]
                    elif len(firstLine) < 3:
                        log().warning("Unknown request type")
                        continue
                    else:
                        requestCommand = firstLine[0]
                        requestPath = firstLine[1]
                        requestProtocol = firstLine[2]
                    urlDecoded = urlDecode(requestPath)
                    channel, seq, path, params, mCastIp = urlDecoded

                    r = ''
                    if not "RTSP" in requestProtocol.upper():
                        status = "403 Only accepting RTSP protocol"
                        r = "HTTP/1.0 " + status + "\r\n"
                        self.ended = True
                    else:
                        seq = self.seq(request)

                        if request[0] and seq > 0:
                            log().debug("RTSP command %s", requestCommand)

                            if requestCommand.upper() == "OPTIONS":
                                r = "RTSP/1.0 200 OK\r\n"
                                r += "Cseq: " + str(seq) + "\r\n"
                                r += "Public: DESCRIBE,SETUP,TEARDOWN,PLAY\r\n\r\n"
                            elif requestCommand.upper() == "DESCRIBE":

                                content = genSdp(True, "0.0.0.0", channel)

                                r = "RTSP/1.0 200 OK\r\n"
                                r += "Cseq: " + str(seq) + "\r\n"
                                r += "Content-Type: application/sdp\r\n"
                                r += "Content-Base: " + requestPath + "\r\n"
                                r += "Content-Length: " + str(len(content)) + "\r\n"
                                r += "Cache-Control: no-cache\r\n"
                                r += "\r\n" + content
                            elif requestCommand.upper() == "SETUP":
                                regex = re.compile('^Transport:[^=]+=([0-9]+)-([0-9]+)', re.IGNORECASE)
                                found = False
                                for l in request:
                                    m = regex.search(l)
                                    if m and m.group(1) and m.group(2):
                                        found = True
                                        rxFromPort = int(m.group(1))
                                        rxToPort = int(m.group(2))
                                        self.rtspClient['sessionId'] = ''.join(
                                            random.choice(string.hexdigits).lower() for _ in range(config.SESSION_ID_LENGTH))
                                        self.rtspClient['clientport'] = rxFromPort
                                        self.rtspClient['rtpOutSocket'], self.rtspClient['serverport'], self.rtspClient[
                                            'rtcpInSocket'], self.rtspClient['rtcpInPort'] = MulticastRxUniTx.openTxPorts(
                                            self.rtspClient)
                                        self.rtspClient['ssrc'] = ''.join(
                                            random.choice(string.digits) for _ in range(config.SSRC_LENGTH))
                                        txFromPort = self.rtspClient['serverport']
                                        txToPort = txFromPort + rxToPort - rxFromPort
                                        r = "RTSP/1.0 200 OK\r\n"
                                        r += "Cseq: " + str(seq) + "\r\n"
                                        r += "Server: WifiTranslationHub\r\n"
                                        r += "Date: " + datetime.datetime.utcnow().strftime(
                                            "%a, %m %b %Y %H:%M:%S GMT") + "\r\n"
                                        r += "Transport: RTP/AVP/UDP;unicast;client_port="
                                        r += str(rxFromPort) + "-" + str(rxToPort)
                                        r += ";server_port="
                                        r += str(txFromPort) + "-" + str(txToPort)
                                        r += ";ssrc=" + self.rtspClient["ssrc"] + ";mode=play\r\n"
                                        r += "Session: " + self.rtspClient["sessionId"] + ";timeout=60\r\n"
                                        r += "Content-Length: 0\r\n"
                                        r += "Cache-Control: no-cache\r\n"
                                        r += "\r\n"
                                if not found:
                                    r = self.endit("Transport line fields not found");
                            elif requestCommand.upper() == 'PLAY':
                                if channel >= 0:
                                    self.rtspClient['channel'] = channel
                                    self.rtspClient['packetRedundancy'] = False
                                    if config.PACKET_REDUNDANCY_FLAG in params:
                                        self.rtspClient['packetRedundancy'] = (params[config.PACKET_REDUNDANCY_FLAG].lower() == "true")
                                        log().debug("Setting packet redundancy enable for sessionId : %s", self.rtspClient["sessionId"])
                                        log().debug("Setting packet redundancy enable for sessionId : %s", self.rtspClient["sessionId"])
                                    if self.session(request) == self.rtspClient['sessionId']:
                                        MulticastRxUniTx.addRtspClient(self.rtspClient)
                                        r = "RTSP/1.0 200 OK\r\n"
                                        r += "Cseq: " + str(seq) + "\r\n"
                                        r += "Server: WifiTranslationHub\r\n"
                                        r += "Date: " + datetime.datetime.utcnow().strftime(
                                            "%a, %m %b %Y %H:%M:%S GMT") + "\r\n"
                                        r += "RTP-Info: requestPath=" + requestPath + ";seq=" + str(
                                            MulticastRxUniTx.getSeq(self.rtspClient["channel"]))
                                        r += ";rtptime=" + str(MulticastRxUniTx.getTimeStamp(self.rtspClient["channel"])) + "\r\n"
                                        r += "Range: npt=5.209428-\r\n"
                                        r += "Session: " + self.rtspClient["sessionId"] + ";timeout=60\r\n"
                                        r += "Content-Length: 0\r\n"
                                        r += "Cache-Control: no-cache\r\n"
                                        r += '\r\n'
                                    else:
                                        r = self.endit(
                                            "session id " + self.session(request) + " does not match expected : " +
                                            self.rtspClient['sessionId'])
                                else:
                                    r = self.endit("Channel number not found in RequestPath")

                            elif requestCommand.upper() == "TEARDOWN":
                                if self.session(request) == self.rtspClient['sessionId']:
                                    MulticastRxUniTx.removeRtspClient(self.rtspClient['sessionId'])
                                    r = 'RTSP/1.0 200 OK\r\n'
                                    r += 'Cseq: ' + str(seq) + '\r\n'
                                    r += '\r\n'
                                else:
                                    r = self.endit(
                                        "session id " + self.session(request) + " does not match expected : " + self.rtspClient[
                                            'sessionId'])
                            else:
                                r = self.endit("Unhandled command")
                        else:
                            r = self.endit("Not sequence number found")

                    if len(r) > 0:
                        count = self.rtspClient['connection'].send(str.encode(r))
                        log().debug('Sending %d bytes :', count)
                        log().debug(r)
                else:
                    break
            except Exception as e:
                log().error(e.__doc__)
                log().error(e.message)
                time.sleep(1)
        # At end of thread stop the client
        if 'sessionId' in self.rtspClient:
            log().info("Ending session %s", self.rtspClient['sessionId'])
            MulticastRxUniTx.removeRtspClient(self.rtspClient['sessionId'])

    def seq(self, request):
        seq = 0
        regex = re.compile('^Cseq:\s*([0-9]+)', re.IGNORECASE)
        for l in request:
            m = regex.search(l)
            if m and m.group(1):
                seq = int(m.group(1))
                break
        return seq

    def session(self, request):
        session = None
        regex = re.compile('^Session:\s*([a-f0-9]+)', re.IGNORECASE)
        for l in request:
            m = regex.search(l)
            if m and m.group(1):
                session = m.group(1)
                break
        return session

    def endit(self, message):
        self.ended = True
        log().error(message)
        return 'RTSP/1.0 400 BAD REQUEST\r\n\r\n'


def genSdp(unicast, mCastIp, channel):
    audioPort = config.MULTICAST_PORT
    if unicast:
        audioPort = 0
    content = "v=0\r\n"
    content += "s=Unnamed\r\n"
    content += "c=IN IP4 " + mCastIp + "\r\n"
    content += "a=tool:Wifi Translation\r\n"
    content += "a=recvonly\r\n"
    content += "a=type:broadcast\r\n"
    content += "a=charset:UTF-8\r\n"
    content += "m=audio " + str(audioPort) + " RTP/AVP 97\r\n"
    content += "b=AS:" + str(MulticastRxUniTx.getKbps(channel)) + "\r\n"
    content += "a=rtpmap:97 AMR-WB/16000/1\r\n"
    content += "a=fmtp:97 octet-align=1\r\n"

    return content

def urlDecode(url):
    channel = -1
    seq = -1
    #Split at start of params
    urlSplit = url.split("?")
    #Before the split is the path
    path = urlSplit[0]
    #Remove the path part
    urlSplit.remove(path)
    #Remove double forward slashes and split by forward slash
    pathSplit = re.sub("\/+","/",path).split("/")
    #Remove empty items e.g. resulting for first forward slash
    if "" in pathSplit:
        pathSplit.remove("")
    #Remove protocol and host if RTSP (http server already removes this)
    if "rtsp:" in pathSplit:
        pathSplit.remove("rtsp:")
        pathSplit.remove(pathSplit[0])
    #Do we have a channel (two digit code)?
    for i in range(0,2):
        if len(pathSplit) > i and re.search("^[0-9][0-9]$", pathSplit[i]):
            channelText = pathSplit[i]
            pathSplit.remove(channelText)
            channel = int(channelText)
            break
    #Do we have a sequence number (one or more number of digits)
    if len(pathSplit) > 1 and re.search("^[0-9]+[a-z]*$", pathSplit[1]):
        seqText = re.findall(r'\d+', pathSplit[1])[0]
        seq = int(seqText)
    #Get parameters if possible
    params = {}
    if len(urlSplit) > 0:
        paramsPart = "?" + urlSplit[0]
        if re.search("\?[^?]+$", paramsPart):
            paramNamesAndValues=re.search("\?[^?]+$", paramsPart).group(0)[1:].split("&")
            for paramNamesAndValue in paramNamesAndValues:
                name = re.search("[^=]*", paramNamesAndValue).group(0)
                if re.search('=', paramNamesAndValue):
                    value = re.search("=.*", paramNamesAndValue).group(0)[1:]
                    params[name] = urllib.parse.unquote(value)
                else:
                    params[name] = "true"
    #Determine IP address
    ip = str(ipaddress.ip_address(config.MULTICAST_BASE_ADDR) + channel + config.MUTLICAST_MANAGEMENT_OFFSET)
    return (channel, seq, path, params, ip)
