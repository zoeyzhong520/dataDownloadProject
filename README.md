
# 小程序如何解决文件缓存问题？ 
## 项目场景：
近期Joe大叔因工作需求，小程序需要实现打开图片文件和PDF功能。当然，被打开的文件是需要增加缓存策略的，要不然每次打开一个6M的PDF文件都去服务端下载然后再打开，会严重影响到小程序迅速响应的用户体验。

我的CSDN：https://blog.csdn.net/baidu_35383008/article/details/119427988?spm=1001.2014.3001.5501
## 问题描述：
那么在实现上述功能时，Joe大叔遇到了一个略显糟心的问题：小程序调用API下载并存储文件到本地后，无法根据本地文件列表确定当前文件是否已下载。 
```
uni.getSavedFileList({
     success(res) {
      console.log('获取本地文件列表:\n',res)
   }
})
// 获取到的数据如下
// {createTime: 1628172373, filePath: "http://store/dleIyVcYMhBP1ec1df7ee3ab6c552f8bd4deff1d1264.jpeg", size: 288419}
```
## 原因分析：
现在本地文件列表也拿到了，为什么还不能得知当前文件是否已下载过呢？通过查看数据可以得知，保存好的每一个文件都被封装成了一个字典对象。其中 filePath 表示文件的本地路径，createTime 表示文件保存时的时间戳，size 表示文件的大小。首先把时间戳、文件大小排除，就只剩下文件路径。 但是，这个路径是有种编码格式的，也即它是随机的。下载同一个文件，所生成的本地路径都是不同的。那么，我们该如何解决这个问题呢？
## 解决方案：
Joe大叔在这里先行献丑了，解决方案分两步：

1、每当文件下载、保存成功后，以文件名为 key，保存文件的路径为 value，包装成字典对象并 push 到一个文件列表数组中。再使用 uni.setStorage 把文件列表数组缓存至本地。
```
                // 没有保存过文件，就开启下载任务
				uni.showLoading({
					title:'正在下载...',
					mask:true
				})
				
				var that = this;
				uni.downloadFile({
					url:this.imagePath,
					success(res) {
						if (res.statusCode === 200) {
							var tempFilePath = res.tempFilePath;
							
							uni.saveFile({
								tempFilePath:tempFilePath,
								success(res) {
									console.log('文件保存成功')
									
									var savedFilePath = res.savedFilePath;
									// 获取本地文件的文件信息
									uni.getSavedFileInfo({
										filePath:savedFilePath,
										success(res) {
											that.totalSizeStr = parseInt(res.size / 1024 / 1024) + ''
										}
									})
									
									getStorage(cachedFileKey).then((cachedArray) => {
										
										// 以文件名为key，文件保存的路径为value，组装成一个字典对象保存到数组，再把数组写入本地
										// 创建一个用于承载字典对象的数组
										var saveFileArray = [];
										// 先判断本地有无缓存的文件名、文件路径数组
										if (!!cachedArray && cachedArray.length > 0) {
											// 若存在则赋值给saveFileArray
											saveFileArray = cachedArray
										} 
										// 把字典装入数组中
										saveFileArray.push({
											fileKey: that.imagePath,
											filePath: savedFilePath
										})
										// 再把数组写入本地
										setStorage(cachedFileKey,saveFileArray).then(() => {
											that.isDownload = true;
											// 直接打开文件
											uni.previewImage({
												urls:[savedFilePath]
											})
											
											// 更新本地文件列表 fileList
											uni.getSavedFileList({
												success(res) {
													that.fileList = res.fileList
												}
											})
											
										})
										
									})
									
								}
							})
						}
					},
					fail(err) {
						uni.showToast({
							title:JSON.stringify(err),
							icon:'none',
							duration:1000 * 5
						})
					},
					complete() {
						uni.hideLoading()
					}
				})
```
当再次打开同一个文件地址时，首先使用 uni.getStorage 获取缓存的文件列表数组，再判断数组中是否已包含与当前文件名一致的 key 值。这就可以解决下载的文件无法标记的问题。
```
                // 先判断 fileList 是否为空，为空直接开启文件下载
				if (this.fileList.length === 0) {
					// 开启文件下载
					this.downloadFile()
					return;
				}
				
				// 再判断是否文件已经下载过
				getStorage(cachedFileKey).then((cachedArray) => {
					
					// 同样要判断 cachedArray 是否存在
					if (!!cachedArray && cachedArray.length > 0) {
						// 若存在则进行文件名与 fileKey 的比对
						var fileKeyArray = [];
						var fileKeyFilePathArray = [];
						var resultArray = [];
						cachedArray.map((item) => {
							fileKeyArray.push(item.fileKey)
							fileKeyFilePathArray.push(item)
						})
						
						// 这里使用 filter 函数是一个筛选小技巧，可以直接遍历得到需要的数据
						resultArray = fileKeyFilePathArray.filter((item) => {
							if (item.fileKey === this.imagePath) {
								return true
							} else {
								return false
							}
						})
						
						// 使用数组的 indexOf 方法来比对当前文件名
						if (fileKeyArray.indexOf(this.imagePath) > -1) {
							// > -1 表示比对成功，文件已下载，直接打开
							// 这里需要注意一下：如果是要打开图片，就使用 uni.previewImage
							// 如果要打开doc, xls, ppt, pdf, docx, xlsx, pptx，就使用 uni.openDocument
							// 因为我在这里使用的是jpg图片，所以就使用 uni.previewImage
							
							uni.showModal({
								title:'检测到您已下载过此文件，是否直接打开？',
								success(res) {
									if (res.confirm) {
										uni.previewImage({
											urls:[resultArray[0].filePath],
											fail(err) {
												console.log(err)
											}
										})
									}
								}
							})
							
						} else {
							// 比对不成功，则直接开启文件下载
							this.downloadFile()
						}
					}
				})
```
2、经过Joe大叔实测，小程序文件下载是有上限的，大概100M，本地文件总大小达到或超过这个数之后，就无法下载成功，大家可以亲自试验下。

      所以，我们还需要做一个文件缓存策略，怎么做呢？很简单，前面我们已经可以获取到本地缓存文件的大小了，只要遍历出来再进行累加，就能得出总大小。这里要注意一下的是，默认大小是以字节为单位的，所以转换为M的话是需要再除以 1024 * 1024 的。
```
                var that = this;
				uni.getSavedFileList({
					success(res) {
						
						var fileList = res.fileList;
						that.fileList = res.fileList;
						
						// 判断 fileList 不为空，计算一下文件总大小，如果超限需要删除部分文件以挪出空间
						if (fileList.length === 0) {
							return;
						}
						
						var totalSize = 0;
						// 设置文件缓存限额为50M
						var sizeLimit = 50 * 1024 * 1024;
						fileList.map((item) => {
							totalSize += item.size
						})
						that.totalSizeStr = parseInt(totalSize / 1024 / 1024) + ''
						
						// 判断总大小是否超限
						if (totalSize >= sizeLimit) {
							// 执行文件删除操作，具体删除几个文件可以自己调整
							uni.removeSavedFile({
								filePath:fileList[0].filePath,
								success() {}
							})
						}
						
					}
				})
```
 Joe大叔对文件总大小设置了50M的限额，当然，大家可以根据实际项目需要进行调整。当总大小超过50M时，需要执行 uni.removeSavedFile 来删除本地保存的文件，以挪出空间。

至此，我们就解决了小程序文件缓存问题，最后再献上对 uni.getStorage、uni.setStorage 的 Promise 封装吧。
```
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
```
