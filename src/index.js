/**
 * kml与geojson互转工具类(kgUtil)对外接口
 * kml/kmz转geojson使用 toGeoJSON，geojson转kml使用 toKml
 */
import JSZip from "jszip"
import { kmlToGeoJSON } from "./conver/kmlToGeoJSON"
import { geoJSONToKml } from "./conver/geoJSONToKml"

/**
 * GeoJSON 转 KML 字符串。
 * 支持 FeatureCollection、Feature、Geometry 对象及 Feature 数组输入；
 * 当 feature.properties.style 中存在样式时（mars3d 标绘风格），会优先映射为对应的样式属性后再转换。
 *
 * @param {Object|Array} geojson GeoJSON 对象（FeatureCollection、Feature 或 Geometry），或 Feature 对象数组
 * @param {Object} [options] 转换参数，具体配置见 {@link geoJSONToKml}
 * @param {String} [options.name="name"] 读取要素名称的属性名，作为 Placemark 的 name 输出
 * @param {String} [options.description="description"] 读取要素描述的属性名，作为 Placemark 的 description 输出
 * @param {String} [options.documentName] 文档（Document）名称，不传时不输出
 * @param {String} [options.documentDescription] 文档（Document）描述，不传时不输出
 * @param {Boolean} [options.simplestyle=false] 是否按 simplestyle 规范（marker-*、stroke、fill 等）生成 KML 样式
 * @param {String} [options.timestamp="timestamp"] 读取时间戳的属性名，作为 Placemark 的 TimeStamp 输出
 * @returns {String} 转换后的 KML 字符串
 *
 * @example
 * var kml = kgUtil.toKml(geojsonObject, {
 *   name: "Mars3D标绘数据",
 *   documentName: "Mars3D标绘数据文件",
 *   documentDescription: "标绘数据 by mars3d.cn",
 *   simplestyle: true
 * })
 */
export function toKml(geojson, options) {
  if (Array.isArray(geojson)) {
    geojson = { type: "FeatureCollection", features: geojson }
  }
  if (geojson.features) {
    geojson.features.forEach((feature) => {
      updateFeatureByStyle(feature)
    })
  } else {
    updateFeatureByStyle(geojson)
  }
  return geoJSONToKml(geojson, options)
}

/**
 * 按 feature.properties.style 将样式映射为 simplestyle 规范属性（image、color、outlineColor、html 等），
 * 并处理闭合线（closure）、polygon 首尾闭合、rectangle 转 Polygon 几何等特殊逻辑
 * @param {Object} feature GeoJSON Feature 对象（内部会直接修改其属性和几何）
 * @return {void}
 */
function updateFeatureByStyle(feature) {
  if (!feature.properties) {
    return
  }

  const style = feature.properties.style
  if (style) {
    if (style.image) {
      feature.properties["marker-symbol"] = style.image
      if (style.outlineColor) {
        feature.properties["marker-color"] = style.outlineColor
      }
      return
    }
    if (style.color) {
      feature.properties.fill = style.color
      if (style.opacity) {
        feature.properties["fill-opacity"] = style.opacity
      }
    }
    if (style.outlineColor) {
      feature.properties.stroke = style.outlineColor
      feature.properties["stroke-width"] = style.outlineWidth ?? 1
      feature.properties["stroke-opacity"] = style.outlineOpacity ?? style.opacity ?? 1.0
    }
    if (style.html) {
      style.html = HTMLEncode(style.html)
    }

    // 闭合线特殊处理
    if (style.closure && feature.geometry?.coordinates?.length > 0) {
      feature.geometry.coordinates.push(feature.geometry.coordinates[0])
    }
  }

  const type = feature?.properties?.type
  if (type === "polygon") {
    const arr = feature.geometry.coordinates[0]
    if (arr?.length > 2) {
      arr.push(arr[0])
    }
  } else if (type === "rectangle") {
    const coors = feature.geometry.coordinates
    if (coors?.length === 2) {
      const xmin = coors[0][0]
      if (isNumber(xmin)) {
        const xmax = coors[1][0]
        const ymin = coors[0][1]
        const ymax = coors[1][1]

        feature.geometry = {
          type: "Polygon",
          coordinates: [
            [
              [xmin, ymax],
              [xmin, ymin],
              [xmax, ymin],
              [xmax, ymax],
              [xmin, ymax]
            ]
          ]
        }
      }
    }
  }
}
function isNumber(obj) {
  return typeof obj === "number" && obj.constructor === Number
}

