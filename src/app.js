import '@/utils/extend';
import '@/utils/prevload';
import ajax from '@/utils/ajax';
import { globalAction, payAction } from '@/utils/app_action';
import { version } from '@/utils/constant';

App({
	onLaunch(options) {
		// wx.hideTabBar();
		console.log(`该小程序的版本号是${version}`);
		this.options = options;
		this.clearOldSession();
		globalAction.timeoutFuncQueue(() => {
			// 延迟更新用户信息
			globalAction.updateUserInfo();
		});
		// globalAction.hideTabBar();
	},
	onShow() {
		if (wx.getUpdateManager) {
			const updateManager = wx.getUpdateManager();
			updateManager.onCheckForUpdate(function (res) {
				if (res.hasUpdate) {
					console.log('有新版本可以更新');
				}
			});
			updateManager.onUpdateReady(function () {
				wx.showModal({
					title: '更新提示',
					content: '新版本已经准备好，是否重启应用？',
					success: function (res) {
						if (res.confirm) {
							updateManager.applyUpdate();
						}
					},
				});
			});
		}
	},
	// 新版本上线，清除旧版本的session
	clearOldSession() {
		const nowVersion = wx.getStorageSync('version');
		if (version !== nowVersion) {
			wx.clearStorageSync();
			wx.setStorageSync('version', version);
		}
	},
	globalData: {},
	ajax,
	payAction,
	globalAction,
});
