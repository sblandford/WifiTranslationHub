#!/usr/bin/python3

__author__ = "Simon Blandford"

import json
import logging
import config
import re

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
def respond(path, params, fullPath):
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
        logging.debug("Full status requested")
        password = config.DEFAULT_ADMIN_PASSWORD
        if 'adminPassword' in channelDict:
            password = channelDict['adminPassword']
        fullPath = re.sub(r"&?hash=[^&]+", "", fullPath)
        hashCode = hash(fullPath + password)
        if not 'hash' in params or params['hash'] != hashCode:
            code = 403
            problem = "Forbidden: incorrect or missing authorisation hash"
            logging.warning(problem)
        else:
            #Only consider commands if authentication checks out
            if 'chname' in params:
                if params['chname'][0].isdigit() and params['chname'][1].isdigit():

                    channel = int(params['chname'][0:2])
                    if channel >= config.MAX_CHANNELS:
                        code = 400
                        problem = "chname channel number too large, must be in range 00 to " + \
                            format(config.MAX_CHANNELS - 1, '02d')
                        logging.warning(problem)
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
                    logging.warning(problem)
            if code == 200 and 'adminpw' in params:
                if len(params['adminpw']) >= config.ADMIN_PASSWORD_MIN_LENGTH:
                    channelDict['adminPassword'] = params['adminpw']
                else:
                    code = 400
                    problem = "Password less than minimum acceptable length of " + str(config.ADMIN_PASSWORD_MIN_LENGTH) + " characters"
                    logging.warning(problem)
            if code == 200 and 'id' in params:
                channel = int(params['id'][0:2])
                if channel >= config.MAX_CHANNELS:
                    code = 400
                    problem = "chname channel number too large, must be in range 00 to " + \
                              format(config.MAX_CHANNELS - 1, '02d')
                    logging.warning(problem)
                else:
                    id = params['id'][3:]
                    if len(id) < 1:
                        code = 400
                        problem = "id too short : " + id
                    if params['id'][2:3] == "+":
                        if not id in channelDict['channels'][channel]['allowedIds']:
                            channelDict['channels'][channel]['allowedIds'].append(id)
                    elif params['id'][2:3] == "-":
                        if id in channelDict['channels'][channel]['allowedIds']:
                            del channelDict['channels'][channel]['allowedIds'][id]
                    else:
                        code = 400
                        problem = "Expecting + or - after channel number"
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
                        logging.warning(problem)
                    else:
                        if params['open'][2:3] == "+":
                            channelDict['channels'][channel]['open'] = True
                        elif params['open'][2:3] == "-":
                            channelDict['channels'][channel]['open'] = False
                        else:
                            code = 400
                            problem = "Expecting + or - after channel number"
                            logging.warning(problem)
                else:
                    code = 400
                    problem = "chname parameter must by two decimal digits followed by name, got " + params['chname']
                    logging.warning(problem)

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
        logging.debug("Short status requested")
        content = json.dumps(
                channelStatDict
        )
    else:
        content = ""
        code = 404
        problem = "Not found"

    return code, problem, callback + '(' + content + ')', cacheSeconds

def RtpRefesh (channel, params):
    callback = "parseResponse"
    if 'callback' in params:
        callback = params['callback']

    clientInfo = {'uuid': params['uuid'], 'channel': channel}
    MulticastRxUniTx.addHttpClientIfNot(clientInfo)
    content = json.dumps(
        {
            'seq': MulticastRxUniTx.getSeq(channel)
        }
    )
    return callback + '(' + content + ')'

#Based on Java hashcode but with unsigned hex output
def hash(s):
    h = 0
    for c in s:
        h = (31 * h + ord(c)) & 0xFFFFFFFF
    return format(abs(((h + 0x80000000) & 0xFFFFFFFF) - 0x80000000), 'x')

