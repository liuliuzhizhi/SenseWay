// pages/userprofile/userprofile.js
const AV = getApp().AV

Page({
  data: {
    loading: true,
    profile: {},       // 与 LeanCloud 字段一一对应
    maskedMobile: '',
    computedBMI: ''
  },

  onShow() {
    // 返回本页时刷新一次（编辑页返回）
    this.fetchProfile();
  },

  onPullDownRefresh() {
    this.fetchProfile().finally(() => wx.stopPullDownRefresh());
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
        bmi: profileObj.get('bmi') || '', 
        allergen: profileObj.get('allergen') || '',
        disease: profileObj.get('disease') || '',
        taste: profileObj.get('taste') || '',
        carnVeg: profileObj.get('carnVeg') || '',
        dietConcept: profileObj.get('dietConcept') || ''
      };

      const maskedMobile = this.maskMobile(profile.mobile);
      const computedBMI = this.calcBMI(profile.height, profile.weight, profile.bmi);

      this.setData({ profile, maskedMobile, computedBMI, loading: false });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '数据加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  maskMobile(mobile) {
    if (!mobile || String(mobile).length < 7) return '未绑定手机号';
    const s = String(mobile);
    return s.slice(0, 3) + '******' + s.slice(-2);
  },

  calcBMI(height, weight, fallbackBmi) {
    if (height && weight) {
      const h = Number(height) / 100;
      const w = Number(weight);
      const bmi = (w / (h * h));
      return bmi ? bmi.toFixed(2) : (fallbackBmi || '');
    }
    return fallbackBmi || '';
  },

  // 头像点击：选择并上传
  onTapAvatar() {
    const that = this;
    wx.showActionSheet({
      itemList: ['从相册选择'],
      success() {
        wx.chooseImage()({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album'],
          success: async (res) => {
            const filePath = res.tempFilePaths[0];
            try {
              wx.showLoading({ title: '上传中' });
              // 上传到 LeanCloud File
              const file = new AV.File('avatar.jpg', {
                blob: { uri: filePath }
              });
              const saved = await file.save();

              // 更新到 User 与页面
              const user = AV.User.current();
              user.set('avatarUrl', saved.url());
              await user.save();

              // 本地也更新
              this.setData({ 'profile.avatarUrl': saved.url() });
              wx.hideLoading();
              wx.showToast({ title: '已更新头像', icon: 'success' });
            } catch (e) {
              console.error(e);
              wx.hideLoading();
              wx.showToast({ title: '上传失败', icon: 'none' });
            }
          },
          fail() {}
        });
      }
    });
  },

  // 跳转到三个编辑页（示例路径）
  goEditBasic() {
    wx.navigateTo({ url: '/pages/edit-basic/index' });
  },
  goEditMedical() {
    wx.navigateTo({ url: '/pages/edit-medical/index' });
  },
  goEditDiet() {
    wx.navigateTo({ url: '/pages/edit-diet/index' });
  }
});