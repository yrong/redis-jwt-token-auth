#!/bin/sh

curl -H "Content-Type: application/json" -XPOST localhost:3002/auth/register -d '
    {
            "name":"guest",
            "passwd":"guest123",
            "type":"guest"
    }
'

echo '\nadd guest user success!'
