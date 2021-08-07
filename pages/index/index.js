/*
这里说下为什么要把 uni.getStorage 和 uni.setStorage 使用 Promise 封装一下：

因为封装后用起来爽啊～	

uni.getStorage、uni.setStorage 直接使用不适合实际开发，一堆 success、fail 回调
*/ 

export const getStorage = function(key) {
	return new Promise((resolve, reject) => {
		
		uni.getStorage({
			key:key,
			success(res) {
				resolve(res.data)
			},
			fail() {
				resolve(null)
			}
		})
		
	})
}

export const setStorage = function(key, data) {
	return new Promise((resolve, reject) => {
		
		uni.setStorage({
			key:key,
			data:data,
			success() {
				resolve(true)
			},
			fail() {
				resolve(false)
			}
		})
		
	})
}

export const cachedFileKey = 'cachedFileKey'