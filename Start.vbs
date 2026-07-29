' My3DLibrary Portable — Silent Launcher
' Double-click this file to start My3DLibrary with no terminal windows.
' The server log is written to data\server.log for debugging.

Option Explicit

Dim oShell, oFSO, sRoot, sNode, sIndex, sData, sJWT, sHealth, oExec, sOut

Set oShell = CreateObject("WScript.Shell")
Set oFSO   = CreateObject("Scripting.FileSystemObject")

' Resolve the folder this .vbs lives in (strip trailing backslash)
sRoot = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)

' ── Single-instance guard ────────────────────────────────────────────────────
' If the server is already up, just open the browser and exit.
On Error Resume Next
Set oExec = oShell.Exec("cmd /c curl -s -o nul -w ""%{http_code}"" http://localhost:3000/api/health")
sOut = ""
If Err.Number = 0 Then
    Do While Not oExec.StdOut.AtEndOfStream
        sOut = sOut & oExec.StdOut.ReadAll()
    Loop
End If
On Error GoTo 0
If Left(sOut, 1) = "2" Or Left(sOut, 1) = "3" Then
    oShell.Run "http://localhost:3000", 1, False
    WScript.Quit 0
End If

' ── Validate node.exe ────────────────────────────────────────────────────────
sNode  = sRoot & "\runtime\node.exe"
sIndex = sRoot & "\dist\index.js"
If Not oFSO.FileExists(sNode) Then
    MsgBox "ERROR: runtime\node.exe not found." & vbCrLf & _
           "Make sure all files are extracted from the ZIP.", vbCritical, "My3DLibrary"
    WScript.Quit 1
End If

' ── Create required folders ──────────────────────────────────────────────────
sData = sRoot & "\data"
If Not oFSO.FolderExists(sData) Then oFSO.CreateFolder(sData)
If Not oFSO.FolderExists(sRoot & "\library") Then oFSO.CreateFolder(sRoot & "\library")

' ── Generate JWT secret on first run ─────────────────────────────────────────
Dim sJWTFile : sJWTFile = sData & "\.jwt_secret"
If Not oFSO.FileExists(sJWTFile) Then
    ' Use PowerShell to generate a random secret
    oShell.Run "powershell -WindowStyle Hidden -Command """ & _
        "[System.Guid]::NewGuid().ToString('N') + [System.Guid]::NewGuid().ToString('N') | " & _
        "Set-Content -Path '" & sJWTFile & "'""", 0, True
End If
' Read the secret
Dim oFile : Set oFile = oFSO.OpenTextFile(sJWTFile, 1)
sJWT = Trim(oFile.ReadLine())
oFile.Close

' ── Start Ollama if present (hidden) ─────────────────────────────────────────
Dim sOllama : sOllama = sRoot & "\ollama\ollama.exe"
If oFSO.FileExists(sOllama) Then
    If Not oFSO.FolderExists(sRoot & "\ollama\models") Then
        oFSO.CreateFolder(sRoot & "\ollama\models")
    End If
    oShell.Run """" & sOllama & """ serve", 0, False
    WScript.Sleep 3000
End If

' ── Build environment string for the server process ──────────────────────────
Dim sEnv
sEnv = "NODE_ENV=production" & " & " & _
       "PORT=3000" & " & " & _
       "DB_PATH=" & sData & "\library.db" & " & " & _
       "OLLAMA_HOST=http://localhost:11434" & " & " & _
       "PORTABLE_ROOT=" & sRoot & " & " & _
       "NODE_PATH=" & sRoot & "\node_modules" & " & " & _
       "JWT_SECRET=" & sJWT

' ── Start the server (hidden, output to server.log) ──────────────────────────
Dim sCmd
sCmd = "cmd /c """ & _
       "set " & sEnv & " && " & _
       """" & sNode & """ """ & sIndex & """ >> """ & sData & "\server.log"" 2>&1"""
oShell.Run sCmd, 0, False

' ── Wait for the server to be ready (poll up to 45 s) ────────────────────────
Dim iTries : iTries = 0
Dim bReady : bReady = False
Do While iTries < 45 And Not bReady
    WScript.Sleep 1000
    iTries = iTries + 1
    On Error Resume Next
    Set oExec = oShell.Exec("cmd /c curl -s -o nul -w ""%{http_code}"" http://localhost:3000/api/health")
    sOut = ""
    If Err.Number = 0 Then
        Do While Not oExec.StdOut.AtEndOfStream
            sOut = sOut & oExec.StdOut.ReadAll()
        Loop
    End If
    On Error GoTo 0
    If Left(sOut, 1) = "2" Or Left(sOut, 1) = "3" Then bReady = True
Loop

' ── Open the browser ─────────────────────────────────────────────────────────
oShell.Run "http://localhost:3000", 1, False

' ── Show a minimal system-tray-style notification via balloon tip ─────────────
' (Uses a hidden PowerShell snippet — works on Windows 10/11)
oShell.Run "powershell -WindowStyle Hidden -Command """ & _
    "Add-Type -AssemblyName System.Windows.Forms;" & _
    "$n = New-Object System.Windows.Forms.NotifyIcon;" & _
    "$n.Icon = [System.Drawing.SystemIcons]::Information;" & _
    "$n.Visible = $true;" & _
    "$n.ShowBalloonTip(4000,'My3DLibrary','Running at http://localhost:3000 — close this notification to continue.',[System.Windows.Forms.ToolTipIcon]::Info);" & _
    "Start-Sleep 5;" & _
    "$n.Dispose()""", 0, False

WScript.Quit 0
