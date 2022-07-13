#NoEnv                      ; Recommended for performance and compatibility with future AutoHotkey releases.
#Warn                     ; Enable warnings to assist with detecting common errors.
#SingleInstance FORCE       ; Skip invocation dialog box and silently replace previously executing instance of this script.
SendMode Input              ; Recommended for new scripts due to its superior speed and reliability.

#IfWinActive ahk_exe WINWORD.EXE
^+V::
    KeyWait Ctrl
	Send, {LAlt}
    Send, hvt
return