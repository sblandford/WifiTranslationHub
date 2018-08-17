#!/bin/bash
docker run --rm -v "$(pwd):/src/" cdrx/pyinstaller-windows:python3
WINEPREFIX=/home/simonb/wine/innosetup wine "/home/simonb/wine/innosetup/drive_c/Program Files (x86)/Inno Setup 5/ISCC.exe" wifitranslationhub.iss
cp Output/WifiTranslationHubsetup.exe /home/simonb/Public/.
