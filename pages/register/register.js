// pages/register/register.js
//const AV = require("../../libs/av-core-min.js")
const AV = getApp().AV
Page({

  /**
   * 页面的初始数据
   */
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
  // 注册
  register(){
    let {
      username,
      password,
    } = this.data
    let user = new AV.User()
    if (username) {
      user.set("username",username)
    }
    if (password) {
      user.set("password",password)
    }
    user.save().then(()=>{
      wx.showToast({
        title: "注册成功",
        icon:"success"
      })
      wx.redirectTo({
        url: '../collect information/collect information',
      })
    }).catch(error=>{
      wx.showToast({
        title: error.message,
        icon:"none"
      })
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      username:options.username
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})