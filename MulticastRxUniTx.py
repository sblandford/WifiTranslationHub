__author__ = "Simon Blandford"

import calendar
try:
    import config
except ImportError:
    import config_dist as config
import ipaddress
import logging
import select
import socket
import struct
import sys
import threading
import time

import BackEnd

threads = {}
clientDictionary = {}
privChannelDict = {}
privChannelDict['channels'] = {}
packetCache = {}
lock = threading.Lock()
ended = False

def addRtspClient(clientInfo):
    global channelDict
    global clientDictionary
    global privChannelDict
    # Add client
    if not 'sessionId' in clientInfo:
        logging.error("Attempt to add client with no sessionId")
        return
    sessionId = clientInfo['sessionId']
    channel = clientInfo['channel']
    if channel >= config.MAX_CHANNELS:
        logging.error("Attempt to request channel %d above max channel %d", channel, config.MAX_CHANNELS)
        return
    with privChannelDict['channels'][channel]['lock']:
        clientDictionary[sessionId] = clientInfo
        # Assign client to channel list
        channelDict['channels'][channel]['rtspSessions'].append(sessionId)
    logging.debug("Added RTSP client with sessionId : %s", sessionId)

def removeRtspClient(sessionId):
    global channelDict
    global clientDictionary
    global lock
    global privChannelDict

    if sessionId in clientDictionary:
        with lock:
            channel = clientDictionary[sessionId]['channel']
            clientInfo = clientDictionary[sessionId]
        if 'rtpOutSocket' in clientInfo:
            clientInfo['rtpOutSocket'].close()
        if 'rtpOutSocket' in clientInfo:
            clientInfo['rtpOutSocket'].close()
        with lock:
            del clientDictionary[sessionId]
        with privChannelDict['channels'][channel]['lock']:
             channelDict['channels'][channel]['rtspSessions'].remove(sessionId)
        logging.debug("Removed RTSP client with sessionId : %s", sessionId)

def removeAllClients(channel):
    global channelDict
    logging.debug("Removing all RTSP clients of channel : %d", channel)
    with privChannelDict['channels'][channel]['lock']:
        rtspSessions = list(channelDict['channels'][channel]['rtspSessions'])
        httpLanSessions = list(channelDict['channels'][channel]['httpLanSessions'])
        httpWanSessions = list(channelDict['channels'][channel]['httpWanSessions'])
    for sessionId in rtspSessions:
        removeRtspClient(sessionId)
    for uuid in httpLanSessions:
        removeHttpClient(uuid)
    for uuid in httpWanSessions:
        removeHttpClient(uuid)

def addHttpClientIfNot(clientInfo, onLan):
    global channelDict
    global clientDictionary
    global lock
    # Add client
    if not 'uuid' in clientInfo:
        logging.error("Attempt to add client with no uuid")
        return
    uuid = clientInfo['uuid']
    channel = clientInfo['channel']
    if channel >= config.MAX_CHANNELS:
        logging.error("Attempt to request channel %d above max channel %d", channel, config.MAX_CHANNELS)
        return
    #Do nothing if already registered unless a channel change
    channelChanged = False
    foundUuid = False
    with privChannelDict['channels'][channel]['lock']:
        if uuid in clientDictionary:
            foundUuid = True
            if not uuid in channelDict['channels'][channel]['httpLanSessions'] and not uuid in channelDict['channels'][channel]['httpWanSessions']:
                channelChanged = True
    if channelChanged:
        logging.debug("Detected channel change for uuid : %s", uuid)
        removeHttpClient(uuid)
    elif foundUuid:
        return
    clientInfo['lastTime'] = calendar.timegm(time.gmtime())
    with lock:
        clientDictionary[uuid] = clientInfo
        clientDictionary[uuid]['thread'] = threading.Thread(target=timeHttpClient, args=(uuid,))
    with privChannelDict['channels'][channel]['lock']:
        # Assign client to channel list
        if onLan:
            channelDict['channels'][channel]['httpLanSessions'].append(uuid)
        else:
            channelDict['channels'][channel]['httpWanSessions'].append(uuid)
    clientDictionary[uuid]['thread'].start()
    logging.debug("Added HTTP client with UUID : %s", uuid)

