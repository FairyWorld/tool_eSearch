# 超级录屏

通过记录鼠标的坐标和点击，自动运镜。

核心是视频裁切。使用 FFmpeg 是自然的选择，wasm 太慢，普通录屏的裁剪是通过命令控制 FFmpeg 二进制来实现的。

观察 Electron（Chrome）的运行目录，我们可以发现有一个`ffmpeg.dll`或`libffmpeg.so`库，用于浏览器的媒体解码和渲染。浏览器有的，我们就不需要额外引入 FFmpeg 了，现在有一个新的 web api：[WebCodecs](https://developer.mozilla.org/zh-CN/docs/Web/API/WebCodecs_API)，可以调用浏览器的媒体解码编码能力。

在这之前，我先说明媒体编码的重要性，如果我们用连续截屏的方式代替录屏，虽然 ImageData 可以很方便地进行图片截取，但内存会被迅速占用：

> 单帧全彩色高清（1920x1080）视频（每像素 4 字节）为 8,294,400 字节。
>
> 在典型的每秒 30 帧的情况下，每秒高清视频将占用 248,832,000 字节（~249 MB）。
>
> 一分钟的高清视频需要 14.93 GB 的存储空间。

视频编码其实就是一个压缩过程，把相同像素合并，还有其他高级的压缩操作。这样，我们借助视频编码压缩存储帧，编辑时解码成 ctx，编辑后再次编码压缩，导出时也使用了编码。