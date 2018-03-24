match (n:User) set n.unique_name=n.name,n.category='User'

match (n:Role) set n.uuid=n.name,n.unique_name=n.name,n.category='Role'