#!/usr/bin/env bash
# Polls for fresh results for scenarios 02, 03, 04 then prints scores.
set -u
DIR=".agentic/project-manager-suite/test-results"
# Reference timestamp: skill was edited recently; we want results newer than ~now-30min is fine,
# so just wait until 02-result.json mtime is after this script's start.
start=$(date +%s)
while :; do
  if [ -f "$DIR/02-result.json" ]; then
    m=$(stat -f%m "$DIR/02-result.json" 2>/dev/null || echo 0)
    if [ "$m" -gt "$start" ]; then
      break
    fi
  fi
  now=$(date +%s)
  if [ $((now-start)) -gt 1500 ]; then echo "TIMEOUT"; break; fi
  sleep 20
done
echo "=== batch results ==="
for n in 02 03 04; do
  g="$DIR/${n}-result.json"
  if [ -f "$g" ]; then
    bun -e "const r=JSON.parse(require('fs').readFileSync('$g','utf8')); const s=r.scores; console.log('scenario $n: total='+r.totalScore+'/70 pass='+r.pass+' | H='+s.hierarchy+' A='+s.assignments+' D='+s.dependencies+' Sync='+s.syncPattern+' Stat='+s.statusManagement+' Beh='+s.behavioralAccuracy+' Comp='+s.completeness);"
  else
    echo "scenario $n: missing"
  fi
done
