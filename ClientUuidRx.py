__author__ = "Simon Blandford"

# Generate test UUID TX on Ch 1
# while [ 1 ]; do echo -n "TX42b06595-6d85-4334-946a-6dbd4c2cfe7f" | socat - UDP:228.227.227.225:1234; sleep 1; done

from Log import log
try:
    import config
except ImportError:
    import config_dist as config
import ipaddress
import socket
import struct
import sys
import threading
import time

import BackEnd

threads = {}
ended = {}
timeoutEnded = False
clientDictionary = {}
lock = {}

def runChannel(channel):
    global threads
    global lock
    global ended
    log().debug("Starting channel : %d", channel)
    if not channel in lock:
        lock[channel] = threading.Lock()
    thread = threading.Thread(target=listenUuid, args=(channel,))
    threads[channel] = thread
    ended[channel] = False
    thread.start()


def stopChannel(channel):
    global ended
    log().info("Stopping channel %d", channel)
    ended[channel] = True


def waitChannel(channel):
    log().debug("Waiting for channel %d", channel)
    threads[channel].join(config.THREAD_WAIT)


def startAll(channelDictIn, channelStatDictIn):
    global channelDict
    global timeoutThread
    global timeoutEnded
    channelDict = channelDictIn
    channelStatDict = channelStatDictIn
    BackEnd.setupUuid(channelDict, channelStatDict)
    log().info("Starting all UUID channel threads")
    for i in range(0, config.MAX_CHANNELS):
        channelDict['channels'][i]['rx'] = {}
        channelDict['channels'][i]['tx'] = {}
        ended[i] = False
        runChannel(i)
    timeoutThread = threading.Thread(target=timeoutUuids)
    timeoutEnded = False
    timeoutThread.start()


def stopAll():
    global timeoutEnded
    log().info("Stopping all UUID channel threads")
    timeoutEnded = True
    for channel, thread in threads.items():
        stopChannel(channel)
    timeoutThread.join(config.THREAD_WAIT)


def waitAll():
    log().info("Waiting for UUID all channel threads")
    for channel, thread in threads.items():
        waitChannel(channel)

def listenUuid(channel):
    global channelDict
    global lock
    global seq
    global timeStamp
    log().debug("Started UUID Channel %d thread", channel)
    # Create the datagram socket for receiving channel
    ip_address = ipaddress.ip_address(config.MULTICAST_BASE_ADDR) + channel + config.MUTLICAST_MANAGEMENT_OFFSET + config.MUTLICAST_UUID_OFFSET
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    if sys.platform == 'win32':
        sock.bind(("", config.MULTICAST_PORT))
    else:
        sock.bind((str(ip_address), config.MULTICAST_PORT))
    group = socket.inet_aton(str(ip_address))
    mreq = struct.pack("4sL", group, socket.INADDR_ANY)
    reported = False
    while not ended[channel]:
        try:
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
        except:
            if not reported:
                log().error("IpBroadcast : %s", sys.exc_info()[0])
            reported = True
            time.sleep(config.SOCKET_RETRY_SECONDS)
            pass
        else:
            break
    sock.settimeout(config.SOCKET_TIMEOUT)
    log().debug("Waiting for UUID multicast packets on channel %d, address %s", channel, str(ip_address))
    while not ended[channel]:
        try:
            try:
                data, address = sock.recvfrom(config.MULTICAST_PACKET_BUFFER_SIZE)
            except socket.timeout:
                continue
            except:
                log().error("ClientUuidRx : %s", sys.exc_info()[0])
                time.sleep(config.SOCKET_RETRY_SECONDS)
                continue

            length = len(data)
            if length != (config.UUID_LENGTH + 2):
                continue
            uuid = data[2:].decode('utf-8')
            if data[1] != ord('X'):
                continue
            if data[0] == ord('T'):
                if not uuid in channelDict['channels'][channel]['tx']:
                    log().debug("Adding client TX UUID : %s", uuid)
                with lock[channel]:
                    channelDict['channels'][channel]['tx'][uuid] = time.time()
            elif data[0] == ord('R'):
                if not uuid in channelDict['channels'][channel]['rx']:
                    log().debug("Adding client RX UUID : %s", uuid)
                with lock[channel]:
                    channelDict['channels'][channel]['rx'][uuid] = time.time()
        except Exception as e:
            log().error(e.__doc__)
            log().error(e.message)
            time.sleep(1)
    sock.close()

def timeoutUuids():
    global channelDict
    while not timeoutEnded:
        try:
            for channel in range(0, config.MAX_CHANNELS):
                txDeletes = []
                rxDeletes = []
                for uuid in channelDict['channels'][channel]['tx']:
                    if (time.time() - channelDict['channels'][channel]['tx'][uuid]) > config.UUID_TIMEOUT_SECONDS:
                        txDeletes.append(uuid)
                for uuid in channelDict['channels'][channel]['rx']:
                    if (time.time() - channelDict['channels'][channel]['rx'][uuid]) > config.UUID_TIMEOUT_SECONDS:
                        rxDeletes.append(uuid)
                with lock[channel]:
                    for uuid in txDeletes:
                        if uuid in channelDict['channels'][channel]['tx']:
                            log().debug("Timeout of client TX UUID : %s", uuid)
                            del channelDict['channels'][channel]['tx'][uuid]
                    for uuid in rxDeletes:
                        if uuid in channelDict['channels'][channel]['rx']:
                            log().debug("Timeout of client RX UUID : %s", uuid)
                            del channelDict['channels'][channel]['rx'][uuid]
        except Exception as e:
            log().error(e.__doc__)
            log().error(e.message)
        time.sleep(1)

