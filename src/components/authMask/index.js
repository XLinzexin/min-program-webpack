import { DELIVERY_ADDRESS_LIST } from '@/utils/constant';

const { ajax, globalAction } = getApp();
Component({
	properties: {
		scope: {
			type: String,
			value: '',
		},
		isAsync: {
			type: Boolean,
			value: false,
		},
	},
	data: {
		hasAuth: false,
		getAuth: false,
	},
	attached() {
		if (this.properties.scope === 'userInfo') {
			this.setData({
				userInfo: true,
			});
		}
		this.refreshScope();
	},

	methods: {
		opensetting(res) {
			let { detail } = res;
			if (detail.authSetting[`scope.${this.properties.scope}`]) {
				this.toGetScope();
			}
		},
		// 获取用户信息
		async getUserInfo(authEvent) {
			if (authEvent.detail.errMsg === 'getUserInfo:ok') {
				const { isAsync } = this.data;
				if (!isAsync) {
					await globalAction.updateUserInfo();
				}
 else {
					globalAction.updateUserInfo();
				}
				this.refreshScope();
				this.runCallBack();
			}
 else {
				console.log('授权失败');
				this.refreshScope();
			}
		},
		toGetScope() {
			switch (this.properties.scope) {
				case 'address':
					// 获取地址权限
					wx.chooseAddress({
						success: async (info) => {
							try {
								let deliveryAddress =
									wx.getStorageSync(DELIVERY_ADDRESS_LIST) || {};
								let inStorage = false;
								for (let k in deliveryAddress) {
									let item = deliveryAddress[k];
									if (JSON.stringify(item) === JSON.stringify(info)) {
										info.addressId = Number(k);
										this.runCallBack(info);
										inStorage = true;
										break;
									}
								}
								if (!inStorage) {
									const res = await ajax.post('/v1/address/create', {
										provinceName: info.provinceName,
										cityName: info.cityName,
										countyName: info.countyName,
										detailInfo: info.detailInfo,
										customerName: info.userName,
										customerPhone: info.telNumber,
									});
									if (res.code) 'createAddress fail';
									const addressId = res.data;
									deliveryAddress[addressId] = info;
									wx.setStorageSync(
										DELIVERY_ADDRESS_LIST,
										Object.assign({}, deliveryAddress),
									);
									info.addressId = Number(addressId);
									this.runCallBack(info);
								}
							}
 catch (err) {
								console.warn(err);
							}
						},
						fail: (res) => {
							console.log('取消选择地址');
						},
						complete: (res) => {
							this.refreshScope();
						},
					});
					break;
				case 'invoiceTitle':
					wx.chooseInvoiceTitle({
						success: (res) => {
							this.runCallBack(res);
						},
						fail: (res) => {
							console.log('取消选择发票');
						},
						complete: (res) => {
							this.refreshScope();
						},
					});
					break;
			}
		},
		// 刷新当前权限获取状态
		refreshScope() {
			wx.getSetting({
				success: (res) => {
					let scope = res.authSetting[`scope.${this.properties.scope}`];
					let { hasAuth, getAuth } = this.data;
					if (typeof scope !== 'undefined') {
						hasAuth = true;
						getAuth = scope;
					}
					this.setData({ hasAuth, getAuth });
				},
			});
		},
		runCallBack(res) {
			this.triggerEvent('callback', res);
		},
	},
});
