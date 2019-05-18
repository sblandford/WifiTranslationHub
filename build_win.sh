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

if [[ ! -f "nssm.exe" ]]; then
    echo "Latest (Win 10 compatible) 32 bit version of nssm.exe must be present in $( dirname "$( readlink -f $0 )" )"
    exit 1
fi

sed -r "s|_PWD_|$( dirname "$( readlink -f "$0" )" )|g;s|\/|\\\|g" wifitranslationhub.iss >wifitranslationhub_temp.iss

echo
echo "Compiling"
docker run --rm -v "$(pwd):/src/" cdrx/pyinstaller-windows:python3
echo
version=$( grep -E "version[[:space:]]*=" setup.py | grep -Eo "[0-9.]+"  )
echo "Inserting app version $version"
sed -i -r "s/#define\s+WifiXlationAppVersion .*/#define WifiXlationAppVersion \"$version\"/" wifitranslationhub_temp.iss

echo
echo "Find Inno Setup"
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
echo
echo "Create installer"
WINEPREFIX=$wine_prefix wine "$iscc_exe" wifitranslationhub_temp.iss
echo "Executing : WINEPREFIX=$wine_prefix wine \"$iscc_exe\" wifitranslationhub_temp.iss"
if [[ -f "Output/WifiTranslationHubsetup.exe" ]]; then
    mv "Output/WifiTranslationHubsetup.exe" "Output/WifiTranslationHubsetup_$version.exe"
    echo "EXE written to Output/WifiTranslationHubsetup_$version.exe"
else
    echo "Expect output file, Output/WifiTranslationHubsetup.exe not found"
fi

rm -f wifitranslationhub_temp.iss
