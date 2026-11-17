#!/bin/sh
# Full-page screenshot with headless Edge (Windows). Usage: tools/shot.sh <width> <height> <out.png> [query]
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
PROFILE="$(cygpath -w "$HOME")\AppData\Local\Temp\sudamala-edge-shot"
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$PROFILE" \
  --window-size=$1,$2 --screenshot="$(cygpath -wa "$3")" "http://localhost:5173/$4" 2>&1 | grep -i "written"