// 解析xml字符串为DOM文档对象
const getDom = (xml) => new DOMParser().parseFromString(xml, "application/xml")
// 获取文件名中的扩展名
const getExtension = (fileName) => fileName.split(".").pop()

// 解析kmz压缩包（Blob/File），返回包内首个kml的DOM文档对象的Promise
const getKmlDom = (kmzFile) => {
  const zip = new JSZip()
  return zip.loadAsync(kmzFile).then((zip) => {
    let kmlDom = null
    zip.forEach((relPath, file) => {
      if (getExtension(relPath) === "kml" && kmlDom === null) {
        kmlDom = file.async("string").then(getDom)
      }
    })
    return kmlDom
  })
}

/**
 * KML 或 KMZ 转 GeoJSON，按参数类型自动识别以下输入方式：
 * 1. 以 .kml 或 .kmz 结尾的 url 字符串：fetch 请求后解析（.kmz 会先解压取包内首个 kml）；
 * 2. 其他字符串：视为 KML XML 文档字符串直接解析；
 * 3. XML Document 对象（具有 getRootNode 方法）：直接解析；
 * 4. Blob 或 File 对象（如 input 文件控件选中的文件，.kmz 会先解压取包内首个 kml）：解析后转换。
 *
 * @param {String|Document|Blob|File} doc KML/KMZ 数据源，支持 url、XML 字符串、XML Document、Blob/File
 * @param {Object} [options] 请求 url 时的 fetch 配置（如 method、headers 等），仅 url 方式有效
 * @returns {Promise<Object>} 转换后的 GeoJSON FeatureCollection 对象；参数为空时打印警告并返回 undefined
 *
 * @example 直接加载url
 * kgUtil.toGeoJSON('//data.mars3d.cn/file/kml/NAVWARN.kmz').then((geojoson) => {
 *   console.log(geojoson)
 * })
 *
 * @example 加载input文件控件的二进制流
 * kgUtil.toGeoJSON(this.files[0]).then((geojoson) => {
 *   console.log(geojoson)
 * })
 *
 * @example 加载kml文档字符串（如ajax请求返回的xml文本）
 * kgUtil.toGeoJSON(kmlXmlString).then((geojoson) => {
 *   console.log(geojoson)
 * })
 */
export function toGeoJSON(doc, options) {
  if (!doc) {
    console.warn("toGeoJSON参数不能为空")
    return
  }

  if (isString(doc)) {
    const extension = getExtension(doc)
    if (extension === "kml") {
      return fetchXML(doc, options).then(function (kmlDom) {
        return kmlToGeoJSON(kmlDom)
      })
    } else if (extension === "kmz") {
      return fetchBlob(doc, options)
        .then(function (xml) {
          return getKmlDom(xml)
        })
        .then(function (kmlDom) {
          return kmlToGeoJSON(kmlDom)
        })
    } else {
      // 直接传kml字符串文档
      const geojson = kmlToGeoJSON(getDom(doc))
      return Promise.resolve(geojson)
    }
  } else if (doc.getRootNode) {
    // 直接传document文档
    const geojson = kmlToGeoJSON(doc)
    return Promise.resolve(geojson)
  } else {
    // 直接传blob
    return getKmlDom(doc).then(function (kmlDom) {
      return kmlToGeoJSON(kmlDom)
    })
  }
}

function isString(str) {
  return typeof str === "string" && str.constructor === String
}

function HTMLEncode(html) {
  const temp = document.createElement("div")
  temp.textContent != null ? (temp.textContent = html) : (temp.innerText = html)
  const output = temp.innerHTML
  return output
}

// fetch请求kml并解析为DOM文档对象
function fetchXML(url, options) {
  const requestOptions = {
    method: "GET",
    // headers: { "Content-Type": "application/xml" },
    ...options
  }
  return fetch(url, requestOptions)
    .then((response) => {
      return response.text()
    })
    .then((doc) => {
      return getDom(doc)
    })
}

// fetch请求kmz并转为Blob对象
function fetchBlob(url, options) {
  const requestOptions = {
    method: "GET",
    ...options
  }
  return fetch(url, requestOptions).then((response) => {
    return response.blob() // 获取返回结果并转化为Blob对象
  })
}
