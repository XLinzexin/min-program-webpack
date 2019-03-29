const { ajax } = getApp();
Component({
	options: {
		multipleSlots: true,
	},
	properties: {},
	data: {
		loaders: [],
		tabList: [],
		tabIndex: 0,
		configEnd: false,
		fliterData: null,

		tabWidth: 0,
	},
	methods: {
		getLoader: function () {
			return {
				url: '',
				method: 'get',
				pageNumber: 0,
				pageSize: 8,
				params: {},
				loading: false,
				loadError: false,
				allLoaded: false,
				isEmpty: false,
			};
		},
		setRequestConfig: function (requestConfig) {
			const { tabList, tabIndex = 0, fliterData } = requestConfig;
			this.setData({
				tabList,
				tabIndex: Number(tabIndex),
			});
			// 初始化每个列表的loader参数
			const loaderOrigin = Object.assign(
				this.getLoader(),
				requestConfig.params,
			);
			loaderOrigin.url = requestConfig.url;
			loaderOrigin.method = requestConfig.method;
			for (let item of tabList) {
				const loader = JSON.parse(JSON.stringify(loaderOrigin));
				if (requestConfig.extendParams) {
					loader.params[requestConfig.extendParams] = item.id;
				}
				this.data.loaders.push(loader);
			}
			if (fliterData) {
				this.data.fliterData = fliterData;
			}
			this.setData({
				loaders: this.data.loaders,
				tabWidth: Number.parseInt(750 / requestConfig.tabList.length),
			});
			this.nextPage(tabIndex);
			setTimeout(() => {
				this.setData({
					configEnd: true,
				});
			}, 100);
		},
		// 改变swiper时改变list
		changeSwiper(e) {
			const index = e.detail.current;
			this.changeList(index);
		},
		// 改变tab时改变list
		changeTab(e) {
			const { index } = e.currentTarget.dataset;
			this.changeList(index);
		},
		// 改变列表
		changeList(index) {
			this.setData({
				tabIndex: index,
			});
			const loader = this.data.loaders[index];
			if (!loader.pageNumber && !loader.allLoaded) {
				this.nextPage(index);
			}
		},
		reachBottom(e) {
			const { index } = e.currentTarget.dataset;
			this.nextPage(index);
		},
		nextPage(index) {
			let loader = this.data.loaders[index];
			if (loader.loading && loader.pageNumber != 0) return 1;
			if (loader.url == '') return 2;
			if (loader.allLoaded) return 3;
			loader.pageNumber++;
			this.setData({
				[`loaders[${index}].loading`]: true,
			});
			this.getListData(index);
		},
		async getListData(index) {
			try {
				const loader = this.data.loaders[index];
				const { method, url, params, pageNumber, pageSize } = loader;
				params.pageNumber = pageNumber;
				params.pageSize = pageSize;
				const res = await ajax[method.toLowerCase()](url, params);
				if (!res.code) {
					if (this.data.fliterData) {
						res.filterData(this.data.fliterData);
					}
					const list = res.data || [];
					this.triggerEvent('render', { list, index: index });
					this.setData({
						[`loaders[${index}].loading`]: false,
						[`loaders[${index}].pageNumber`]: loader.pageNumber,
					});
					if (loader.pageNumber == 1 && list.length == 0) {
						this.setData({
							[`loaders[${index}].isEmpty`]: true,
						});
					}
					if (loader.pageSize > list.length) {
						this.setData({
							[`loaders[${index}].allLoaded`]: true,
						});
					}
				}
 else {
					throw res.msg;
				}
			}
 catch (err) {
				console.warn(err);
				this.setData({
					[`loaders[${index}].loading`]: false,
					[`loaders[${index}].loadError`]: true,
				});
			}
		},
		reload: function (e) {
			let index = e.currentTarget.dataset.index;
			this.data.loaders[index].pageNumber--;
			this.setData({
				[`loaders[${index}].loadError`]: false,
			});
			this.nextPage(index);
		},
	},
	attached() {},
});