def removeHttpClient(uuid):
    global channelDict
    global clientDictionary
    global lock
    global privChannelDict

    channel = -1
    with lock:
        if uuid in clientDictionary:
            channel = clientDictionary[uuid]['channel']
    if channel >= 0:
        with lock:
            del clientDictionary[uuid]
        with privChannelDict['channels'][channel]['lock']:
            if uuid in channelDict['channels'][channel]['httpLanSessions']:
                channelDict['channels'][channel]['httpLanSessions'].remove(uuid)
            if uuid in channelDict['channels'][channel]['httpWanSessions']:
                channelDict['channels'][channel]['httpWanSessions'].remove(uuid)
        logging.debug("Removed HTTP client with sessionId : %s", uuid)

def clientInfoFromUuid(uuid):
    global clientDictionary
    global lock

    clientInfo = None
    with lock:
        if uuid in clientDictionary:
            clientInfo = clientDictionary[uuid]
    return clientInfo

def timeHttpClient(uuid):
    global clientDictionary
    global lock

    clientInfo = clientInfoFromUuid(uuid)
    if not clientInfo:
        return
    if not 'lastTime' in clientInfo:
        return

    while (calendar.timegm(time.gmtime()) - clientInfo['lastTime']) <= config.HTTP_CLIENT_TIME_OUT_SECONDS:
        time.sleep(1)
        clientInfo = clientInfoFromUuid(uuid)
        if not clientInfo:
            break
    if clientInfo:
        logging.info("Timed out HTTP client uuid: %s", uuid)
        removeHttpClient(uuid)

#Wait for RTP packet and return it
def getHttpRtpPacketSeq(channel, seq):
    global privChannelDict
    global packetCache
    
    #Quick check to see if in cache
    #with privChannelDict['channels'][channel]['lock']:
    if seq in packetCache:
        logging.debug("Cache hit on packet seq : %d", seq)
        return packetCache[seq]
    
    #Can't return old packet
    if seq < getSeq(channel):
        logging.debug("Request for old HTTP RTP packet %d when %d is available", seq, getSeq(channel))
        return False
    #Future limited to prevent waiting forever
    if seq > getSeq(channel) + config.HTTP_MAX_SEQ_AHEAD:
        logging.debug("Request for HTTP RTP packet %d too far in future when %d is possible", seq, (getSeq(channel) + config.HTTP_MAX_SEQ_AHEAD))
        return False
    #Wait until requested seq arrives
    if not 'newPacketLock' in privChannelDict['channels'][channel]:
        logging.debug("Expected packetlock for HTTP RTP packet not found")
        return False
    while seq > getSeq(channel):
        with privChannelDict['channels'][channel]['newPacketLock']:
            try:
                privChannelDict['channels'][channel]['newPacketLock'].wait()
            except KeyboardInterrupt:
                return False
    #Probably expired waiting
    if seq != getSeq(channel):
        #See if it has appeared in cache before giving up
        if seq in packetCache:
            logging.debug("Cache hit on packet seq : %d", seq)
            return packetCache[seq]        
        logging.debug("Packet %d expired waiting when %d is now available", seq, getSeq(channel))
        return False
    #We have our packet
    with privChannelDict['channels'][channel]['rtpLock']:
        return privChannelDict['channels'][channel]['rtpPacket']

#Get rough integer kbps for SDP file creation
def getKbps(channel):
    if channel >= 0 and 'kbps' in channelDict['channels'][channel]:
        return channelDict['channels'][channel]['kbps']
    return 0

def runChannel(channel):
    global threads
    global channelDict
    global lock
    global privChannelDict


    logging.debug("Starting channel : %d", channel)
    channelDict['channels'][channel]['valid'] = False
    channelDict['channels'][channel]['rtspSessions'] = []
    channelDict['channels'][channel]['httpLanSessions'] = []
    channelDict['channels'][channel]['httpWanSessions'] = []
    if not channel in privChannelDict['channels']:
        privChannelDict['channels'][channel] = {}
    privChannelDict['channels'][channel]['ended'] = False

    privChannelDict['channels'][channel]['lock'] = threading.Lock()
    privChannelDict['channels'][channel]['rtpLock'] = threading.Lock()
    privChannelDict['channels'][channel]['newPacketLock'] = threading.Condition()
    thread = threading.Thread(target=reflectRTP, args=(channel,))
    threads[channel] = thread
    thread.start()

def stopChannel(channel):
    global privChannelDict
    logging.info("Stopping channel %d", channel)
    removeAllClients(channel)
    privChannelDict['channels'][channel]['ended'] = True

def waitChannel(channel):
    logging.debug("Waiting for channel %d", channel)
    threads[channel].join(config.THREAD_WAIT)

