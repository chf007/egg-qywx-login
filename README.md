# egg-qywx-login

企业微信扫码登陆 Egg 插件，日前只持 Egg2.x 以上版本

## 安装

```
npm install egg-qywx-login
```

## 启用
```
// config/plugin.js

exports['qywx-login'] = {
  enable: true,
  package: 'egg-qywx-login',
};

```

## 配置说明
```
// config/config.default.js

config['qywx-login'] = {
    returnDomainName: 'https://admin.xxx.com', // 扫码回跳域名 必填
    loginPath: '/login', // 登陆处理
    logoutPath: '/logout', // 登出处理
    loginSuccPath: '/', // 登陆成功后跳转地址
    loginFailPath: '/login-fail.html', // 登陆失败后跳转地址，可以应用中自定义
    noRedirectPath: '/api/', // 哪些地址不直接跳转而是将控制权交给前端
    ignore: [ // 不需要校验登陆url名单，支持字符串，正则，回调函数(会传入ctx，返回true/false)
      '/login-fail.html',
      /abc/g,
      function(ctx) {
          return true;
      } 
    ],
};

```

## 目前支持

- 基于 Cookie/Session 的扫码登陆校验
- 登陆成功后用户信息会写入 ctx.userInfo 中
- 暂时没有每次校验拉取用户信息，如果用户信息在企业微信中有变更，重新扫码登陆后才能更新
