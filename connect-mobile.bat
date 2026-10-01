@echo off
echo ========================================================
echo  SmartSports Mobile - USB Reverse Port Forwarder
echo ========================================================
echo Connecting phone port 5187 to PC backend port 5187...
adb reverse tcp:5187 tcp:5187
echo.
echo Active ADB Reverse Mappings:
adb reverse --list
echo.
echo ========================================================
echo  Ready! Your phone can now connect to http://localhost:5187
echo ========================================================
pause
