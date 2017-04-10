#! /bin/bash

chmod +x ./build/script/*
git_commit=$(git rev-parse HEAD)
tar -zcvf ./auth-api-$git_commit.tar.gz ./build

while [ "$1" != "" ]; do
    PARAM=`echo $1 | awk -F= '{print $1}'`
    VALUE=`echo $1 | awk -F= '{print $2}'`
    case $PARAM in
        --dir)
            releaseDir=$VALUE
            ;;
        *)
            echo "ERROR: unknown parameter \"$PARAM\""
            usage
            exit 1
            ;;
    esac
    shift
done
echo "move build file to $releaseDir"
mv ./auth-api-$git_commit.tar.gz $releaseDir