def startAll(channelDictIn, channelStatDictIn):
    global channelDict
    global channelStatDict
    global lock
    global privChannelDict

    channelDict = channelDictIn
    channelStatDict = channelStatDictIn
    BackEnd.importLocks(lock, privChannelDict)
    BackEnd.setupUuid(channelDict, channelStatDict)
    logging.info("Starting all channel threads")
    for i in range(0, config.MAX_CHANNELS):
        runChannel(i)
    #Re-call since now privChannelDict is set to something useful
    BackEnd.importLocks(lock, privChannelDict)
    #Start creating short stats
    thread = threading.Thread(target=shortStatWorker, args=())
    thread.start()
        
def stopAll():
    logging.info("Stopping all channel threads")
    for channel, thread in threads.items():
        stopChannel(channel)

def waitAll():
    logging.info("Waiting for all channel threads")
    for channel, thread in threads.items():
        waitChannel(channel)

def getSeq(channel):
    global privChannelDict
    with privChannelDict['channels'][channel]['lock']:
        if 'seq' in privChannelDict['channels'][channel]:
            return privChannelDict['channels'][channel]['seq']
        else:
            return 0

def getTimeStamp(channel):
    global privChannelDict
    with privChannelDict['channels'][channel]['lock']:
        if channel in privChannelDict and 'timeStamp' in privChannelDict['channels'][channel]:
            return privChannelDict['channels'][channel]['timeStamp']
        else:
            return 0

def openTxPorts(clientInfo):
    logging.info("Esablishing RTSP/RTCP socket for client : %s", clientInfo['sessionId'])
    while True:
        # Find an even numbered ethermal port
        sock0 = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock0.bind(('', 0))
        port0 = int(sock0.getsockname()[1])
        if port0 % 2 == 1:
            # Not even so retry
            sock0.close()
            continue
        port1 = port0 + 1
        sock1 = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        try:
            sock1.bind(('', port1))
        except OSError as e:
            # socket.error: [Errno 98] Address already in use
            if e.errno == 98:
                sock0.close()
                sock1.close()
                continue
            else:
                # Some other error
                raise
        # Two suitable sockets now open successfully
        break
    return (sock0, port0, sock1, port1)

#Quick check that data packet is and RTP/AMR packet
def amrPacket(data):
    return len(data) > config.RTP_HEADER_SIZE and (data[1] & 0x7F) == config.RTP_PAYLOAD_ID and data[
        config.RTP_HEADER_SIZE] == config.RTP_TOC_HEADER

#Find the kbps of the AMR data based on first AMR chunk or packet
def amrKbps(data):
    kbpsLookup = [6, 9, 13, 14, 16, 18, 20, 23, 24, 0, 0, 0, 0, 0, 0, 0]
    tocHeader = data[config.RTP_HEADER_SIZE + 1]
    frameIndex = (tocHeader >> 3) & 0x0F
    return kbpsLookup[frameIndex]

