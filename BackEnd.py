#!/usr/bin/python3

__author__ = "Simon Blandford"

from Log import log
import ipaddress
import math
import json
try:
    import config
except ImportError:
    import config_dist as config
import re
import threading

import MulticastRxUniTx

lock = None
privChannelDict = None
channelDict = None


def importLocks(lockIn, privChannelDictIn):
    global lock
    global privChannelDict

    lock = lockIn
    privChannelDict = privChannelDictIn


def setupUuid(channelDictIn, channelStatDictIn):
    global channelDict
    global channelStatDict
    global lock

    with lock:
        channelDict = channelDictIn
        channelStatDict = channelStatDictIn


"""
API commands in GET variables (URL encoded):
callback=<callbackname>, the JSONP callback name to use
chname=XX<New name>, where XX is the channel number, sets channel name, blank for default
adminpw=<New PW>, set new admin password
id=XX<+/-><UUID>, where XX is the channel number <+/-> indicates add or remove followed by the UUID
headphones=true/false, enable or disable the mandatory headphones flag
open=XX<+/->, where XX is the channel number, open or close channel to allow new UUID to transmit or to lock
"""
def respond(path, params, fullPath, onLan = True):
    global channelDict
    global channelStatDict
    global privChannelDict

    callback = "parseResponse"
    cacheSeconds = -1
    if 'callback' in params:
        callback = params['callback']


    if "json/admin.json" in path:
        code = 200
        content = ''
        problem = ''
        if not onLan:
            code = 400
            problem = "Attempt to access admin page from WAN"
            log().warning(problem)
            return code, problem, callback + '(' + content + ')', cacheSeconds
        log().debug("Full status requested")
        password = config.DEFAULT_ADMIN_PASSWORD
        if 'adminPassword' in channelDict:
            password = channelDict['adminPassword']
        fullPath = re.sub(r"&?hash=[^&]+", "", fullPath)
        hashCode = hash(fullPath + password)
        if not 'hash' in params or params['hash'] != hashCode:
            problem = "Forbidden: incorrect or missing authorisation hash"
            content = json.dumps(
                {'problem': problem}
            )
            log().warning(problem)
        else:
            #Only consider commands if authentication checks out
            if 'chname' in params:
                if params['chname'][0].isdigit() and params['chname'][1].isdigit():

                    channel = int(params['chname'][0:2])
                    if channel >= config.MAX_CHANNELS:
                        code = 400
                        problem = "chname channel number too large, must be in range 00 to " + \
                            format(config.MAX_CHANNELS - 1, '02d')
                        log().warning(problem)
                    else:
                        chName = params['chname'][2:]
                        with privChannelDict['channels'][channel]['lock']:
                            if chName != "":
                                channelDict['channels'][channel]['name'] = chName
                            else:
                                if 'name' in channelDict['channels'][channel]:
                                    del channelDict['channels'][channel]['name']
                else:
                    code = 400
                    problem = "chname parameter must by two decimal digits followed by name, got " + params['chname']
                    log().warning(problem)
            if code == 200 and 'adminpw' in params:
                if len(params['adminpw']) >= config.ADMIN_PASSWORD_MIN_LENGTH:
                    channelDict['adminPassword'] = params['adminpw']
                    log().info("Password changed")
                else:
                    code = 400
                    problem = "Password less than minimum acceptable length of " + str(config.ADMIN_PASSWORD_MIN_LENGTH) + " characters"
                    log().warning(problem)
            if code == 200 and 'id' in params:
                channel = int(params['id'][0:2])
                if channel >= config.MAX_CHANNELS:
                    code = 400
                    problem = "chname channel number too large, must be in range 00 to " + \
                              format(config.MAX_CHANNELS - 1, '02d')
                    log().warning(problem)
                else:
                    id = params['id'][3:]
                    if len(id) < 1:
                        code = 400
                        problem = "id too short : " + id
                    if params['id'][2:3] == "+":
                        if not 'allowedIds' in channelDict['channels'][channel]:
                            channelDict['channels'][channel]['allowedIds'] = []
                        if not id in channelDict['channels'][channel]['allowedIds']:
                            channelDict['channels'][channel]['allowedIds'].append(id)
                    elif params['id'][2:3] == "-":
                        if 'allowedIds' in channelDict['channels'][channel] and id in channelDict['channels'][channel]['allowedIds']:
                            channelDict['channels'][channel]['allowedIds'].remove(id)
                    else:
                        code = 400
                        problem = "Expecting + or - after channel number"
            if code == 200 and 'idrename' and 'name' in params:
                id = params['idrename']
                name = params['name']
                #Create frienly name dictionary if not there
                if not 'friendlyNames' in channelDict:
                    channelDict['friendlyNames'] = {}
                if len(name) > 0:
                    #Add new name for UUID
                    channelDict['friendlyNames'][id] = name
                else:
                    #Clear name for UUID
                    if id in channelDict['friendlyNames']:
                        del channelDict['friendlyNames'][id]
            if code == 200 and 'headphones' in params:
                if params['headphones'] == "false" or params['headphones'] == "0":
                    channelDict['mandatoryHeadphones'] = False
                else:
                    channelDict['mandatoryHeadphones'] = True
            if code == 200 and 'open' in params:
                if params['open'][0].isdigit() and params['open'][1].isdigit():
                    channel = int(params['open'][0:2])
                    if channel >= config.MAX_CHANNELS:
                        code = 400
                        problem = "open channel number too large, must be in range 00 to " + \
                                  format(config.MAX_CHANNELS - 1, '02d')
                        log().warning(problem)
                    else:
                        if params['open'][2:3] == "+":
                            channelDict['channels'][channel]['open'] = True
                        elif params['open'][2:3] == "-":
                            channelDict['channels'][channel]['open'] = False
                        else:
                            code = 400
                            problem = "Expecting + or - after channel number"
                            log().warning(problem)
                else:
                    code = 400
                    problem = "chname parameter must by two decimal digits followed by name, got " + params['chname']
                    log().warning(problem)

            if code == 200:
                content = json.dumps(
                        channelDict
                )
                #Remove the admin password from the response
                content = re.sub(r',\s"adminPassword[^,}]+', '', content)
    elif "json/stat.json" in path:
        code = 200
        cacheSeconds = config.HTTP_STAT_CACHE_SECONDS
        content = ''
        problem = ''
        log().debug("Short status requested")
        if not 'channelStatLock' in channelStatDict:
            channelStatDict['channelStatLock'] = threading.Lock()
        with channelStatDict['channelStatLock']:
            dictfilt = lambda x, y: dict([(i, x[i]) for i in x if i != y])
            content = json.dumps(
                dictfilt(channelStatDict, 'channelStatLock')
            )
    elif "json/lanrange.json" in path:
        code, problem = checkRange(params)
        # If the problem is "out of range" then it is not a problem in this case
        problem = ""
        content = json.dumps ({'onLan': onLan, 'inRange': (code == 200) or onLan })
        code = 200
    else:
        content = ""
        code = 404
        problem = "Not found"

    return code, problem, callback + '(' + content + ')', cacheSeconds


