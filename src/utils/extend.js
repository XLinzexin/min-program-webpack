/*
 * 该文件是对小程序的功能进行一些拓展:
 * 1.添加前端错误日志统计(重写console.error方法,当该方法被调用时,请求接口,发送报错信息)
 * 2.使用装饰者模式,修改调用Page方法和Component方法传入的参数,达到全局修改的目的
 */
import { parseQueryString } from '@/utils/util';

// 把需要添加的对象与原对象混合起来,放在原本执行的函数前面
function mixinBefore(obj, name, extend) {
	if (obj[name]) {
		var selectObj = obj[name];
		obj[name] = function (options) {
			extend.call(this, options, name);
			selectObj.call(this, options);
		};
	}
	else {
		obj[name] = function (options) {
			extend.call(this, options, name);
		};
	}
}
// 把需要添加的对象与原对象混合起来,放在原本执行的函数后面
function mixinAfter(obj, name, extend) {
	if (obj[name]) {
		var selectObj = obj[name];
		obj[name] = function (options) {
			selectObj.call(this, options);
			extend.call(this, options, name);
		};
	}
	else {
		obj[name] = function (options) {
			extend.call(this, options, name);
		};
	}
}
// 把需要添加的对象与原对象混合起来,作为参数使用
function mixinContain(obj, name, container) {
	if (obj[name]) {
		var selectObj = obj[name];
		obj[name] = function (options) {
			return container.call(this, selectObj.call(this, options));
		};
	}
	else {
		obj[name] = function (options) {
			container.call(this, options, name);
		};
	}
}
const PageBackup = Page; // 把原Page函数保存下来
const PageOnShareAppMessage = function (shareObejct) {
	return shareObejct;
};
	// 使所有Page的onload方法拿到的options都是处理过的,不需要判断是否是映射二维码,如果是映射二维码需要把options的q属性值通过decode拿到具体参数
const PageOnLoad = function () {
	let q = decodeURIComponent(this.options.q);
	if (q && q.indexOf('?') >= 0) {
		const obj = parseQueryString(decodeURIComponent(q));
		this.options = Object.assign(this.options, obj);
	}
};
Page = function (params) {
	typeof params.onShareAppMessage !== 'undefined' &&
			mixinContain(params, 'onShareAppMessage', PageOnShareAppMessage);
	if (!params.onReachBottom) {
		params.onReachBottom = function () {};
	}
	mixinBefore(params, 'onLoad', PageOnLoad);
	PageBackup(params);
};

let ComponentBackup = Component;

// 修改后给所有Component对象添加了一个对引入组件页面的指针,在组件中,通过this.Page可访问到父页面
const ComponentAttached = function () {
	let pages = getCurrentPages();
	let curPage = pages[pages.length - 1];
	// 在组件中保持对父页面的指针
	this.Page = curPage;
};

Component = function (params) {
	mixinBefore(params, 'attached', ComponentAttached);
	ComponentBackup(params);
};
