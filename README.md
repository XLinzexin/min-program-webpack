# min-program-webpack

## 拓展

- 添加 prevLoad 生命周期，当小程序启动时或者点击路由跳转时执行,该生命周期中无法使用 setData 方法,因为此时页面还没加载完成。(引入 prevload,并使用 owner-navigator 跳转);在 prevload 中请求完数据时,调用 this.emitData(data),将请求到的参数传递给 Page 对象,在其他生命周期里调用 this.recieveData((data)=>{})可以接受到 emitData 传递的数据。
- 优化封装微信原生的 request，当使用封装后的 ajax 时，可以保持同时发起的请求最多只有 10 个，优化未登录请求时的请求流程，添加防止连续请求的功能。
- 修改原生中 Page.onLoad，使扫普通二维码和页面路由跳转时候的参数处理保持一致
- 修改原生中 Component 对象，给该对象添加一个父页面的指针，在 Component 中，可以使用 this.Page 访问到父页面，而父页面可以通过 this.selectComponent 访问组件。这样就解决了不同组件之间的通信问题

## 功能

- 支持引用 `node_modules` 模块
- 支持通过配置 `alias` 来避免 `../../../` 之类的模块引用
- 通过 `babel` 支持更丰富的 `ES6` 兼容，包括 `async/await`
- 内置 `promise` 和 `lodash`（`lodash` 按需引入相应模块，不会全部引入）
- 使用 `less` 编写 `.wxss` 文件

## 全局组件

- auth-mask 封装了小程序的授权逻辑，防止用户拒绝授权时使用
- list-loader 和 lists-loader 负责列表渲染，时常见的组件
- owner-navigator 使用该组件才能出发 prevload 的生命周期

## 规范

- 页面\文件模块化，将入口页面放入 page/mian 文件夹下面，即扫码分享等让用户直接进入的页面，但最多不要超过 10 个页面。其他页面按模块分，如商品模块 page/product、订单模块 page/order。由于小程序的一个页面是 由 4 个文件组成，所以建议用文件夹将其包含起来，如首页可以是 page/mian/home/index。模块化除了方便管理文件，更重要的是分包加载，可以大幅提高首次进入的速度。
- 小程序中多处使用的常量请放到统一的 constant 文件中，多处使用的函数放到 app_action 中（和业务相关），多处使用的工具类请 util 中（单纯的只是工具）。

## 其他

- 使用 wxs 作为过滤器可以使业务逻辑解耦，有利于代码维护，提供了一个 demo 用于处理将图片域名转化为 cdn 域名
- 在根目录有 component 和 page 的 template 文件，新建页面的时候复制粘贴过去就行了。
- 该项目参考 https://github.com/Cap32/wxapp-webpack-plugin， 该项目地址 https://github.com/XLinzexin/min-program-webpack
