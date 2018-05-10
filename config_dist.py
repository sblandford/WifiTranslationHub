#!/usr/bin/python3

__author__ = "Simon Blandford"

import logging

LOG_LEVEL = logging.INFO

THREAD_WAIT = 3.0

REQUIRED_HOSTNAME = "translation.lan"
HUB_ACCESS_IP_ADDRESS = ""
HUB_TAKE_ACCESS_IP_ADDRESS_AS_GOSPEL = False
HUB_ACCESS_PORT = 0
HUB_ACCESS_CODE = ""
HUB_WAN_PROTOCOL = "https"
HUB_LAN_PROTOCOL = "http"
QR_CODE_INCLUDE_ANDROID_APP = True

DEFAULT_ADMIN_PASSWORD = "admin"
ADMIN_PASSWORD_MIN_LENGTH = 5

CONFIG_UPDATE_SECONDS = 2.0

HUB_SERVER_PORT = 8553
HUB_LISTEN_BACKLOG = 5
WEB_SERVER_PORT = 8080
IP_BROADCAST_PORT = 1235
IP_BROADCAST_SECONDS = 5
MAX_DNS_REQUESTS = 3

SOCKET_TIMEOUT = 2.0
SOCKET_RETRY_SECONDS = 5.0

MAX_CHANNELS = 10
MULTICAST_BASE_ADDR = "228.227.226.225"
MULTICAST_PORT = 1234
MULTICAST_PACKET_BUFFER_SIZE = 4096
MUTLICAST_UUID_OFFSET = 256
MUTLICAST_MANAGEMENT_OFFSET = 0
HUB_PACKET_BUFFER_SIZE = 4096
RTSP_CLIENT_TIME_OUT_SECONDS = 120.0
HTTP_CLIENT_TIME_OUT_SECONDS = 120.0
HTTP_TIME_OUT_SECONDS = 5.0
HTTP_MAX_SEQ_AHEAD = 10
HTTP_RTP_CACHE_SECONDS = 1
HTTP_SDP_CACHE_SECONDS = 300
HTTP_STAT_CACHE_SECONDS = 10
HTTP_QR_CACHE_SECONDS = 300
HTTP_WEB_CACHE_SECONDS = 300
UUID_LENGTH = 36
UUID_TIMEOUT_SECONDS = 2.0

MAX_RECV = 256
SERVER_ID = "TranslationHub"
SESSION_ID_LENGTH = 16
SSRC_LENGTH = 8
PACKET_REDUNDANCY_FLAG = "pktredundant"
CACHE_NUMBER_OF_PACKETS = 10

RTP_HEADER_SIZE = 12
RTP_PAYLOAD_ID = 97
RTP_TOC_HEADER = 0xF0
