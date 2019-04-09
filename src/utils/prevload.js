import { parseQueryString } from '@/utils/util';
// 重写所有路由跳转的方法
const navigatesBackup = ['navigateTo', 'reLaunch', 'redirectTo', 'switchTab'];
for (let item of navigatesBackup) {
	const navigate = wx[item];
	delete wx[item];
	wx[item] = function (obj) {
		const { url } = obj;
		navigateRoute(url);
		navigate(obj);
	};
}
function navigateRoute(url) {
	const rootPath = url.split('?')[0];
	const path = rootPath.substring(1, rootPath.length);
	const query = parseQueryString(url);
	checkRoute({ path, query });
}
// 获取用户进入的第一个页面
const firstPage = {};
const AppBackup = App;
// 让onlaunch记录第一个页面
App = function (obj) {
	const onLaunch = obj.onLaunch;
	obj.onLaunch = function (data) {
		firstPage.path = data.path;
		firstPage.query = data.query;
		onLaunch.call(this, data);
	};
	AppBackup(obj);
};
// 讲所有加载的页面保存到一个对象中，添加prevload方法
const PagesMap = {};
const PageBackup = Page;
Page = function (obj) {
	if (obj.prevLoad && obj.route) {
		PagesMap[obj.route] = obj;
		if (firstPage.path === obj.route) {
			checkRoute(firstPage);
		}
		let prevLoadData = null;
		let prevLoadRecieve = null;
		let prevLoaded = false;
		obj.emitData = function (data) {
			prevLoadData = data;
			if (prevLoadRecieve && !prevLoaded) {
				prevLoadRecieve(prevLoadData);
				prevLoaded = true;
			}
		};
		obj.recieveData = function (recieve) {
			prevLoadRecieve = recieve;
			if (prevLoadData && !prevLoaded) {
				prevLoadRecieve(prevLoadData);
				prevLoaded = true;
			}
		};
		const onUnload = obj.onUnload;
		obj.onUnload = function () {
			prevLoadData = null;
			prevLoadRecieve = null;
			if (typeof onUnload === 'function') {
				onUnload.call(this);
			}
		};
	}
	PageBackup(obj);
};
// 匹配路由
function checkRoute(data) {
	let { path, query } = data;
	if (PagesMap[path] && typeof PagesMap[path].prevLoad === 'function') {
		let q = decodeURIComponent(query.q);
		if (q && q.indexOf('?') >= 0) {
			const obj = parseQueryString(decodeURIComponent(q));
			query = Object.assign(query, obj);
		}
		PagesMap[path].prevLoad(query);
	}
}
