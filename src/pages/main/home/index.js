const { ajax } = getApp();
Page({
	data: {},
	async prevLoad() {
		const res = await ajax.get("/homeData");
		this.emitData(res.data);
	},
	onLoad() {
		this.receiveData(data => {
			console.log(data);
		});
	}
});
