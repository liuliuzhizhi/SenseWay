// pages/my/my.js
const AV = getApp().AV

Page({
  data: {
    profile: {},
    points: 0, // 从LeanCloud获取
    rank: 0, // 从LeanCloud获取
    imgUrl: '/figure/mycredit.png'
  },

  // 从 LeanCloud 拉取用户档案
  async fetchProfile() {
    this.setData({ loading: true });        //把页面data里面的loading设置为true，显示“加载中”
    try {
      const user = AV.User.current();
      if (!user) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        this.setData({ loading: false });
        return;
      }

      // 约定数据库：Class 名为 UserProfile，字段见文末说明
      const UserProfile = AV.Object.extend('UserProfile');
      const query = new AV.Query(UserProfile);
      query.equalTo('user', user);
      const record = await query.first();

      // 若没有档案可自动创建一个空档案
      let profileObj = record;
      if (!record) {
        profileObj = new UserProfile();
        profileObj.set('user', user);
        await profileObj.save();
      }

      const profile = {
        username: user.get('username') || '',
        mobile: user.get('mobile') || '',
        avatarUrl: user.get('avatarUrl') || '',
        gender: profileObj.get('gender') || '',
        height: profileObj.get('height') || '',
        age: profileObj.get('age') || '',
        weight: profileObj.get('weight') || '',
        bmi: profileObj.get('bmi') || '', // 后端可存一份，前端也会实时算
        allergen: profileObj.get('allergen') || '',
        disease: profileObj.get('disease') || '',
        taste: profileObj.get('taste') || '',
        carnVeg: profileObj.get('carnVeg') || '',
        dietConcept: profileObj.get('dietConcept') || ''
      };

      this.setData({ profile });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '数据加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

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
    // 返回本页时刷新一次（编辑页返回）
    this.fetchProfile();
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