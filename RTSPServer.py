# !/usr/bin/python3

__author__ = 'Simon Blandford'

import time

# Based on https://github.com/TibbersDriveMustang/Video-Streaming-Server-and-Client

from Log import log
try:
    import config
except ImportError:
    import config_dist as config
import socket
import threading

import RTSPServerSession

ended = False
thread = False
hubTcpSocket = False

def runThread():
    global thread
    log().info('Starting Hub server thread')
    thread = threading.Thread(target=server)
    thread.start()

def sigStopThread():
    global ended
    log().info('Ending Hub server thread')
    ended = True

def waitStopThread():
    global thread
    global hubTcpSocket
    if thread:
        thread.join()

    hubTcpSocket = False;
    thread = False

def server():
    global hubTcpSocket
    hubTcpSocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    hubTcpSocket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    hubTcpSocket.bind(('', config.HUB_SERVER_PORT))
    log().info("Hub server Listening for incoming request on port %d...", config.HUB_SERVER_PORT)
    hubTcpSocket.listen(config.HUB_LISTEN_BACKLOG)
    hubTcpSocket.settimeout(config.SOCKET_TIMEOUT)
    # Receive client info (address,port) through RTSP/HTTP/TCP session
    while not ended:
        try:
            clientInfo = {}
            try:
                # TODO The IP address appears to be this one and not from the source. Check in Wireshark
                clientInfo['connection'], (clientInfo['IP'], clientInfo['port']) = hubTcpSocket.accept()
            except socket.timeout:
                continue

            log().debug('Received from %s on port %s', clientInfo['IP'], clientInfo['port'])
            RTSPServerSession.HubServerSession(clientInfo).runThread()
        except Exception as e:
            log().error(e.__doc__)
            log().error(e.message)
            time.sleep(1)
    hubTcpSocket.close()


# Program Start Point
if __name__ == "__main__":
    runThread()
