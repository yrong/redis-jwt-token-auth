#!/usr/bin/env bash

if [ ! -d "config" ]; then
  if [ ! -d "../config" ]; then
   git clone https://git.coding.net/alien11/config.git ../config
  fi
  ln -s ../config/config .
fi
