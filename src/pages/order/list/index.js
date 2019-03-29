const { payAction, deliveryAction } = getApp();
Page({
	data: {
		lists: [],
	},
	onLoad() {
		this.initOrderListLoader();
	},
	// 初始化列表loader
	initOrderListLoader() {
		const tabList = [
			{
				text: '全部',
				id: null,
			},
			{
				text: '待付款',
				id: 0,
			},
			{
				text: '待发货',
				id: 1,
			},
			{
				text: '配送中',
				id: 2,
			},
			{
				text: '已完成',
				id: 3,
			},
		];
		const lists = [];
		tabList.forEach(() => {
			lists.push([]);
		});
		this.setData({
			lists,
		});
		const { index = 0 } = this.options;
		this.selectComponent('#listsLoader').setRequestConfig({
			url: '/v1/orders',
			method: 'post',
			extendParams: 'status',
			tabList,
			tabIndex: index,
			fliterData: function (res) {
				if (!res.data) {
					res.data = [];
				}
				return res;
			},
		});
	},
	// 渲染列表
	renderList: function (e) {
		let list = e.detail.list;
		let index = e.detail.index;
		this.setData({
			[`lists[${index}]`]: this.data.lists[index].concat(list),
		});
	},
});
