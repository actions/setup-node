@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\..\jest-cli\bin\jest.js" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\..\jest-cli\bin\jest.js" %*
)