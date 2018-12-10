#!/bin/sh

curl --header "Content-Type: application/json" -XPUT localhost:9200/user/_mapping/doc -d'
    {
            "properties" : {
                "test_expiration_date" : {"type" : "keyword"}
            }
    }
'

echo '\nmodify es schema success!'
