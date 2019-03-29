// components/common/timedown/index.js
const { ajax } = getApp();
Component({
	options: {
		multipleSlots: true, // 在组件定义时的选项中启用多slot支持
	},
	properties: {
		nomarl: {
			type: Boolean,
			value: false,
		},
	},
	data: {
		url: '',
		pageNumber: 0,
		pageSize: 8,
		params: {},
		loading: false,
		loadError: false,
		allLoaded: false,
		isEmpty: false,
		method: 'get',

		fliterData: null,
	},
	methods: {
		setRequestConfig: function (requestConfig) {
			this.reset();
			const defaultConfig = {
				pageNumber: 0,
				pageSize: 8,
				loading: false,
				loadError: false,
				allLoaded: false,
				isEmpty: false,
				params: {},
				method: 'get',
			};
			requestConfig = Object.assign(defaultConfig, requestConfig);
			this.data.fliterData = requestConfig.fliterData;
			const params = requestConfig.params;
			if (params.pageSize) {
				requestConfig.pageSize = params.pageSize;
				delete params.pageSize;
			}
			this.setData(requestConfig);
			setTimeout(() => {
				this.nextPage();
			}, 1000);
		},
		nextPage: function () {
			if (this.data.loading && this.data.pageNumber != 0) return 1;
			if (this.data.url == '') return 2;
			if (this.data.allLoaded) return 3;
			this.data.pageNumber++;
			this.setData({
				loading: true,
			});
			this.getListData();
		},
		getListData: async function () {
			try {
				const res = await ajax[this.data.method](this.data.url, {
					...this.data.params,
					pageNumber: this.data.pageNumber,
					pageSize: this.data.pageSize,
				});
				if (!res.code) {
					if (this.data.fliterData) {
						res.filterData(this.data.fliterData);
					}
					let data = res.data;
					if (this.data.pageNumber == 1 && this.data.loading) {
						this.reset();
					}
					this.triggerEvent('render', {
						list: data,
						pageNumber: this.data.pageNumber,
					});
					this.setData({
						loading: false,
						pageNumber: this.data.pageNumber,
					});
					if (this.data.pageNumber == 1 && data.length == 0) {
						this.setData({
							isEmpty: true,
						});
					}
					if (parseInt(this.data.pageSize) > parseInt(data.length)) {
						this.setData({
							allLoaded: true,
						});
					}
				}
				else {
					throw res.msg;
				}
			}
			catch (err) {
				console.error(err, 123);
				this.setData({
					loading: false,
					loadError: true,
				});
			}
		},
		reload: function () {
			this.data.pageNumber--;
			this.setData({
				loadError: false,
			});
			this.nextPage();
		},
		reset: function () {
			this.Page.setData({
				list: [],
			});
		},
		empty: function () {
			this.setData({
				isEmpty: true,
			});
		},
	},
	created: function () {},
	attached: function () {
		let _this = this;
		let pages = getCurrentPages();
		let curPage = pages[pages.length - 1];
		if (curPage.onReachBottom) {
			var onReachBottom = curPage.onReachBottom;
			curPage.onReachBottom = function (options) {
				_this.nextPage();
				onReachBottom.call(this, options);
			};
		}
		else {
			curPage.onReachBottom = function (options) {
				_this.nextPage();
			};
		}
	},
});
