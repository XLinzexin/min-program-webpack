import { UN_LOGIN, Host, TOKEN } from '@/utils/constant';
// 未登录等待池
const pendingLoginPool = [];
// 重复登录次数，防止登录接口出现死循环；
const maxLoginTimes = 3;
// 登录次数
let loginTimes = 0;
// 等待请求池
const pendingRequestPool = [];
// 正在进行请求数
let requestNum = 0;
// 最大并发请求数
const maxRequest = 10;
// 唯一请求池，防止接口被重复触发
const uniqueRequestPool = {};
function base(
	url,
	data,
	method = 'get',
	header = { 'Content-Type': 'application/json' },
	unique = false, // 是否是不能重复请求的
) {
	return new Promise((resolve, reject) => {
		// 判断该请求是否是唯一的
		let uniqueRequestKey;
		if (unique) {
			uniqueRequestKey = `${url}+${JSON.stringify(data)}+${method}`;
			if (uniqueRequestPool[uniqueRequestKey]) {
				resolve({
					code: -1,
					msg: '操作过于频繁',
				});
				return;
			}
			else {
				uniqueRequestPool[uniqueRequestKey] = true;
			}
		}
		// 写一个闭包，将请求的逻辑缓存下来
		let fn = function () {
			if (requestNum < maxRequest) {
				requestNum++; // 请求+1
				wx.request({
					url: url,
					data: data,
					header: header,
					method: method,
					success: (reponse) => {
						const res = reponse.data;
						resolve(new ResObject(res));
					},
					fail(e) {
						reject(e);
					},
					complete() {
						requestNum--; // 请求完成，请求数-1；
						if (unique) {
							// 当请求是唯一的，请求完成后过4秒后才可再请求，防止重复触发
							setTimeout(() => {
								delete uniqueRequestPool[uniqueRequestKey];
							}, 4000);
						}
						const canRequestNum = maxRequest - requestNum; // 获取当前可请求数
						if (pendingRequestPool.length > 0 && canRequestNum) {
							// 当等待请求的缓存池中有成员等待时，且有可请求的位置时
							const requestAgainPool = pendingRequestPool.splice(
								0,
								canRequestNum,
							);
							requestAgainPool.forEach((fn) => {
								fn();
							});
						}
					},
				});
			}
			else {
				// 请求数满了，等待中
				pendingRequestPool.push(fn);
			}
		};
		fn();
	});
}
// 处理所有接口的登录逻辑
function ownerRequest(url, data, method, header, unique) {
	return new Promise((resolve, reject) => {
		// 写一个闭包，将请求的逻辑缓存下来
		let fn = function (resolve2) {
			// 在请求头上保存登录的token和其他信息
			const token = wx.getStorageSync(TOKEN);
			if (token) {
				header[TOKEN] = token;
			}
			base(Host + url, data, method, header, unique).then(
				(res) => {
					if (res.code == UN_LOGIN) {
						if (pendingLoginPool.length == 0) {
							// 只有未请求登录的时候才进行登录，避免多个请求未登录时，都触发登录
							login();
						}
						// 未登录，把请求丢进等待登录的缓存池中
						pendingLoginPool.push({ fn, resolve });
					}
					else {
						resolve(res);
						if (typeof resolve2 === 'function') {
							resolve2(res);
						}
					}
				},
				(err) => {
					reject(err);
				},
			).catch((err) => {
				console.error(err);
			});
		};
		fn();
	});
}
function get(url, data, unique) {
	return ownerRequest(
		url,
		data,
		'GET',
		{ 'Content-Type': 'application/json' },
		unique,
	);
}
function post(url, data, unique) {
	return ownerRequest(
		url,
		data,
		'POST',
		{
			'Content-Type': 'application/json',
		},
		unique,
	);
}
function put(url, data, unique) {
	return ownerRequest(
		url,
		data,
		'PUT',
		{
			'Content-Type': 'application/json',
		},
		unique,
	);
}
function deleteAjax(url, data, unique) {
	return ownerRequest(
		url,
		data,
		'DELETE',
		{
			'Content-Type': 'application/json',
		},
		unique,
	);
}
function upload(filePath) {
	return new Promise((resolve, reject) => {
		wx.uploadFile({
			url: `${Host}/v1/file/voice`, // 此处换上你的接口地址
			filePath,
			name: 'file',
			header: {
				'Content-Type': 'application/json',
				[TOKEN]: wx.getStorageSync(TOKEN),
			},
			success: (response) => {
				resolve(JSON.parse(response.data));
			},
			fail: (err) => {
				reject(err);
			},
		});
	});
}
function login() {
	// 防止接口报错，一直返回未登录的情况；若超出这个则停止登录，100秒后恢复正常
	if (loginTimes >= maxLoginTimes) {
		setTimeout(() => {
			loginTimes = 0;
		}, 100000);
		return;
	}
	loginTimes++;

	// 获取token前先移除token，防止后端同时有两个token（后端代码实现的问题）
	try {
		wx.removeStorageSync(TOKEN);
	}
	catch (e) {
		console.log('removeStorageSync fail: ' + e);
	}
	wx.login({
		success: async function (e) {
			// 获取登录接口
			const res = await get(`/login/${e.code}`, {}, true);
			if (!res.code && res.data) {
				wx.setStorageSync(TOKEN, res.data.token);
				// 遍历执行等待登录池中的成员，并清空
				pendingLoginPool.forEach((item) => {
					item.fn(item.resolve);
				});
				pendingLoginPool.splice(0, 999);
				return true;
			}
			else {
				return false;
			}
		},
	});
}
// 把返回的数据使用的类，可以对数据进行过滤等
class ResObject {
	constructor(res) {
		this.code = res.code;
		this.data = res.data;
		this.msg = res.msg;
	}
	filterData(filterFunc) {
		try {
			const { code, data, msg } = this;
			const newRes = filterFunc({ code, data, msg });
			this.code = newRes.code;
			this.data = newRes.data;
			this.msg = newRes.msg;
		}
		catch (err) {
			console.log(err);
		}
	}
}
export default {
	base,
	get,
	post,
	put,
	delete: deleteAjax,
	upload,
};
