@echo off

echo Ripper starting...

CALL npm install --silent > NUL

:rip
CALL npm run rip --silent
echo Would you like to rip another?
GOTO rip