#!/usr/bin/python3

__author__ = 'Simon Blandford'

try:
    import config
except ImportError:
    import config_dist as config
import logging
import random
import re
import socket
import sys
import threading
import time

ended = False
thread = False
ip = "0.0.0.0"
hubAddress = ip

def runThread():
    global thread
    if not thread:
        logging.info('Starting IP Broadcast thread')
        thread = threading.Thread(target=broadcastIp)
        thread.start()
    else:
        logging.warning('IP Broadcast thread already started')

def sigStopThread():
    global ended
    if thread:
        logging.info('Ending IP Broadcast thread')
    else:
        logging.warning('IP Broadcast thread already signaled to stop')
    ended = True

def waitStopThread():
    global thread
    if thread:
        thread.join(config.THREAD_WAIT)
    thread = False

def broadcastIp():
    global ended
    global ip

    getIpStatus, ip = getIp()
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    message = config.REQUIRED_HOSTNAME + ' ' + str(ip)
    reported = False
    while not ended:
        try:
            logging.debug(message)
            sock.sendto(message.encode(), ('255.255.255.255', config.IP_BROADCAST_PORT))
        except KeyboardInterrupt:
            logging.info('IP Broadcast Thread finished')
        except:
            if not reported:
                logging.error("IpBroadcast : %s", sys.exc_info()[0])
            reported = True
            pass
        else:
            reported = False
        time.sleep(config.IP_BROADCAST_SECONDS)


def getIp():
    global hubAddress
    if len(config.HUB_ACCESS_IP_ADDRESS) > 0:
        ip = config.HUB_ACCESS_IP_ADDRESS
        if config.HUB_TAKE_ACCESS_IP_ADDRESS_AS_GOSPEL:
            logging.info('Our local IP address defined as %s', ip);
            return True, ip
    else:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            # doesn't even have to be reachable
            s.connect(('10.255.255.255', 1))
            ip = s.getsockname()[0]
        except:
            logging.warning("Unable to determine local IP address, using 127.0.0.1")
            return False, "127.0.0.1"
        finally:
            s.close()

    logging.info('Our local IP address is ' + str(ip));
    hubAddress = str(ip)

    #Try real DNS server query
    dnsResponse = dnsQuery(ip)
    #Otherwise try just getting hostname
    if dnsResponse == "T":
        logging.warning("Unable to find DNS server by guessing. Attempting to determine hostname == IP locally")
        try:
            dnsResponse = str(socket.gethostbyname(config.REQUIRED_HOSTNAME))
        except socket.gaierror:
            logging.warning(
                config.REQUIRED_HOSTNAME + ' must resolve to ' + ip + '. This can either by done by setting the hostname of this server or setting up a DNS record on your local DNS server')
            return False, ip

    if len(dnsResponse) < 5:
        logging.warning(
            config.REQUIRED_HOSTNAME + " must resolve to " + ip + ". This can either by done by setting the hostname of this server or setting up a DNS record on your local DNS server")
        return False, ip

    if dnsResponse == ip:
        logging.info(config.REQUIRED_HOSTNAME + ' resolves to ' + ip + ' successfully')
        hubAddress = config.REQUIRED_HOSTNAME
    else:
        logging.warning(config.REQUIRED_HOSTNAME + ' resolves to ' +
                        dnsResponse + ' but it should resolve to ' + ip)
        return False, ip
    return True, ip

def dnsQuery(ip):
    #Assume DNS server is on .1 of the our /24 IP range
    #Big assumption, but worth trying
    target = re.sub("\.[0-9]+$", ".1", ip)
    id = random.randint(0,0xFFFF).to_bytes(2, byteorder='big')
    # Bit 16        : Response/Query flag       0 = query
    # Bit 15 - 12   : Operation code            0 = query, 1 = inverse query, 2 = status request, 3 = n/a,  4 = notify, 5 = update
    # Bit 11        : Authoritative answer
    # Bit 10        : Truncation flag
    # Bit 09        : Recursion desired         Set 1
    # Bit 08        : Recursion available
    # Bit 07 - 04   : Zero
    # Bit 00 - 03   : Response code             0 = OK, 1 = Format error, 2 = Server failure, 3 = Name error, 4 = n/a, 5 = Refused, 6+ = other
    flags = int('0b0000000100000000', 2).to_bytes(2, byteorder='big')
    qdCount = (1).to_bytes(2, byteorder='big')
    anCount = (0).to_bytes(2, byteorder='big')
    nsCount = (0).to_bytes(2, byteorder='big')
    arCount = (0).to_bytes(2, byteorder='big')
    nameParts = config.REQUIRED_HOSTNAME.split('.')
    qName = None
    for namePart in nameParts:
        encoded = len(namePart).to_bytes(1, byteorder='big') + namePart.encode()
        if qName == None:
            qName = encoded
        else:
            qName += encoded
    qName += (0).to_bytes(1, byteorder='big')
    # Request type
    # 0x0001 : A record
    # 0x0002 : NS record
    # 0x000F : MX record
    qType = (0x0001).to_bytes(2, byteorder='big')
    # Request class, 0x0001 for Internet address
    qClass = (0x0001).to_bytes(2, byteorder='big')

    request = id + flags + qdCount + anCount + nsCount + arCount + qName + qType + qClass

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(config.SOCKET_TIMEOUT)

    gotResponse = False
    for i in range(0, config.MAX_DNS_REQUESTS):
        sock.sendto(request, (target, 53))

        #Wait for response with our ID
        while True:
            try:
                response = sock.recv(10240)
            except socket.timeout:
                break
            respId = response[0:2]
            if respId == id:
                gotResponse = True
                break
    if not gotResponse:
        #Timeout
        return "T"
    #Check flags indicate "OK"
    respFlags = int.from_bytes(response[2:4], byteorder='big') & int('0b1000000000001111', 2)
    if respFlags != int('0b1000000000000000', 2):
        return ''

    respQCount = int.from_bytes(response[4:6], byteorder='big')
    respAnCount = int.from_bytes(response[6:8], byteorder='big')
    respNsCount = int.from_bytes(response[8:10], byteorder='big')
    respArCount = int.from_bytes(response[10:12], byteorder='big')

    #Should have 1 question and 1 answer only
    if respQCount != 1 or respAnCount != 1 or respNsCount != 0 or respArCount != 0:
        return ''

    #Short-cut to IP address returned which is last 4 bytes

    l = len(response)
    ip =  str(int.from_bytes(response[l - 4: l - 3], byteorder='big')) + "."
    ip += str(int.from_bytes(response[l - 3: l - 2], byteorder='big')) + "."
    ip += str(int.from_bytes(response[l - 2: l - 1], byteorder='big')) + "."
    ip += str(int.from_bytes(response[l - 1: l - 0], byteorder='big'))

    return ip

# Program Start Point
if __name__ == "__main__":
    runThread()
