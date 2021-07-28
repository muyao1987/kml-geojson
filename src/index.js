var togeojson = require('togeojson')
var tokml = require('tokml')
var JSZip = require('JSZip')

//geojson转kml
export function toKml(geojson, options) {
  return tokml(geojson, options)
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
        return togeojson.kml(kmlDom)
      })
    } else if (extension === 'kmz') {
      return Cesium.Resource.fetchBlob(doc)
        .then(function (xml) {
          return getKmlDom(xml)
        })
        .then(function (kmlDom) {
          return togeojson.kml(kmlDom)
        })
    } else {
      //直接传kml字符串文档
      let geojson = togeojson.kml(getKmlDom(doc))
      return Promise.resolve(geojson)
    }
  } else if (doc.getRootNode) {
    //直接传docmect文档
    let geojson = togeojson.kml(doc)
    return Promise.resolve(geojson)
  } else {
    //直接传blob
    return getKmlDom(doc).then(function (kmlDom) {
      return togeojson.kml(kmlDom)
    })
  }
}

function isString(str) {
  return typeof str == 'string' && str.constructor == String
}
