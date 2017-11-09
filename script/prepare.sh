#!/usr/bin/env bash
cd ..
if [ ! -d "config" ]; then
git clone https://git.coding.net/alien11/config.git&&cd config
else
cd config&&git pull origin master
fi
cd ../auth
if [ ! -d "config" ]; then
  ln -s ../config/config .
fi
