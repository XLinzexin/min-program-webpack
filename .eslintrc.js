module.exports = {
  "root": true,
  "parserOptions": {
    "parser": "babel-eslint"
  },
  "extends": ["cantonjs"],
  "globals": {
    "__DEV__": true,
    "__WECHAT__": true,
    "__ALIPAY__": true,
    "App": true,
    "Page": true,
    "Component": true,
    "wx": true,
    "my": true,
    "getApp": true,
    "getCurrentPages": true
  },
  "settings": {
    "import/resolver": {
      "webpack": {
        "config": "webpack.config.babel.js"
      }
    }
  },
}
