# kml-geojson (kgUtil)

 kml或kmz格式 与  GeoJSON格式 互相转换工具类(kgUtil)


## 运行命令
 
### 首次运行前安装依赖
 `npm install` 或 `cnpm install`
  
### 打包编译项目
 运行`npm run build`来构建项目。 


## 使用示例

### 安装及引入
安装包
```hash
npm install kml-geojson -save 
```

引入包
```js
import * as kgUtil from './conver/geoJSONToKml' 
//或者
//import {toGeoJSON,tokml} from './conver/geoJSONToKml'
```
 
### KML转GeoJSON示例：
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

### GeoJSON转KML示例

```js 
var kml = kgUtil.tokml(geojsonObject, {
  name: 'Mars3D标绘数据',
  documentName: 'Mars3D标绘数据文件',
  documentDescription: '标绘数据 by mars3d.cn',
  simplestyle: true,
}) 
```
