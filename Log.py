# !/usr/bin/python3

__author__ = "Simon Blandford"

try:
    import config
except ImportError:
    import config_dist as config
import logging
from logging.handlers import RotatingFileHandler
import platform

logObj = None

def log_init():
    global logObj

    if platform.system() in config.LOG_FILE_PLATFORMS:
        logFormatter = logging.Formatter(config.LOG_FILE_FORMAT)
        logHandler = RotatingFileHandler(config.LOG_FILE_FILENAME, mode='a', maxBytes=config.LOG_FILE_MAX_SIZE,
                                 backupCount=config.LOG_FILE_ROTATION_COUNT, encoding=None, delay=0)
        logHandler.setFormatter(logFormatter)
        logHandler.setLevel(config.LOG_LEVEL)

        logObj = logging.getLogger('root')
        logObj.setLevel(config.LOG_LEVEL)
        logObj.addHandler(logHandler)
    else:
        logObj = logging
        logObj.basicConfig(level=config.LOG_LEVEL)

def log():
    global logObj

    return logObj