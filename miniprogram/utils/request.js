// 统一请求封装（微信小程序）
// - 自动拼接 baseUrl（来自 app.globalData.baseUrl）
// - 自动附带 Authorization: Bearer <token>
// - 401 时静默重新登录并重试一次

const envConfig = require('../config/env.js');

function getAppInstance() {
	try {
		return getApp();
	} catch (e) {
		return null;
	}
}

function getToken() {
	try {
		const app = getAppInstance();
		if (app && app.globalData && app.globalData.token) return app.globalData.token;
		return wx.getStorageSync('token') || '';
	} catch (e) {
		return '';
	}
}

function setToken(token) {
	try {
		const app = getAppInstance();
		if (app && app.globalData) app.globalData.token = token || null;
		if (!token) {
			wx.removeStorageSync('token');
		} else {
			wx.setStorageSync('token', token);
		}
	} catch (e) {}
}

function joinUrl(url) {
	if (!url) return url;
	if (/^https?:\/\//i.test(url)) return url;
	const app = getAppInstance();
	const baseUrl = (app && app.globalData && app.globalData.baseUrl) ? app.globalData.baseUrl : '';
	return baseUrl ? `${baseUrl}${url}` : url;
}

async function ensureLoginIfNeeded(requireAuth) {
	// 开发/体验模式跳过真实登录
	if (envConfig.isDev || envConfig.isTrial) return true;
	if (!requireAuth) return true;

	let token = getToken();
	if (token) return true;

	const app = getAppInstance();
	if (!app || typeof app.login !== 'function') return false;

	try {
		const res = await app.login();
		// app.login 内部会落 token
		token = getToken();
		return !!token || (res && res.success);
	} catch (e) {
		return false;
	}
}

function coreRequest(options, internal) {
	return new Promise(async (resolve, reject) => {
		const {
			url,
			method = 'GET',
			data = {},
			header = {},
			requireAuth = false,
			timeout = 15000,
		} = options || {};

		const ok = await ensureLoginIfNeeded(requireAuth);
		if (!ok && requireAuth) {
			return reject({ message: '未登录或登录失败' });
		}

		const finalUrl = joinUrl(url);
		const token = getToken();
		const finalHeader = Object.assign({ 'Content-Type': 'application/json' }, header);
		if (token) finalHeader['Authorization'] = `Bearer ${token}`;

		wx.request({
			url: finalUrl,
			method,
			data,
			header: finalHeader,
			timeout,
			success: async (res) => {
				const { statusCode, data: body } = res;
				if (statusCode === 403) {
					wx.showToast({ title: (body && body.message) ? body.message : '无权限访问', icon: 'none' });
					return reject(body || res);
				}
				if (statusCode === 401) {
					// 未授权：尝试静默重新登录并重试一次
					if (internal && internal._retried) {
						return reject(body || res);
					}
					try {
						const app = getAppInstance();
						if (app && typeof app.login === 'function') {
							await app.login();
							// 使用新 token 重试一次
							const retryRes = await coreRequest(options, { _retried: true });
							return resolve(retryRes);
						}
					} catch (e) {
						// fallthrough to reject
					}
					return reject(body || res);
				}

				if (statusCode >= 400) {
					return reject(body || res);
				}

				resolve(body);
			},
			fail: (err) => reject(err),
		});
	});
}

function request(options) {
	return coreRequest(options, { _retried: false });
}

function get(url, params = {}, extra = {}) {
	return request(Object.assign({ url, method: 'GET', data: params }, extra));
}

function post(url, data = {}, extra = {}) {
	return request(Object.assign({ url, method: 'POST', data }, extra));
}

module.exports = {
	request,
	get,
	post,
};


