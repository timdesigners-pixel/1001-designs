@echo off
rem Design Replicator - kurulum yardimcisi.
rem chrome://extensions sayfasini ve eklenti klasorunu acar; "Paketlenmemis oge yukle" ile bu klasoru secin.
setlocal
set "DIR=%~dp0"
if exist "%DIR%manifest.json" (set "EXT=%DIR%") else (set "EXT=%DIR%..\")
echo.
echo  Design Replicator - kurulum
echo  1) Acilan Chrome sayfasinda sag ustten "Gelistirici modu"nu acin
echo  2) "Paketlenmemis oge yukle" -> su klasoru secin:
echo     %EXT%
echo.
echo %EXT%| clip
echo  (Klasor yolu panoya kopyalandi.)
start "" chrome "chrome://extensions"
start "" explorer "%EXT%"
endlocal
