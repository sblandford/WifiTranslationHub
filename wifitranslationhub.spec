# -*- mode: python -*-

block_cipher = None


a = Analysis(['wifitranslationhub.py'],
             pathex=['Z:\\src'],
             binaries=[],
             datas=[('web','web'),('config_dist.py','.'),('nssm.exe','.')],
             hiddenimports=[],
             hookspath=['.'],
             runtime_hooks=[],
             excludes=['config','config_dist'],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          exclude_binaries=True,
          name='wifitranslationhub',
          debug=False,
          strip=False,
          upx=True,
          console=False
          )
coll = COLLECT(exe,
               a.binaries,
               a.zipfiles,
               a.datas,
               strip=False,
               upx=True,
               name='wifitranslationhub')
