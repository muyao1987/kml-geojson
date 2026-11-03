# kml-geojson (kgUtil)

kml或kmz格式 与  GeoJSON格式 互相转换工具类(kgUtil)

> 作者：火星科技 木遥(muyao1987)
> 仓库地址：https://github.com/muyao1987/kml-geojson
> 问题反馈：https://github.com/muyao1987/kml-geojson/issues

## 项目简介

kml-geojson 提供了 KML/KMZ 与 GeoJSON 两种常用 GIS 数据格式之间的互相转换能力：

- `toGeoJSON`：将 KML/KMZ 数据转换为 GeoJSON，支持 url、kml 文档字符串、XML 文档对象、Blob/File 等多种输入方式；
- `toKml`：将 GeoJSON 转换为 KML 字符串，支持 simplestyle 样式及 mars3d 标绘的 `properties.style` 样式映射。

## 安装及引入

### 安装包

```bash
npm install kml-geojson -save 
```

### 引入方式

```js
import * as kgUtil from 'kml-geojson' 
//或者按需引入
//import { toGeoJSON, toKml } from 'kml-geojson'
```

dist 目录下也提供了 umd 打包产物（`kml-geojson.js`），通过 script 标签引入后会暴露全局对象 `kgUtil`。

## API 说明

| 方法 | 参数 | 返回值 | 说明 |
| ---- | ---- | ---- | ---- |
| `toGeoJSON(doc, options)` | doc：KML/KMZ 数据源，支持以 `.kml`/`.kmz` 结尾的 url、kml 文档字符串、XML 文档对象、Blob/File（如 input 文件控件的文件）；options：请求 url 时的 fetch 配置（仅 url 方式有效） | `Promise<GeoJSON>` | KML/KMZ 转 GeoJSON |
| `toKml(geojson, options)` | geojson：GeoJSON 对象（FeatureCollection、Feature、Geometry）或 Feature 数组；options：转换参数，见下表 | `String`（KML字符串） | GeoJSON 转 KML |

### toKml 的 options 参数说明

| 参数 | 类型 | 默认值 | 说明 |
| ---- | ---- | ---- | ---- |
| name | String | `'name'` | 读取要素名称的属性名，作为 Placemark 的 name 输出 |
| description | String | `'description'` | 读取要素描述的属性名，作为 Placemark 的 description 输出 |
| documentName | String | 无 | 文档（Document）名称，不传时不输出 |
| documentDescription | String | 无 | 文档（Document）描述，不传时不输出 |
| simplestyle | Boolean | `false` | 是否按 simplestyle 规范（marker-*、stroke、fill 等）生成 KML 样式 |
| timestamp | String | `'timestamp'` | 读取时间戳的属性名，作为 Placemark 的 TimeStamp 输出 |

## KML转GeoJSON示例

```js
//直接加载url
kgUtil.toGeoJSON('//data.mars3d.cn/file/kml/NAVWARN.kmz').then((geojoson) => {
  console.log(geojoson) 
})

//加载input文件控件的二进制流
kgUtil.toGeoJSON(this.files[0]).then((geojoson) => {
  console.log(geojoson) 
})

//加载kml文档对象
$.ajax('//data.mars3d.cn/file/kml/dg8.kml').done(function (xml) {
  kgUtil.toGeoJSON(xml).then((geojoson) => {
    console.log(geojoson) 
  })
})
```

## GeoJSON转KML示例

```js 
var kml = kgUtil.toKml(geojsonObject, {
  name: 'Mars3D标绘数据',
  documentName: 'Mars3D标绘数据文件',
  documentDescription: '标绘数据 by mars3d.cn',
  simplestyle: true,
}) 
```

## 运行命令

### 首次运行前安装依赖

 `npm install` 或 `cnpm install`
  
### 打包编译项目

 运行`npm run build`来构建项目。 

## 目录结构

```
kml-geojson
├─ src                    # 源码
│  ├─ index.js            # 入口，导出 toGeoJSON、toKml 等对外 API
│  └─ conver
│     ├─ kmlToGeoJSON.js  # kml 转 geojson 转换实现
│     └─ geoJSONToKml.js  # geojson 转 kml 转换实现
├─ dist                   # 打包产物（umd）
├─ rollup.config.js       # 打包配置
├─ LICENSE                # 许可证文件
└─ package.json
```

## 许可证

[Apache-2.0](./LICENSE)
