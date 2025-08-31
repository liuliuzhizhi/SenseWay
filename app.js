// app.js
const AV = require("./libs/av-core-min.js");
const adapters = require("./libs/leancloud-adapters-weapp.js");

AV.setAdapters(adapters);
AV.init({
  appId: 'jgtT3GyCqPeWTIDfNKaNsLyO-gzGzoHsz',
  appKey: 'uyZERsgcLRLRikQXbNXbIieo',
  serverURL: "https://jgtt3gyc.lc-cn-n1-shared.com",
});

App({
  AV,
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  }
})
