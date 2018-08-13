#/usr/bin/sh
nohup ganache-cli &
cd /usr/caterpillar/services-manager;node ./out/www.js&
sleep 5s
cd /usr/caterpillar/services-manager;node oracle_creation.js&
sleep 5s
cd /usr/caterpillar/caterpillar-core;node ./out/www.js&
cd /usr/caterpillar/execution-panel/dist;httpserver 3200 0.0.0.0 > server.log
