# !/usr/bin/python3

__author__ = "Simon Blandford"

# Try to import any new configuration parameters into user config if missing there
import re
try:
    with open("config.py", "r") as config_file:
        custConfig = config_file.readlines()
    config_dist_file = open("config_dist.py", "r")
    missingConfig = []
    for confLine in config_dist_file:
        confParam = confLine.split("=")[0].strip()
        if len(confParam) < 1 or confParam[0] == "#":
            continue
        confPattern = "^\s*" + confParam
        missing = True
        for custConfigLine in custConfig:
            if re.search(confPattern, custConfigLine):
                missing = False
        if missing:
            missingConfig.append(confLine)
    if len(missingConfig) > 0:
        with open("config.py", "a") as config_file:
            for missingConfigLine in missingConfig:
                print ("Adding missing config from default to config.py : " + missingConfigLine)
                config_file.write(missingConfigLine)
except:
    pass

try:
    import config
except ImportError:
    import config_dist as config
import copy
import json
import pickle
import os
import signal
import sys
import threading
import time


import IpBroadcaster
import RTSPServer
import MulticastRxUniTx
import ClientUuidRx
import Webserver
from Log import log, log_init

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

    global origHandler1
    global origHandler2
    global origHandler3
    global origHandler4

    global channelDict

    global configThread

    log_init()

    origHandler1 = signal.signal(signal.SIGINT, stopAll)
    origHandler2 = signal.signal(signal.SIGABRT, stopAll)
    origHandler3 = signal.signal(signal.SIGSEGV, stopAll)
    origHandler4 = signal.signal(signal.SIGTERM, stopAll)

    # https://docs.python.org/3.5/library/configparser.html
    appDataFile = appData()
    log().info("Using application data file : %s", appDataFile)

    defaultConfig()
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

    log().info("Stopping all processes")
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

    log().info("Waiting for config thread")
    configThread.join()

    # Signal webserver to stop
    origHandler1(signal.SIGINT, frame)

def appData():
    # https://stackoverflow.com/questions/1084697/how-do-i-store-desktop-application-data-in-a-cross-platform-way-for-python
    APPNAME = os.path.basename(__file__)
    if sys.platform == 'darwin':
        from AppKit import NSSearchPathForDirectoriesInDomains
        # http://developer.apple.com/DOCUMENTATION/Cocoa/Reference/Foundation/Miscellaneous/Foundation_Functions/Reference/reference.html# //apple_ref/c/func/NSSearchPathForDirectoriesInDomains
        # NSApplicationSupportDirectory = 14
        # NSUserDomainMask = 1
        # True for expanding the tilde into a fully qualified path
        appdata = os.path.join(NSSearchPathForDirectoriesInDomains(14, 1, True)[0], APPNAME)
    elif sys.platform == 'win32':
        appdata = os.path.join(os.environ['APPDATA'], APPNAME)
    else:
        appdata = os.path.expanduser(os.path.join(os.environ['HOME'], ".config/" + APPNAME))
    path = os.path.dirname(appdata)
    if not os.path.exists(path):
        try:
            os.makedirs(path)
        except:
            log().error("Unable to create missing directory for config storage : %s", path)
            raise()
    appdata = re.compile("py$").sub("", appdata) + "pickle"
    return appdata

def fetchConfig (appdata):
    global channelDict

    if os.path.exists(appdata):
        try:
            with open(appdata, "rb") as f:
                channelDict = pickle.load(f)
                # Limit number of channels to config
                chansOrig = channelDict['channels']
                channelDict['channels'] = {}
                for i in range(0, config.MAX_CHANNELS):
                    if i in chansOrig:
                        channelDict['channels'][i] = chansOrig[i]
                    else:
                        # TODO Increasing channel count results in uninitialised channel properties being stored and send to App
                        channelDict['channels'][i] = {}
        except:
            log().error("Unable to read saved config: %s. Reverting to default.", appdata)
            defaultConfig()
    else:
        defaultConfig()


def defaultConfig():
    global channelDict

    channelDict['adminPassword'] = config.DEFAULT_ADMIN_PASSWORD
    channelDict['channels'] = {}
    for i in range(0, config.MAX_CHANNELS):
        channelDict['channels'][i] = {}

def updateConfig(appdata):
    global channelDict

    log().info("Starting config thread")
    prevChannelDict = {}
    prevChans = ''
    while not ended:
        if json.dumps(channelDict) != json.dumps(prevChannelDict):
            with open(appdata, "wb") as f:
                pickle.dump(channelDict, f, pickle.HIGHEST_PROTOCOL)
            prevChannelDict = copy.deepcopy(channelDict)
        if 'channelStatLock' in channelStatDict:
            with channelStatDict['channelStatLock']:
                dictfilt = lambda x, y: dict([(i, x[i]) for i in x if i != y])
                currentChans = json.dumps(dictfilt(channelStatDict, 'channelStatLock'))
            if currentChans != prevChans:
                prevChans = copy.copy(currentChans)
                IpBroadcaster.broadcastChangeAlert()

        time.sleep(config.CONFIG_UPDATE_SECONDS)

# Program Start Point
if __name__ == "__main__":
    main()
