import * as JSZip from 'JSZip'
import { kmlToGeoJSON } from './conver/kmlToGeoJSON'
import { geoJSONToKml } from './conver/geoJSONToKml'

//geojson转kml
export function toKml(geojson, options) {
  if (geojson.features) {
    geojson.features.forEach((feature) => {
      if (!feature.properties) return

      var style = feature.properties.style
      feature.properties = {
        'marker-symbol': style.image || '',
        'marker-color': style.outlineColor,

        stroke: style.outlineColor,
        'stroke-width': style.outlineWidth,
        'stroke-opacity': style.outlineOpacity ?? style.opacity,

        fill: style.color,
        'fill-opacity': style.opacity,
      }
    })
  }
  return geoJSONToKml(geojson, options)
}

let getDom = (xml) => new DOMParser().parseFromString(xml, 'text/xml')
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
export function toGeoJSON(doc) {
  if (!doc) return Promise.reject('参数不能为空')

  if (isString(doc)) {
    let extension = getExtension(doc)
    if (extension === 'kml') {
      return Cesium.Resource.fetchXML(doc).then(function (kmlDom) {
        return kmlToGeoJSON(kmlDom)
      })
    } else if (extension === 'kmz') {
      return Cesium.Resource.fetchBlob(doc)
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
