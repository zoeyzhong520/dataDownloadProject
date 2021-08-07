<template>
	<view class="content">
		<button @click="onClick">{{ isDownload ? '打开文件' : '点击下载' }}</button>
		<text style="width: 750rpx;text-align: center;margin-top: 20rpx;">{{ sizeText }}</text>
	</view>
</template>

<script>
	import {
		getStorage,
		setStorage,
		cachedFileKey
	} from './index.js'
	
	export default {
		data() {
			return {
				// 文件总大小
				totalSizeStr: '',
				// 是否已下载
				isDownload: false,
				// 图片地址
				imagePath: 'https://images.pexels.com/photos/2070033/pexels-photo-2070033.jpeg',
				// 本地文件列表
				fileList: [],
			}
		},
		
		onLoad() {
			this.getSavedFileList()
		},
		
		computed: {
			// 文件大小文本
			sizeText() {
				return '本地文件总大小：' + (this.totalSizeStr.length === 0 ? '0M' : this.totalSizeStr + 'M')
			},
		},
		
		methods: {
			// 获取本地文件列表
			getSavedFileList() {
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
			},
			
			// onClick
			onClick() {
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
			},
			
			// downloadFile
			downloadFile() {
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
			},
		}
	}
</script>

<style>
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	
</style>