def reflectRTP(channel):
    global channelDict
    global clientDictionary
    global lock
    global privChannelDict
    global packetCache
    global seq
    global timeStamp

    logging.debug("Started Channel %d thread", channel)
    seqPrev = 0
    # Create the datagram socket for receiving channel
    ip_address = ipaddress.ip_address(config.MULTICAST_BASE_ADDR) + channel + config.MUTLICAST_MANAGEMENT_OFFSET
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind((str(ip_address), config.MULTICAST_PORT))
    group = socket.inet_aton(str(ip_address))
    mreq = struct.pack("4sL", group, socket.INADDR_ANY)
    # TODO Trap network error here
    reported = False
    while not privChannelDict['channels'][channel]['ended']:
        try:
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
        except:
            if not reported:
                logging.error("IpBroadcast : %s", sys.exc_info()[0])
            reported = True
            time.sleep(config.SOCKET_RETRY_SECONDS)
            pass
        else:
            break
    sock.settimeout(config.SOCKET_TIMEOUT)
    logging.debug("Waiting for multicast packets on channel %d, address %s", channel, str(ip_address))
    while not privChannelDict['channels'][channel]['ended']:
        timeout = False
        try:
            data, address = sock.recvfrom(config.MULTICAST_PACKET_BUFFER_SIZE)
        except socket.timeout:
            timeout = True
        if timeout:
            logging.debug("Timeout on channel %s", channel)
            with privChannelDict['channels'][channel]['lock']:
                channelDict['channels'][channel]['valid'] = False
                channelDict['channels'][channel]['busy'] = False
            with privChannelDict['channels'][channel]['newPacketLock']:
                privChannelDict['channels'][channel]['newPacketLock'].notify_all()
            continue
        else:
            with privChannelDict['channels'][channel]['rtpLock']:
                channelDict['channels'][channel]['busy'] = True
                privChannelDict['channels'][channel]['rtpPacket'] = data
        if not amrPacket(data):
            logging.debug("received %d bytes of invalid data on channel %d from %s", len(data), channel, address)
            with privChannelDict['channels'][channel]['lock']:
                channelDict['channels'][channel]['valid'] = False
            continue
        seq = (data[2] << 8) + data[3]
        timeStamp = (data[4] << 24) + (data[5] << 16) + (data[6] << 8) + data[7]

        if seq != (seqPrev + 1) and seq != 0 and seqPrev != 0xFFFF:
            logging.info("Missed packet from seq %d to %d on channel %s", seqPrev, seq, channel)

        if seq > seqPrev:
            with privChannelDict['channels'][channel]['lock']:
                privChannelDict['channels'][channel]['seq'] = seq
                privChannelDict['channels'][channel]['timeStamp'] = timeStamp
                privChannelDict['channels'][channel]['rtpPacket'] = data
                if not seq in packetCache:
                    packetCache[seq] = data
                    for cacheSeq in list(packetCache.keys()):
                        if cacheSeq < (seq - config.CACHE_NUMBER_OF_PACKETS):
                            del packetCache[cacheSeq]
                channelDict['channels'][channel]['kbps'] = amrKbps(data)
                channelDict['channels'][channel]['valid'] = True
        logging.debug("received %d bytes on channel %d from %s with seq %d and timestamp %d", len(data), channel,
                      address, seq, timeStamp)
        with privChannelDict['channels'][channel]['newPacketLock']:
            privChannelDict['channels'][channel]['newPacketLock'].notify_all()

        #Process RTP client
        with privChannelDict['channels'][channel]['lock']:
            rtspSessions = list(channelDict['channels'][channel]['rtspSessions'])
        for sessionId in rtspSessions:
            with lock:
                clientInfo = clientDictionary[sessionId]
            if clientInfo:
                if not clientInfo['packetRedundancy'] and seq <= seqPrev:
                    continue
                if not 'rtpOutSocket' in clientInfo or not 'rtcpInSocket' in clientInfo:
                    logging.error("Sockets not set up for client (removing) : %s", clientInfo['sessionId'])
                    removeRtspClient(clientInfo['sessionId'])
                    continue
                clientInfo['rtpOutSocket'].sendto(data, (clientInfo['IP'], clientInfo['clientport']))
                logging.debug('Send %d bytes to %s on IP %s port %d', len(data), clientInfo['sessionId'],
                              clientInfo['IP'], clientInfo['clientport'])
                rtcpReady = select.select([clientInfo['rtcpInSocket']], [], [], 0)
                if rtcpReady[0]:
                    logging.debug("Reading RTCP packet on port : %d", clientInfo['rtcpInPort'])
                    rtcpData = clientInfo['rtcpInSocket'].recv(config.HUB_PACKET_BUFFER_SIZE)
                    if len(rtcpData):
                        clientInfo['rtcpRxEvent'] = True
                        logging.info("RTCP received message : %s", str(rtcpData))
        seqPrev = seq
    sock.close()

def shortStatWorker():
    global channelDict
    global channelStatDict
    global ended

    if not 'channelStatLock' in channelStatDict:
        channelStatDict['channelStatLock'] = threading.Lock()
    while not ended:
        with channelStatDict['channelStatLock']:
            for i in range(0, config.MAX_CHANNELS):
                if not i in channelStatDict:
                    channelStatDict[i] = {}
                with privChannelDict['channels'][i]['lock']:
                    if not i in channelStatDict:
                        channelStatDict[i] = {}
                    if 'allowedIds' in channelDict['channels'][i]:
                        channelStatDict[i]['allowedIds'] = channelDict['channels'][i]['allowedIds']
                    if 'busy' in channelDict['channels'][i]:
                        channelStatDict[i]['busy'] = channelDict['channels'][i]['busy']
                    if 'valid' in channelDict['channels'][i]:
                        channelStatDict[i]['valid'] = channelDict['channels'][i]['valid']
                    if 'name' in channelDict['channels'][i]:
                        channelStatDict[i]['name'] = channelDict['channels'][i]['name']
        time.sleep(1)
