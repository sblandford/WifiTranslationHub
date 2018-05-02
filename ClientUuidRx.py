__author__ = "Simon Blandford"

#Generate test UUID TX on Ch 1
#while [ 1 ]; do echo -n "TX42b06595-6d85-4334-946a-6dbd4c2cfe7f" | socat - UDP:228.227.227.225:1234; sleep 1; done

import config
import ipaddress
import logging
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
    logging.debug("Starting channel : %d", channel)
    if not channel in lock:
        lock[channel] = threading.Lock()
    thread = threading.Thread(target=listenUuid, args=(channel,))
    threads[channel] = thread
    ended[channel] = False
    thread.start()


def stopChannel(channel):
    global ended
    logging.info("Stopping channel %d", channel)
    ended[channel] = True


def waitChannel(channel):
    logging.debug("Waiting for channel %d", channel)
    threads[channel].join(config.THREAD_WAIT)


def startAll(channelDictIn, channelStatDictIn):
    global channelDict
    global timeoutThread
    global timeoutEnded
    channelDict = channelDictIn
    channelStatDict = channelStatDictIn
    BackEnd.setupUuid(channelDict, channelStatDict)
    logging.info("Starting all UUID channel threads")
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
    logging.info("Stopping all UUID channel threads")
    timeoutEnded = True
    for channel, thread in threads.items():
        stopChannel(channel)
    timeoutThread.join(config.THREAD_WAIT)


def waitAll():
    logging.info("Waiting for UUID all channel threads")
    for channel, thread in threads.items():
        waitChannel(channel)

def listenUuid(channel):
    global channelDict
    global lock
    global seq
    global timeStamp
    logging.debug("Started UUID Channel %d thread", channel)
    # Create the datagram socket for receiving channel
    ip_address = ipaddress.ip_address(config.MULTICAST_BASE_ADDR) + channel + config.MUTLICAST_MANAGEMENT_OFFSET + config.MUTLICAST_UUID_OFFSET
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind((str(ip_address), config.MULTICAST_PORT))
    group = socket.inet_aton(str(ip_address))
    mreq = struct.pack("4sL", group, socket.INADDR_ANY)
    reported = False
    while not ended[channel]:
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
    logging.debug("Waiting for UUID multicast packets on channel %d, address %s", channel, str(ip_address))
    while not ended[channel]:
        try:
            data, address = sock.recvfrom(config.MULTICAST_PACKET_BUFFER_SIZE)
        except socket.timeout:
            continue
        except:
            logging.error("ClientUuidRx : %s", sys.exc_info()[0])
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
                logging.debug("Adding client TX UUID : %s", uuid)
            with lock[channel]:
                channelDict['channels'][channel]['tx'][uuid] = time.time()
        elif data[0] != ord('R'):
            if not uuid in channelDict['channels'][channel]['rx']:
                logging.debug("Adding client RX UUID : %s", uuid)
            with lock[channel]:
                channelDict['channels'][channel]['rx'][uuid] = time.time()
    sock.close()

def timeoutUuids():
    global channelDict
    while not timeoutEnded:
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
                        logging.debug("Timeout of client TX UUID : %s", uuid)
                        del channelDict['channels'][channel]['tx'][uuid]
                for uuid in rxDeletes:
                    if uuid in channelDict['channels'][channel]['rx']:
                        logging.debug("Timeout of client RX UUID : %s", uuid)
                        del channelDict['channels'][channel]['rx'][uuid]
        time.sleep(1)

