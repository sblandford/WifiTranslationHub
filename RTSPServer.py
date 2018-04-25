#!/usr/bin/python3

__author__ = 'Simon Blandford'

# Based on https://github.com/TibbersDriveMustang/Video-Streaming-Server-and-Client

import config
import logging
import socket
import threading

import RTSPServerSession
import BackEnd


ended = False
thread = False
hubTcpSocket = False

def runThread():
    global thread
    logging.info('Starting Hub server thread')
    thread = threading.Thread(target=server)
    thread.start()

def sigStopThread():
    global ended
    logging.info('Ending Hub server thread')
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
    logging.info("Hub server Listening for incoming request on port %d...", config.HUB_SERVER_PORT)
    hubTcpSocket.listen(config.HUB_LISTEN_BACKLOG)
    hubTcpSocket.settimeout(config.SOCKET_TIMEOUT)
    # Receive client info (address,port) through RTSP/HTTP/TCP session
    while not ended:
        clientInfo = {}
        try:
            clientInfo['connection'], (clientInfo['IP'], clientInfo['port']) = hubTcpSocket.accept()
        except socket.timeout:
            continue

        logging.debug('Received from %s on port %s', clientInfo['IP'], clientInfo['port'])
        RTSPServerSession.HubServerSession(clientInfo).runThread()
    hubTcpSocket.close()


# Program Start Point
if __name__ == "__main__":
    runThread()
