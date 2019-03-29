const { ajax } = getApp();
Page({
	data: {},
	async prevLoad() {
		const res = await ajax.get('/homeData');
		this.emitData(res.data);
	},
	onLoad() {
		this.recieveData((data) => {
			console.log(data);
		});
	},
});
