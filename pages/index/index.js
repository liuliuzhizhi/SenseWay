// index.js
const AV = require("../../libs/av-core-min.js")
Page({
  data: {
    username:"",
    password:"",
  },

  // 用户名输入触发事件
  inputUsername(e) {
    this.setData({
      username:e.detail.value
    })
  },
  // 密码输入触发事件
  inputPassword(e) {
    this.setData({
      password:e.detail.value
    })
  },
  toRegister(){
    wx.navigateTo({
      url: '../register/register?username=' + this.data.username,
    })
  },
   // 登录
  login(){
    let username = this.data.username
    let password = this.data.password
    AV.User.logIn(username,password).then(
      (userLogined)=>{
        wx.showToast({
          title: userLogined.username + "欢迎登录",
          icon:"success"
        })
        wx.redirectTo({
          url: "../my/my"
        })
      },(error)=>{
        wx.showToast({
          title: JSON.stringify(error),
          icon:"error"
        })
      }
    )
  },

  onLoad(){
  }
})
