@echo off
"C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" --dbpath "C:\mongodata" --port 27017 --bind_ip 127.0.0.1 --logpath "C:\mongodata\mongod.log" --logappend