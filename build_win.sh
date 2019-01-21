#!/bin/bash
CONFIG_FILE="config_dist.py"
docker run --rm -v "$(pwd):/src/" cdrx/pyinstaller-windows:python3
sed -i -r "s/#define\s+WifiXlationAppVersion .*/#define WifiXlationAppVersion \"$( grep -E "version[[:space:]]*=" setup.py | grep -Eo "[0-9.]+"  )\"/" wifitranslationhub.iss

WINEPREFIX=/home/simonb/wine/innosetup wine "/home/simonb/wine/innosetup/drive_c/Program Files (x86)/Inno Setup 5/ISCC.exe" wifitranslationhub.iss
cp Output/WifiTranslationHubsetup.exe /home/simonb/Public/.
