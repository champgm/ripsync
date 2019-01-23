@echo off

cd C:\Users\gil\Desktop\ripsync

echo Ripper starting...

CALL npm install

:rip
CALL npm run rip
echo Would you like to rip another?
GOTO rip