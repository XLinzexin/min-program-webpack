const { ajax } = getApp();
Page({
	data: {
		details: {
			topicTheme: [1],
			historyOrder: [],
			classificationList: [],
			weekSale: []
		}
	},
	onLoad() {
		this.getWxDecoration();
	},
	onAppInit(appConfig) {
		const { storeName } = appConfig;
		wx.setNavigationBarTitle({ title: storeName });
	},
	//获取小程序装修接口数据
	async getWxDecoration() {
		const res = await ajax.get("/v1/wxDecoration");
		if (!res.code) {
			this.setData({
				details: res.data
			});
		}
	},
	async toUser() {
		wx.navigateTo({
			url: "/pages/main/user/index"
		});
	}
});