def RtpRefesh (channel, params, onLan):
    callback = "parseResponse"
    if 'callback' in params:
        callback = params['callback']

    clientInfo = {'uuid': params['uuid'], 'channel': channel}
    MulticastRxUniTx.addHttpClientIfNot(clientInfo, onLan)
    content = json.dumps(
        {
            'seq': MulticastRxUniTx.getSeq(channel)
        }
    )
    return callback + '(' + content + ')'


# Based on Java hashcode but with unsigned hex output
def hash(s):
    h = 0
    for c in s:
        h = (31 * h + ord(c)) & 0xFFFFFFFF
    return format(abs(((h + 0x80000000) & 0xFFFFFFFF) - 0x80000000), 'x')


# Calculate distance from venue centre from coordinates and return in range or not
def inRange(lat, lon):
    # If no range specified then range testing is disabled
    if config.HUB_WAN_LOCATION_RADIUS_METERS == 0:
        return True

    radLat = math.radians(lat)
    radVenueLat = math.radians(config.HUB_WAN_LOCATION_LATITUDE_DEGREES)
    deltaLat = math.radians(config.HUB_WAN_LOCATION_LATITUDE_DEGREES - lat)
    deltaLon = math.radians(config.HUB_WAN_LOCATION_LONGITUDE_DEGREES - lon)
    a = math.sin(deltaLat / 2) * math.sin(deltaLat / 2) + \
        math.cos(radLat) * math.cos(radVenueLat) * \
        math.sin(deltaLon / 2) * math.sin(deltaLon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    d = config.HUB_WAN_LOCATION_EARTH_RADIUS_METERS * c

    if config.HUB_WAN_LOCATION_RADIUS_METERS <= d:
        log().info("Attempt to connect from client %f meters away", d)
    return (config.HUB_WAN_LOCATION_RADIUS_METERS > d)


def checkRange(params):
    code = 200
    problem = ""
    if 'lat' in params and 'lon' in params:
        try:
            lat = float(params['lat'])
            lon = float(params['lon'])
        except ValueError:
            code = 400
            problem = "Malformed co-ordinates"
            return code, problem
        else:
            if not inRange(lat, lon):
                code = 403
                problem = "Client out of range of venue"
    else:
        code = 403
        problem = "Unable to assess if client is at venue"
    return code, problem

def isLan(ips):
    ip = getSingleIp(ips)
    for ipRange in config.LAN_RANGES:
        net = ipaddress.ip_network(ipRange)
        if ipaddress.ip_address(ip) in net:
            return True
    for ipAddress in config.HUB_CONSIDER_LAN_ADDRESSES:
        if ip == ipAddress:
            return True
    return False

def rewritable(ips):
    ip = getSingleIp(ips)
    return ip in config.HUB_REWRITE_TO_LAN_URL

#First IP is the one we want
def getSingleIp(ips):
    ip = ips
    if len(ips.split(",")) > 1:
        ip = ips.split(",")[0]
    return ip
