MATCH (n:User) SET n.name=n.alias
RETURN n;