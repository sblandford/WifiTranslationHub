# !/usr/bin/env python3

__author__ = "Simon Blandford"

from Log import log
import os
import signal
import threading
import time
import urllib.request
import socket

try:
    import config
except ImportError:
    import config_dist as config


ended = False
thread = False

mainpid = False

def runThread(pid):
    global thread
    global mainpid

    mainpid = pid

    if not thread:
        log().info('Starting Watchdog thread')
        thread = threading.Thread(target=watchdog)
        thread.start()
    else:
        log().warning('Watchdog thread already started')

def sigStopThread():
    global ended
    if thread:
        log().info('Ending Watchdog thread')
    else:
        log().warning('Watchdog thread already signaled to stop')
    ended = True

def waitStopThread():
    global thread
    if thread:
        thread.join(config.THREAD_WAIT)
    thread = False

def watchdog():
    global ended

    fails = 0
    while not ended:
        time.sleep(config.WATCHDOG_POLL_TIME)
        failed = False

        # HTTP server test
        try:
            http_poll = urllib.request.urlopen("http://localhost:" + str(config.WEB_SERVER_PORT) + "/json/stat.json?callback=watchdog", timeout = config.WATCHDOG_FETCH_TIMEOUT).read()
            if not "watchdog" in http_poll.decode(errors="ignore"):
                log().error("HTTP server response failure, remaining attempts : %d", config.WATCHDOG_FAILS_MAX - fails)
                failed = True
        except Exception as e:
            log().error("HTTP server request failure, remaining attempts : %d", config.WATCHDOG_FAILS_MAX - fails)
            log().error(e.strerror)
            failed = True

        # RTSP server test
        try:
            client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client.connect(("localhost", config.HUB_SERVER_PORT))
            client.send(b"OPTIONS /00 RTSP/1.0\r\nCSeq: 1\r\n\r\n")
            rtsp_poll = client.recv(config.MAX_RECV)
            if not "200 OK" in rtsp_poll.decode(errors="ignore"):
                log().error("RTSP server response failure, remaining attempts : %d", config.WATCHDOG_FAILS_MAX - fails)
                failed = True
        except Exception as e:
            log().error("RTSP server request failure, remaining attempts : %d", config.WATCHDOG_FAILS_MAX - fails)
            log().error(e.strerror)
            failed = True
        finally:
            try:
                client.close()
            except:
                pass

        if failed:
            fails = fails + 1
            if (fails > config.WATCHDOG_FAILS_MAX):
                log().critical("********** Aborting: Too many watchdog fails **********")
                try:
                    os.kill(mainpid, signal.SIGABRT)
                except:
                    log().critical("Unable to terminal on watchdog timeout")
        else:
            fails = 0
            log().debug("Watchdog OK")
