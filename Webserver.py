# !/usr/bin/env python3

__author__ = "Simon Blandford"

from Log import log
import http.server
try:
    import config
except ImportError:
    import config_dist as config
import http.server
import mimetypes
import os
import random
import re
import socket
import socketserver
import sys
import time

import BackEnd
import MulticastRxUniTx
import RTSPServerSession

httpd = None
thread = False
ended = False

def start():
    global httpd
    global ended

    HandlerClass = Handler
    ServerClass = ThreadingSimpleServer
    reported = False
    while not ended:
        try:
            httpd = ServerClass(('', config.WEB_SERVER_PORT), HandlerClass)
            httpd.timeout = config.SOCKET_TIMEOUT
        except:
            if not reported:
                log().error("Webserver : %s", sys.exc_info()[0])
            reported = True
            time.sleep(config.SOCKET_RETRY_SECONDS)
            pass
        else:
            break

    log().info ("Starting web server on port : %d", config.WEB_SERVER_PORT)
    ended = False
    while not ended:
        try:
            httpd.handle_request()
        except KeyboardInterrupt:
            pass
    httpd.socket.close()

def stop():
    global ended

    log().info("Stopping web server")
    ended = True

class ThreadingSimpleServer (socketserver.ThreadingMixIn, http.server.HTTPServer):
    pass

