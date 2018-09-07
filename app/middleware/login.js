const getPathById = function(id, data) {
  let tmp = [];
  for (var item of data) {
    if (item.id === id) {
      tmp.unshift(item);
      if (item.parentid) {
        tmp.unshift(getPathById(item.parentid, data));
      }
    }
  }
  return tmp;
};
const flatten = function(arr) {
  return arr.reduce(function(pre, cur) {
    if (!Array.isArray(cur)) {
      return [...pre, cur];
    } else {
      return [...pre, ...flatten(cur)];
    }
  }, []);
};

module.exports = (options, app) => {
  return async function login(ctx, next) {
    const qywxConfig = app.config.qywx;
    const qywxLoginConfig = app.config['qywx-login'];

    const { corpid, agentid } = qywxConfig;
    const {
      returnDomainName,
      loginPath,
      logoutPath,
      loginSuccPath,
      loginFailPath,
      noRedirectPath,
      ignore,
      bdDepartmentId,
      adminIdList,
    } = qywxLoginConfig;

    // 白名单逻辑，在白名单内的不需要进行登陆校验
    let isIgnore = false;

    for (const item of ignore) {
      if (
        Object.prototype.toString.call(item) === '[object String]' &&
        item === ctx.request.path
      ) {
        isIgnore = true;
        break;
      }

      if (
        Object.prototype.toString.call(item) === '[object Function]' &&
        item(ctx)
      ) {
        isIgnore = true;
        break;
      }

      if (
        Object.prototype.toString.call(item) === '[object RegExp]' &&
        item.test(ctx.request.path)
      ) {
        isIgnore = true;
        break;
      }
    }

    if (isIgnore) {
      await next();
      return;
    }

    // 扫码成功回跳处理
    // 失败情况：1 扫码未通过 2 查询用户ID失败 3 查询用户信息失败 4 当前用户被禁用或未激活
    if (ctx.request.path === loginPath) {
      if (!!!ctx.request.query.code) {
        ctx.redirect(loginFailPath + '?code=1');
        return;
      }

      const userIdResult = await ctx.service.qywxApi.getUserId(
        ctx.request.query.code,
      );
      if (!!!userIdResult) {
        ctx.redirect(loginFailPath + '?code=2');
        return;
      }

      const userInfo = await ctx.service.qywxApi.getUserInfo(
        userIdResult.UserId,
      );
      if (!!!userInfo) {
        ctx.redirect(loginFailPath + '?code=3');
        return;
      }

      if (!userInfo.enable || !userInfo.status) {
        ctx.redirect(loginFailPath + '?code=4');
        return;
      }

      // 查找所有所属部门路径
      userInfo.departmentDetail = [];
      const departmentInfo = await ctx.service.qywxApi.getAllDepartmentList();
      if (!departmentInfo.errcode) {
        for (const item of userInfo.department) {
          userInfo.departmentDetail.push(
            flatten(getPathById(item, departmentInfo.department)),
          );
        }
      }

      ctx.session.userInfo = userInfo;

      ctx.redirect(loginSuccPath);
    }

    // 登出处理
    else if (ctx.request.path === logoutPath) {
      ctx.session.userInfo = null;
      ctx.redirect(`/`);
    }

    // 其它情况
    // 通过session进行登陆判断
    if (!ctx.session.userInfo) {
      const returnUrl = `${returnDomainName}${loginPath}`;
      const wwLoginUrl = `https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=${corpid}&agentid=${agentid}&state=&redirect_uri=${encodeURIComponent(
        returnUrl,
      )}`;

      // noRedirectPath开头的地址不直接跳转
      if (noRedirectPath && ctx.request.path.indexOf(noRedirectPath) === 0) {
        ctx.status = 401;
        ctx.body = JSON.stringify({
          code: -1,
          msg: 'Not login',
          data: wwLoginUrl,
        });
        return;
      } else {
        ctx.redirect(wwLoginUrl);
      }
    }

    ctx.userInfo = ctx.session.userInfo;

    await next();
  };
};
