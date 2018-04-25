#!/usr/bin/python3

__author__ = "Simon Blandford"

import config
import configparser
import os
import logging
import re
import signal
import sys
import threading
import time


import IpBroadcaster
import RTSPServer
import MulticastRxUniTx
import ClientUuidRx
import Webserver

# TEST TEST
#import stacktracer

origHandler1 = False
origHandler2 = False
origHandler3 = False
origHandler4 = False

# Main channel dictionary used globally to keep track
# of channels and clients
channelDict = {}
channelStatDict = {}
prevConfigFile = {}
ended = False

def main():

    # TEST TEST
    #print(sys.executable)
    #stacktracer.trace_start("web/trace.html", interval=5, auto=True)  # Set auto flag to always update file!

    global origHandler1
    global origHandler2
    global origHandler3
    global origHandler4

    global channelDict

    global configThread

    logging.basicConfig(level=config.LOG_LEVEL)
    origHandler1 = signal.signal(signal.SIGINT, stopAll)
    origHandler2 = signal.signal(signal.SIGABRT, stopAll)
    origHandler3 = signal.signal(signal.SIGSEGV, stopAll)
    origHandler4 = signal.signal(signal.SIGTERM, stopAll)

    #https://docs.python.org/3.5/library/configparser.html
    appDataFile = appData()
    logging.info("Using application data file : %s", appDataFile)

    for i in range(0, config.MAX_CHANNELS):
        channelDict[i] = {}

    fetchConfig(appDataFile)

    configThread = threading.Thread(target=updateConfig, args=(appDataFile,))

    configThread.start()
    IpBroadcaster.runThread()
    MulticastRxUniTx.startAll(channelDict, channelStatDict)
    ClientUuidRx.startAll(channelDict, channelStatDict)

    RTSPServer.runThread()

    Webserver.start()

    os._exit(0)

def stopAll(signum, frame):
    global configThread
    global ended

    logging.info("Stopping all processes")
    signal.signal(signal.SIGINT, origHandler1)
    signal.signal(signal.SIGABRT, origHandler2)
    signal.signal(signal.SIGSEGV, origHandler3)
    signal.signal(signal.SIGTERM, origHandler4)

    ended = True
    IpBroadcaster.sigStopThread()
    Webserver.stop()
    RTSPServer.sigStopThread()
    MulticastRxUniTx.stopAll()
    ClientUuidRx.stopAll()

    IpBroadcaster.waitStopThread()
    RTSPServer.waitStopThread()
    MulticastRxUniTx.waitAll()
    ClientUuidRx.waitAll()

    logging.info("Waiting for config thread")
    configThread.join()

    # TEST TEST
    #stacktracer.trace_stop()

    # Signal webserver to stop
    origHandler1(signal.SIGINT, frame)

def appData():
    #https://stackoverflow.com/questions/1084697/how-do-i-store-desktop-application-data-in-a-cross-platform-way-for-python
    APPNAME = os.path.basename(__file__)
    if sys.platform == 'darwin':
        from AppKit import NSSearchPathForDirectoriesInDomains
        # http://developer.apple.com/DOCUMENTATION/Cocoa/Reference/Foundation/Miscellaneous/Foundation_Functions/Reference/reference.html#//apple_ref/c/func/NSSearchPathForDirectoriesInDomains
        # NSApplicationSupportDirectory = 14
        # NSUserDomainMask = 1
        # True for expanding the tilde into a fully qualified path
        appdata = os.path.join(NSSearchPathForDirectoriesInDomains(14, 1, True)[0], APPNAME)
    elif sys.platform == 'win32':
        appdata = os.path.join(os.environ['APPDATA'], APPNAME)
    else:
        appdata = os.path.expanduser(os.path.join("~", ".config/" + APPNAME))
    path = os.path.dirname(appdata)
    if not os.path.exists(path):
        try:
            os.makedirs(path)
        except:
            logging.error("Unable to create missing directory for config storage : %s", path)
            raise()
    appdata = re.compile("py$").sub("", appdata) + "conf"
    return appdata

def fetchConfig (appdata):
    global channelDict
    global configObj

    configObj = configparser.ConfigParser()
    if os.path.exists(appdata):
        configObj.read(appdata)

    if not 'common' in configObj.sections():
        configObj.add_section('common')
    channelDict['mandatoryHeadphones'] = configObj['common'].getboolean('mandatoryHeadphones', fallback=False)
    channelDict['adminPassword'] = configObj.getboolean('common', 'adminPassword', fallback=config.DEFAULT_ADMIN_PASSWORD)

    for i in range(0, config.MAX_CHANNELS):
        if not str(i) in configObj.sections():
            configObj.add_section(str(i))

        if configObj.get(str(i), 'name', fallback='') != '':
            channelDict[i]['name'] = configObj.get(str(i), 'name')
        channelDict[i]['allowedIds'] = configObj.get(str(i), 'allowedIds', fallback=[])

def updateConfig(appdata):
    global configObj

    logging.info("Starting config thread")
    changed = False
    while not ended:

        if channelDict['mandatoryHeadphones'] != configObj.getboolean('common', 'mandatoryHeadphones', fallback=False):
            configObj.set('common', 'mandatoryHeadphones', str(channelDict['mandatoryHeadphones']))
            changed = True

        if channelDict['adminPassword'] != configObj.getboolean('common', 'adminPassword', fallback=config.DEFAULT_ADMIN_PASSWORD):
            configObj.set('common', 'adminPassword', str(channelDict['adminPassword']))
            changed = True

        for i in range(0, config.MAX_CHANNELS):
            if 'name' in channelDict[i] and channelDict[i]['name'] != configObj.get(str(i), 'name', fallback=''):
                configObj.set(str(i), 'name', channelDict[i]['name'])
                changed = True
            if 'allowedIds' in channelDict[i] and channelDict[i]['allowedIds'] != configObj.get(str(i), 'allowedIds', fallback=[]):
                configObj.set(str(i), 'allowedIds', channelDict[i]['allowedIds'])
                changed = True

        if changed:
            logging.debug("Updating %s", appdata)
            with open(appdata, 'w') as configfile:
                configObj.write(configfile)
                configfile.close()
        changed = False

        time.sleep(config.CONFIG_UPDATE_SECONDS)



# Program Start Point
if __name__ == "__main__":
    main()
