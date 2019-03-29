export const formatMsgTime = function (timespan) {
	var dateTime = new Date(timespan);
	var year = dateTime.getFullYear();
	var month = dateTime.getMonth() + 1;
	var day = dateTime.getDate();
	var hour = dateTime.getHours();
	var minute = dateTime.getMinutes();
	// var second = dateTime.getSeconds();
	var now = new Date().getTime();

	var milliseconds = 0;
	var timeSpanStr;

	milliseconds = now - timespan;

	if (milliseconds <= 1000 * 60 * 1) {
		timeSpanStr = '刚刚';
	}
	else if (1000 * 60 * 1 < milliseconds && milliseconds <= 1000 * 60 * 60) {
		timeSpanStr = Math.round(milliseconds / (1000 * 60)) + '分钟前';
	}
	else if (
		1000 * 60 * 60 * 1 < milliseconds &&
		milliseconds <= 1000 * 60 * 60 * 24
	) {
		timeSpanStr = Math.round(milliseconds / (1000 * 60 * 60)) + '小时前';
	}
	else if (
		1000 * 60 * 60 * 24 < milliseconds &&
		milliseconds <= 1000 * 60 * 60 * 24 * 15
	) {
		timeSpanStr = Math.round(milliseconds / (1000 * 60 * 60 * 24)) + '天前';
	}
	else if (
		milliseconds > 1000 * 60 * 60 * 24 * 15 &&
		year === new Date(now).getFullYear()
	) {
		timeSpanStr = month + '-' + day + ' ' + hour + ':' + minute;
	}
	else {
		timeSpanStr = year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
	}
	return timeSpanStr;
};
export const parseQueryString = function (url) {
	var regUrl = /^[^\?]+\?([\w\W]+)$/;
	var regPara = /([^&=]+)=([\w\W]*?)(&|$)/g;
	var arrUrl = regUrl.exec(url);
	var ret = {};
	if (arrUrl && arrUrl[1]) {
		var strPara = arrUrl[1];
		var result;
		while ((result = regPara.exec(strPara)) != null) {
			ret[result[1]] = result[2];
		}
	}
	return ret;
};
export const compareVersion = function (localVersion, targetVersion) {
	const localVersionArr = localVersion.split('.');
	const targetVersionArr = targetVersion.split('.');
	const versionLength = 3;
	if (
		localVersionArr.length === targetVersionArr.length &&
		targetVersionArr.length === versionLength
	) {
		for (let i = 0; i < versionLength; i++) {
			const localDivision = Number(localVersionArr[i]);
			const targetDivision = Number(targetVersionArr[i]);
			if (localDivision > targetDivision) {
				return 1;
			}
			else if (localDivision < targetDivision) {
				return -1;
			}
			else if (i === versionLength - 1) {
				return 0;
			}
		}
	}
	else {
		console.warn('version is ilegal');
	}
};
