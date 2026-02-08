#!/bin/bash
# Start Health OS
cd /home/mj/projects/xenus-health/my-app
export PORT=3000
npm start > /tmp/health-os.log 2>&1 &
echo $! > /tmp/health-os.pid
echo "Health OS started on PID $(cat /tmp/health-os.pid)"
echo "Logs: tail -f /tmp/health-os.log"
