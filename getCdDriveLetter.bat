@echo off
setlocal
for /f "skip=1 tokens=1,2" %%i in ('wmic logicaldisk get caption^, drivetype') do (
  if [%%j]==[5] echo %%i
  )
endlocal