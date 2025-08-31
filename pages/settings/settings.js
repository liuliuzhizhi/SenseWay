// pages/settings/settings.js
Page({
  data: {
    theme: 'light', // 'light' or 'dark'
    cacheSize: '128MB',
    settings: {
      notify: true,
      darkMode: false
    }
  },

  onLoad() {
    // 这里可以从本地存储读取用户偏好
    try {
      const settings = wx.getStorageSync('user_settings') || null;
      const theme = wx.getStorageSync('theme') || null;
      const cache = wx.getStorageSync('cacheSize') || null;
      if (settings) {
        this.setData({ settings });
      }
      if (theme) {
        this.setData({ theme, ['settings.darkMode']: theme === 'dark' });
      }
      if (cache) {
        this.setData({ cacheSize: cache });
      }
    } catch (e) {
      console.warn('读取本地设置失败', e);
    }
  },

  /* 导航与交互事件 */
  onBack() {
    wx.navigateBack();
  },
  onMore() {
    wx.showActionSheet({
      itemList: ['帮助', '关于'],
      success(res) {
        if (res.tapIndex === 0) {
          wx.navigateTo({ url: '/pages/help/help' });
        } else {
          wx.navigateTo({ url: '/pages/about/about' });
        }
      }
    });
  },

  goAccountSecurity() {
    wx.navigateTo({ url: '/pages/accountSecurity/accountSecurity' });
  },
  goPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },
  goSync() {
    wx.navigateTo({ url: '/pages/sync/sync' });
  },
  goLanguage() {
    wx.navigateTo({ url: '/pages/language/language' });
  },
  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },
  goHelp() {
    wx.navigateTo({ url: '/pages/help/help' });
  },

  /* 通用开关 toggle（用于通知等）*/
  toggleItem(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    const newSettings = Object.assign({}, this.data.settings);
    newSettings[key] = !newSettings[key];
    this.setData({ settings: newSettings }, () => {
      try {
        wx.setStorageSync('user_settings', newSettings);
      } catch (err) { console.warn(err); }
    });
  },

  /* 深色模式专门处理：改变 theme 并存储 */
  toggleDarkMode() {
    const darkNow = !this.data.settings.darkMode;
    const theme = darkNow ? 'dark' : 'light';
    const newSettings = Object.assign({}, this.data.settings, { darkMode: darkNow });
    this.setData({
      settings: newSettings,
      theme
    }, () => {
      try {
        wx.setStorageSync('user_settings', newSettings);
        wx.setStorageSync('theme', theme);
      } catch (err) { console.warn(err); }
    });
  },

  /* 清除缓存（模拟）*/
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除缓存吗？',
      success: (res) => {
        if (res.confirm) {
          // 这里放置真正清理缓存的逻辑（如清除本地文件、大小统计等）
          this.setData({ cacheSize: '0B' });
          try {
            wx.setStorageSync('cacheSize', '0B');
          } catch (err) { console.warn(err); }
          wx.showToast({ title: '已清除', icon: 'success', duration: 1500 });
        }
      }
    });
  },

  /* 退出登录 */
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '是否确定退出当前账号？',
      success: (res) => {
        if (res.confirm) {
          // 清空用户相关本地存储（按需调整）
          try {
            wx.removeStorageSync('user_info');
          } catch (e) {}
          // 跳转到登录页面（按你项目实际页面调整）
          wx.redirectTo({ url: '/pages/login/login' });
        }
      }
    });
  }
});