class Handler(http.server.BaseHTTPRequestHandler):
    def __init__(self, request, client_address, server):
        # Timeout causes Android to only partially load pages ??
        # self.timeout = 3.0
        http.server.BaseHTTPRequestHandler.__init__(self, request, client_address, server)
        self.protocol_version = "HTTP/1.1"

    def log_message(self, format, *args):
        # Filter out timeout and 200 messages
        for arg in args:
            if str(arg) == "timed out" or str(arg) == "200":
                return
        log().debug(format%args)

    def _respond(self, contentType, binContent, cacheSeconds=-1):
        self.send_response(200)
        if cacheSeconds == -1:
            self.send_header("Cache-Control", "no-cache, no-store")
        else:
            self.send_header("Cache-Control", "max-age=" + str(cacheSeconds))
        self.send_header("Content-type", contentType)
        self.send_header("Content-length", len(binContent))
        self.end_headers()
        self.wfile.write(binContent)

    def _error(self, code, message, cache=True):
        if cache:
            self.send_response(code, message)
            self.send_header("Cache-Control", "max-age=" + str(config.HTTP_RTP_CACHE_SECONDS))
            self.end_headers()
        else:
            self.send_response(code, message)
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            self.end_headers()

    def _redirect(self, url):
        self.send_response(307)
        self.send_header("Location", url)
        self.end_headers()

    def handle(self):
        try:
            http.server.BaseHTTPRequestHandler.handle(self)
        except (socket.error, KeyboardInterrupt) as err:
            pass

    def do_GET(self):
        if '..' in self.path:
            self._error(403, "Illegal path with .. in it")
            return

        channel, seq, path, params, ip = RTSPServerSession.urlDecode(str(self.path))

        remoteIp = None
        for header in self.headers._headers:
            param, value = header

            if param == "X-Forwarded-For":
                remoteIp = value

        if not remoteIp:
            remoteIp, remotePort = self.client_address

        if BackEnd.rewritable(remoteIp):
            self._redirect(config.HUB_ACCESS_LAN_URL)
            return

        onLan = BackEnd.isLan(remoteIp)
        # Register if remote IP is in range
        if not onLan and not BackEnd.checkIpLocationRange(remoteIp):
            self._error(403, "IP location out of range")
            return

        if channel >= 0:
            if '/rtp/' in path:
                # If we have a channel and a uuid parameter then register client and return seq number
                if 'uuid' in params and len(params['uuid']) == config.UUID_LENGTH:
                    if not onLan:
                        code, problem = BackEnd.checkRange(params)
                        if code != 200:
                            self._error(code, problem)
                            return
                    contentType = "application/javascript"
                    content = BackEnd.RtpRefesh(channel, params, onLan)
                    self._respond(contentType, bytearray(content, "utf8"))
                    return
                elif seq >= 0:
                    if config.HTTP_TEST_ERROR_PERCENT > 0 and random.randint(0, 100) < config.HTTP_TEST_ERROR_PERCENT:
                        self._error(404, "No RTP packet available. Test-mode failure percentage is set to " + str(config.HTTP_TEST_ERROR_PERCENT), cache = False)
                    else:
                        log().debug("RTP packet over HTTP requested by %s on channel: %d, seq: %d", remoteIp, channel, seq)
                        contentType = "application/octet-stream"
                        binContent, cache = MulticastRxUniTx.getHttpRtpPacketSeq(channel, seq)
                        if binContent:
                            self._respond(contentType, binContent, config.HTTP_RTP_CACHE_SECONDS)
                        else:
                            self._error(404, "No RTP packet available with cache : " + str(cache), cache=cache)
            elif "/sdp/" in path:
                # Assume multicast SDP file request
                contentType = "application/sdp"
                binContent = bytearray(RTSPServerSession.genSdp(False, ip, channel), "utf8")
                self._respond(contentType, binContent, config.HTTP_SDP_CACHE_SECONDS)
            return

        if '/json/' in path:
            code, problem, content, cacheSeconds = BackEnd.respond(path, params, self.path, onLan)
            if code == 200:
                contentType = "application/javascript"
                self._respond(contentType, bytearray(content, "utf8"), cacheSeconds)
            else:
                self._error(code, problem)
            return
        elif re.match("\/qr($|\/)", path):
            linkAddr = BackEnd.linkAddress()
            contentType = "text/html"
            content  = "<!DOCTYPE html>\n"
            content += "<html>\n"
            content += "  <head>\n"
            content += "    <meta charset=\"UTF-8\">\n"
            content += "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" >\n"
            content += "    <title>Translation QR code</title>\n"
            content += "    <script src=\"/js/qrcode.js\"></script>\n"
            content += "  </head>\n"
            content += "  <body>\n"
            content += "    <div style=\"display: flex;align-items: center;justify-content: center\">\n"
            content += "    <table>\n"
            content += "      <tr><td><div><h1 style=\"font-size: 1.2em;\">" + linkAddr + "</h1></div></tr></td>\n"
            content += "      <tr><td><div id=\"qrcode\"></div></tr></td>\n"
            content += "    </div>\n"
            content += "    <script type=\"text/javascript\">\n"
            content += "      new QRCode(document.getElementById(\"qrcode\"), \"" + linkAddr + "\");\n"
            content += "    </script>\n"
            content += "  </body>\n"
            content += "</html>\n"
            self._respond(contentType, bytearray(content, 'utf8'), config.HTTP_QR_CACHE_SECONDS)
            return

        # Default to a simple static content web server
        if len(path) == 0 or path == "/":
            path = "index.html"

        isIndex = False
        if re.match(".*index.html", path):
            isIndex = True

        contentType, encoding = mimetypes.guess_type(path)
        filePath = os.getcwd() + '/web/' + path
        log().debug("Opening file for %s : %s, type %s", remoteIp, filePath, contentType)
        try:
            fsock = open(filePath, "rb")
        except IOError:
            log().warning("Unable to open file : %s", filePath)
            self._error(404, "File not found : " + path)
        else:
            binContent = bytearray(fsock.read())
            fsock.close()
            # Disable Android app download if index file and config set. So all clients use web app only.
            if isIndex and not config.QR_CODE_INCLUDE_ANDROID_APP:
                binContent = binContent.replace(b"includeApp = true", b"includeApp = false")
            self._respond(contentType, binContent, config.HTTP_WEB_CACHE_SECONDS)


    def do_POST(self):
        content_length = int(self.headers['Content-Length']) # <--- Gets the size of data
        post_data = self.rfile.read(content_length) # <--- Gets the data itself
        log().info("\nPOST request,\nPath: %s\nHeaders:\n%s\n\nBody:\n%s\n",
                str(self.path), str(self.headers), post_data.decode("utf-8"))

        self._set_response()
        self.wfile.write("POST request for {}".format(self.path).encode("utf-8"))
