#!/bin/bash
CONFIG_FILE="config_dist.py"

if ! which docker; then
    echo "Docker must be installed"
    exit 1
fi
if ! which wine; then
    echo "Wine must be installed"
    exit 1
fi


docker run --rm -v "$(pwd):/src/" cdrx/pyinstaller-windows:python3
sed -i -r "s/#define\s+WifiXlationAppVersion .*/#define WifiXlationAppVersion \"$( grep -E "version[[:space:]]*=" setup.py | grep -Eo "[0-9.]+"  )\"/" wifitranslationhub.iss

iscc_exe=$( find ~/*wine -type f -iname "iscc.exe" )
if [[ ${#iscc_exe} -lt 1 ]]; then
    echo "Inno Setup must be installed on Wine : http://www.jrsoftware.org/isinfo.php"
    exit 1
fi
wine_prefix=$( echo "$iscc_exe" | grep -Po ".*(?=/drive_c)" )
if [[ ! -d "$wine_prefix" ]]; then
    echo "Unable to find wine directory for Inno Setup"
    exit 1
fi

rm -f "Output/WifiTranslationHubsetup.exe"
WINEPREFIX=$wine_prefix wine "$iscc_exe" wifitranslationhub.iss
if [[ -f "Output/WifiTranslationHubsetup.exe" ]]; then
    echo "EXE written to Output/WifiTranslationHubsetup.exe"
else
    echo "Expect output file, Output/WifiTranslationHubsetup.exe not found"
fi
