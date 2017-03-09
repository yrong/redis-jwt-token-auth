'use strict';

import db from '../lib/db';
import log4js from 'log4js';
import md5 from 'md5';

const Account = {}
const LOG = log4js.getLogger('file');

Account.findOne = function (id, cb) {
    // db.queryAsync('select * from t_account where id = ?', [id], function(err, results) {
    const account = {"id": 1, "username" : "test", "password" : "test"}
    cb(null, account)

}

Account.verify = function(username, password) {

    // return db.querySql(`SELECT * FROM users where name=?`,[`${username}`]).then((account)=>{
    //     if(account == null || account.length != 1) {
    //         throw new Error(`user with name ${username} not exist!`)
    //     } else{
    //         if(md5(password) !== account[0].passwd){
    //             throw new Error("user password not match!");
    //         }else {
    //             return account[0];
    //         }
    //     }
    // });

    return db.queryCql(`MATCH (u:User{alias:'${username}'}) return u`).then((account)=>{
        if(account == null || account.length != 1) {
            throw new Error(`user with name ${username} not exist!`)
        } else{
            if(md5(password) !== account[0].passwd){
                throw new Error("user password not match!");
            }else {
                return account[0];
            }
        }
    });
}

export default Account;