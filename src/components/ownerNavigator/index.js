Component({
	properties: {
		openType: {
			type: String,
			value: 'navigate',
		},
		url: {
			type: String,
			value: '',
		},
	},
	data: {
		active: false,
		pending: false,
	},
	methods: {
		// 这里是一个自定义方法
		ownerNavigate: function () {
			const { openType, url } = this.properties;
			this.navigateType(openType, url);
		},
		navigateType: function (openType, url) {
			switch (openType) {
				case 'navigate':
					wx.navigateTo({
						url: url,
					});
					break;
				case 'redirect':
					wx.redirectTo({
						url: url,
					});
					break;
				case 'switchTab':
					wx.switchTab({
						url: url,
					});
					break;
				case 'reLaunch':
					wx.reLaunch({
						url: url,
					});
					break;
				case 'navigateBack':
					wx.navigateBack({
						url: url,
					});
					break;
				case 'none':
					break;
				default:
					wx.navigateTo({
						url: url,
					});
			}
		},
	},
});
