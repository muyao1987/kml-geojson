﻿import * as JSZip from 'JSZip'
import { kmlToGeoJSON } from './conver/kmlToGeoJSON'
import { geoJSONToKml } from './conver/geoJSONToKml'

//geojson转kml
export function toKml(geojson, options) {
  if (geojson.features) {
    geojson.features.forEach((feature) => {
      updateFeatureByStyle(feature)
    })
  } else {
    updateFeatureByStyle(geojson)
  }
  return geoJSONToKml(geojson, options)
}

function updateFeatureByStyle(feature) {
  if (!feature.properties) return

  let style = feature.properties.style
  if (style) {
    if (style.image) {
      feature.properties['marker-symbol'] = style.image
      if (style.outlineColor) feature.properties['marker-color'] = style.outlineColor
      return
    }
    if (style.color) {
      feature.properties['fill'] = style.color
      if (style.opacity) feature.properties['fill-opacity'] = style.opacity
    }
    if (style.outlineColor) {
      feature.properties['stroke'] = style.outlineColor
      feature.properties['stroke-width'] = style.outlineWidth ?? 1
      feature.properties['stroke-opacity'] = style.outlineOpacity ?? style.opacity ?? 1.0
    }
    if (style.html) {
      style.html = HTMLEncode(style.html)
    }

    //闭合线特殊处理
    if (style.closure && feature.geometry?.coordinates?.length > 0) {
      feature.geometry.coordinates.push(feature.geometry.coordinates[0])
    }
  }

  let type = feature?.properties?.type
  if (type == 'polygon') {
    let arr = feature.geometry.coordinates[0]
    if (arr?.length > 2) {
      arr.push(arr[0])
    }
  } else if (type == 'rectangle') {
    let coors = feature.geometry.coordinates
    const xmin = coors[0][0]
    const xmax = coors[1][0]
    const ymin = coors[0][1]
    const ymax = coors[1][1]

    feature.geometry = {
      type: 'Polygon',
      coordinates: [
        [
          [xmin, ymax],
          [xmin, ymin],
          [xmax, ymin],
          [xmax, ymax],
          [xmin, ymax],
        ],
      ],
    }
  }
}

let getDom = (xml) => new DOMParser().parseFromString(xml, 'application/xml')
let getExtension = (fileName) => fileName.split('.').pop()

let getKmlDom = (kmzFile) => {
  var zip = new JSZip()
  return zip.loadAsync(kmzFile).then((zip) => {
    let kmlDom = null
    zip.forEach((relPath, file) => {
      if (getExtension(relPath) === 'kml' && kmlDom === null) {
        kmlDom = file.async('string').then(getDom)
      }
    })
    return kmlDom || Promise.reject('No kml file found')
  })
}

//kml转geojson
export function toGeoJSON(doc,options) {
  if (!doc) return Promise.reject('参数不能为空')

  if (isString(doc)) {
    let extension = getExtension(doc)
    if (extension === 'kml') {
      return fetchXML(doc,options).then(function (kmlDom) {
        return kmlToGeoJSON(kmlDom)
      })
    } else if (extension === 'kmz') {
      return fetchBlob(doc,options)
        .then(function (xml) {
          return getKmlDom(xml)
        })
        .then(function (kmlDom) {
          return kmlToGeoJSON(kmlDom)
        })
    } else {
      //直接传kml字符串文档
      let geojson = kmlToGeoJSON(getDom(doc))
      return Promise.resolve(geojson)
    }
  } else if (doc.getRootNode) {
    //直接传docmect文档
    let geojson = kmlToGeoJSON(doc)
    return Promise.resolve(geojson)
  } else {
    //直接传blob
    return getKmlDom(doc).then(function (kmlDom) {
      return kmlToGeoJSON(kmlDom)
    })
  }
}

function isString(str) {
  return typeof str == 'string' && str.constructor == String
}

function HTMLEncode(html) {
  var temp = document.createElement('div')
  temp.textContent != null ? (temp.textContent = html) : (temp.innerText = html)
  var output = temp.innerHTML
  return output
}

function fetchXML(url,options) {
  const requestOptions = {
    method: 'GET',
    headers: { 'Content-Type': 'application/xml' },
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

function fetchBlob(url,options) {
  const requestOptions = {
    method: 'GET',
    ...options
  }
  return fetch(url, requestOptions).then((response) => {
    return response.blob() // 获取返回结果并转化为Blob对象
  })
}
