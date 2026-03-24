export function rangeMiddleware() {
  return (req, res, next) => {
    const rangeHeader = req.headers.range;

    if (!rangeHeader) {
      return next();
    }

    // Range 解析会在路由处理函数中进行
    // 这里只保存 rangeHeader 供后续使用
    req.rangeHeader = rangeHeader;
    next();
  };
}
