'use strict';

import compose from 'koa-compose';
import checkauth from './checkauth';
import jwt_token from './token';
import Redis from 'ioredis';
import config from '../config/config'

var redis = new Redis(config.redis.port, config.redis.host, {dropBufferSupport: true,enableOfflineQueue:false});

export default function middleware() {
    return compose(
        [
            jwt_token({
                client: redis,
                secret: config.app.secret
            }),
            checkauth()
        ]
    )
}