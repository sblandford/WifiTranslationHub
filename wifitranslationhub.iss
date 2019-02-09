; Script generated by the Inno Setup Script Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

#define WifiXlationAppName "Wifi Translation Hub"
#define WifiXlationAppVersion "0.3"
#define WifiXlationAppPublisher "BKWSU"
#define WifiXlationAppURL "https://github.com/sblandford/WifiTranslationHub"
#define WifiXlationAppExeName "wifitranslationhub.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{27487EA8-804B-4B3C-A197-D5E69F0DAA82}
AppName={#WifiXlationAppName}
AppVersion={#WifiXlationAppVersion}
AppVerName={#WifiXlationAppName} {#WifiXlationAppVersion}
AppPublisher={#WifiXlationAppPublisher}
AppPublisherURL={#WifiXlationAppURL}
AppSupportURL={#WifiXlationAppURL}
AppUpdatesURL={#WifiXlationAppURL}
DefaultDirName={pf}\{#WifiXlationAppName}
DefaultGroupName={#WifiXlationAppName}
DisableProgramGroupPage=yes
LicenseFile=Z:_PWD_\LICENSE
OutputBaseFilename=WifiTranslationHubsetup
SetupIconFile=Z:_PWD_\web\favicon.ico
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "Z:_PWD_\dist\windows\wifitranslationhub\wifitranslationhub.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\web\*"; DestDir: "{app}\web"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "Z:_PWD_\dist\windows\wifitranslationhub\_bz2.pyd"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\_hashlib.pyd"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\_lzma.pyd"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\_socket.pyd"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\_ssl.pyd"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-console-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-datetime-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-debug-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-errorhandling-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-file-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-file-l1-2-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-file-l2-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-handle-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-heap-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-interlocked-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-libraryloader-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-localization-l1-2-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-memory-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-namedpipe-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-processenvironment-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-processthreads-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-processthreads-l1-1-1.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-profile-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-rtlsupport-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-string-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-synch-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-synch-l1-2-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-sysinfo-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-timezone-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-core-util-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-conio-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-convert-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-environment-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-filesystem-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-heap-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-locale-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-math-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-process-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-runtime-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-stdio-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-string-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-time-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\api-ms-win-crt-utility-l1-1-0.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\base_library.zip"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\nssm.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\config_dist.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\pyexpat.pyd"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\python36.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\pywintypes36.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\select.pyd"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\ucrtbase.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\unicodedata.pyd"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\VCRUNTIME140.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\wifitranslationhub.exe.manifest"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\win32api.pyd"; DestDir: "{app}"; Flags: ignoreversion
Source: "Z:_PWD_\dist\windows\wifitranslationhub\win32evtlog.pyd"; DestDir: "{app}"; Flags: ignoreversion
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{group}\{#WifiXlationAppName}"; Filename: "http://localhost:8080/admin.html";
Name: "{commondesktop}\{#WifiXlationAppName}"; Filename: "http://localhost:8080/admin.html"; Tasks: desktopicon
Name: "{group}\Uninstall"; Filename: "{app}\unins000.exe"

[Run]
;Firewall settings

Filename: powershell.exe; Parameters: "New-NetFirewallRule -Group '{#WifiXlationAppName}' -DisplayName '{#WifiXlationAppName} application' -Program '{app}\{#WifiXlationAppExeName}' -Action allow"; Flags: runhidden

;Service install
Filename: {app}\nssm.exe; Parameters: "install wifiTranslationHubSrv ""{app}\{#WifiXlationAppExeName}""" ; Flags: runhidden
Filename: {app}\nssm.exe; Parameters: "start wifiTranslationHubSrv"; Flags: runhidden

;Open web URL of service
Filename: "http://localhost:8080/admin.html"; Flags: shellexec runasoriginaluser postinstall; Description: "Open the url."

[UninstallRun]
Filename: {app}\nssm.exe; Parameters: "stop wifiTranslationHubSrv" ; Flags: runhidden
Filename: {app}\nssm.exe; Parameters: "remove wifiTranslationHubSrv" ; Flags: runhidden
Filename: powershell.exe; Parameters: "Remove-NetFirewallRule -Group '{#WifiXlationAppName}' "; Flags: runhidden


