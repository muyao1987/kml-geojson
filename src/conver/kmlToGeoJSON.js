// kml  =>  geojson

const removeSpace = /\s*/g
const trimSpace = /^\s*|\s*$/g
const splitSpace = /\s+/

// generate a short, numeric hash of a string
function okhash(x) {
  if (!x || !x.length) {
    return 0
  }
  // eslint-disable-next-line no-var
  for (var i = 0, h = 0; i < x.length; i++) {
    h = ((h << 5) - h + x.charCodeAt(i)) | 0
  }
  // eslint-disable-next-line block-scoped-var
  return h
}
// all Y children of X
function get(x, y) {
  return x.getElementsByTagName(y)
}
function attr(x, y) {
  return x.getAttribute(y)
}
function attrf(x, y) {
  return parseFloat(attr(x, y))
}
// one Y child of X, if any, otherwise null
function get1(x, y) {
  const n = get(x, y)
  return n.length ? n[0] : null
}
// https://developer.mozilla.org/en-US/docs/Web/API/Node.normalize
function norm(el) {
  if (el.normalize) {
    el.normalize()
  }
  return el
}
// cast array x into numbers
function numarray(x) {
  // eslint-disable-next-line no-var
  for (var j = 0, o = []; j < x.length; j++) {
    o[j] = parseFloat(x[j])
  }
  // eslint-disable-next-line block-scoped-var
  return o
}
// get the content of a text node, if any
function nodeVal(x) {
  if (x) {
    norm(x)
  }
  return (x && x.textContent) || ""
}

// get the contents of multiple text nodes, if present
// function getMulti(x, ys) {
//   let o = {},
//     n,
//     k
//   for (k = 0; k < ys.length; k++) {
//     n = get1(x, ys[k])
//     if (n) o[ys[k]] = nodeVal(n)
//   }
//   return o
// }

// add properties of Y to X, overwriting if present in both
// function extend(x, y) {
//   for (let k in y) x[k] = y[k]
// }
// get one coordinate from a coordinate array, if any
function coord1(v) {
  return numarray(v.replace(removeSpace, "").split(","))
}
// get all coordinates from a coordinate array as [[],[]]
function coord(v) {
  const coords = v.replace(trimSpace, "").split(splitSpace)
  const o = []
  for (let i = 0; i < coords.length; i++) {
    o.push(coord1(coords[i]))
  }
  return o
}
// function coordPair(x) {
//   let ll = [attrf(x, 'lon'), attrf(x, 'lat')],
//     ele = get1(x, 'ele'),
//     // handle namespaced attribute in browser
//     heartRate = get1(x, 'gpxtpx:hr') || get1(x, 'hr'),
//     time = get1(x, 'time'),
//     e
//   if (ele) {
//     e = parseFloat(nodeVal(ele))
//     if (!isNaN(e)) {
//       ll.push(e)
//     }
//   }
//   return {
//     coordinates: ll,
//     time: time ? nodeVal(time) : null,
//     heartRate: heartRate ? parseFloat(nodeVal(heartRate)) : null,
//   }
// }

// create a new feature collection parent object
function fc() {
  return {
    type: "FeatureCollection",
    features: []
  }
}

let serializer
if (typeof XMLSerializer !== "undefined") {
  /* istanbul ignore next */
  serializer = new XMLSerializer()
  // only require xmldom in a node environment
} else if (typeof exports === "object" && typeof process === "object" && !process.browser) {
  serializer = new (require("xmldom").XMLSerializer)()
}
function xml2str(str) {
  // IE9 will create a new XMLSerializer but it'll crash immediately.
  // This line is ignored because we don't run coverage tests in IE9
  /* istanbul ignore next */
  if (str.xml !== undefined) {
    return str.xml
  }
  return serializer.serializeToString(str)
}

export function kmlToGeoJSON(doc) {
  const gj = fc()
  // styleindex keeps track of hashed styles in order to match features
  const styleIndex = {}
  const styleByHash = {}
  // stylemapindex keeps track of style maps to expose in properties
  const styleMapIndex = {}
  // atomic geospatial types supported by KML - MultiGeometry is
  // handled separately
  const geotypes = ["Polygon", "LineString", "Point", "Track", "gx:Track"]
  // all root placemarks in the file
  const placemarks = get(doc, "Placemark")
  const styles = get(doc, "Style")
  const styleMaps = get(doc, "StyleMap")

  for (let k = 0; k < styles.length; k++) {
    const hash = okhash(xml2str(styles[k])).toString(16)
    styleIndex["#" + attr(styles[k], "id")] = hash
    styleByHash[hash] = styles[k]
  }
  for (let l = 0; l < styleMaps.length; l++) {
    styleIndex["#" + attr(styleMaps[l], "id")] = okhash(xml2str(styleMaps[l])).toString(16)
    const pairs = get(styleMaps[l], "Pair")
    const pairsMap = {}
    for (let m = 0; m < pairs.length; m++) {
      pairsMap[nodeVal(get1(pairs[m], "key"))] = nodeVal(get1(pairs[m], "styleUrl"))
    }
    styleMapIndex["#" + attr(styleMaps[l], "id")] = pairsMap
  }
  for (let j = 0; j < placemarks.length; j++) {
    gj.features = gj.features.concat(getPlacemark(placemarks[j]))
  }
  function kmlColor(v) {
    let color, opacity
    v = v || ""
    if (v.substr(0, 1) === "#") {
      v = v.substr(1)
    }
    if (v.length === 6 || v.length === 3) {
      color = v
    }
    if (v.length === 8) {
      opacity = parseInt(v.substr(0, 2), 16) / 255
      color = "#" + v.substr(6, 2) + v.substr(4, 2) + v.substr(2, 2)
    }
    return [color, isNaN(opacity) ? undefined : opacity]
  }
  function gxCoord(v) {
    return numarray(v.split(" "))
  }
  function gxCoords(root) {
    let elems = get(root, "coord", "gx")
    const coords = []
    const times = []
    if (elems.length === 0) {
      elems = get(root, "gx:coord")
    }
    for (let i = 0; i < elems.length; i++) {
      coords.push(gxCoord(nodeVal(elems[i])))
    }
    const timeElems = get(root, "when")
    for (let j = 0; j < timeElems.length; j++) {
      times.push(nodeVal(timeElems[j]))
    }
    return {
      coords: coords,
      times: times
    }
  }
  function getGeometry(root) {
    let geomNode
    let geomNodes
    let i
    let j
    let k
    const geoms = []
    const coordTimes = []
    if (get1(root, "MultiGeometry")) {
      return getGeometry(get1(root, "MultiGeometry"))
    }
    if (get1(root, "MultiTrack")) {
      return getGeometry(get1(root, "MultiTrack"))
    }
    if (get1(root, "gx:MultiTrack")) {
      return getGeometry(get1(root, "gx:MultiTrack"))
    }
    for (i = 0; i < geotypes.length; i++) {
      geomNodes = get(root, geotypes[i])
      if (geomNodes) {
        for (j = 0; j < geomNodes.length; j++) {
          geomNode = geomNodes[j]
          if (geotypes[i] === "Point") {
            geoms.push({
              type: "Point",
              coordinates: coord1(nodeVal(get1(geomNode, "coordinates")))
            })
          } else if (geotypes[i] === "LineString") {
            geoms.push({
              type: "LineString",
              coordinates: coord(nodeVal(get1(geomNode, "coordinates")))
            })
          } else if (geotypes[i] === "Polygon") {
            const rings = get(geomNode, "LinearRing")
            const coords = []
            for (k = 0; k < rings.length; k++) {
              coords.push(coord(nodeVal(get1(rings[k], "coordinates"))))
            }
            geoms.push({
              type: "Polygon",
              coordinates: coords
            })
          } else if (geotypes[i] === "Track" || geotypes[i] === "gx:Track") {
            const track = gxCoords(geomNode)
            geoms.push({
              type: "LineString",
              coordinates: track.coords
            })
            if (track.times.length) {
              coordTimes.push(track.times)
            }
          }
        }
      }
    }
    return {
      geoms: geoms,
      coordTimes: coordTimes
    }
  }
  function getPlacemark(root) {
    const geomsAndTimes = getGeometry(root)
    let i
    const properties = {}
    const name = nodeVal(get1(root, "name"))
    let styleUrl = nodeVal(get1(root, "styleUrl"))
    const description = nodeVal(get1(root, "description"))
    const timeSpan = get1(root, "TimeSpan")
    const timeStamp = get1(root, "TimeStamp")
    const extendedData = get1(root, "ExtendedData")
    let lineStyle = get1(root, "LineStyle")
    let polyStyle = get1(root, "PolyStyle")
    const visibility = get1(root, "visibility")

    if (!geomsAndTimes.geoms.length) {
      return []
    }
    if (name) {
      properties.name = name
    }
    if (styleUrl) {
      if (styleUrl[0] !== "#") {
        styleUrl = "#" + styleUrl
      }

      properties.styleUrl = styleUrl
      if (styleIndex[styleUrl]) {
        properties.styleHash = styleIndex[styleUrl]
      }
      if (styleMapIndex[styleUrl]) {
        properties.styleMapHash = styleMapIndex[styleUrl]
        properties.styleHash = styleIndex[styleMapIndex[styleUrl].normal]
      }
      // Try to populate the lineStyle or polyStyle since we got the style hash
      const style = styleByHash[properties.styleHash]
      if (style) {
        if (!lineStyle) {
          lineStyle = get1(style, "LineStyle")
        }
        if (!polyStyle) {
          polyStyle = get1(style, "PolyStyle")
        }
      }
    }
    if (description) {
      properties.description = description
    }
    if (timeSpan) {
      const begin = nodeVal(get1(timeSpan, "begin"))
      const end = nodeVal(get1(timeSpan, "end"))
      properties.timespan = { begin: begin, end: end }
    }
    if (timeStamp) {
      properties.timestamp = nodeVal(get1(timeStamp, "when"))
    }
    if (lineStyle) {
      const linestyles = kmlColor(nodeVal(get1(lineStyle, "color")))
      const color = linestyles[0]
      const opacity = linestyles[1]
      const width = parseFloat(nodeVal(get1(lineStyle, "width")))
      if (color) {
        properties.stroke = color
      }
      if (!isNaN(opacity)) {
        properties["stroke-opacity"] = opacity
      }
      if (!isNaN(width)) {
        properties["stroke-width"] = width
      }
    }
    if (polyStyle) {
      const polystyles = kmlColor(nodeVal(get1(polyStyle, "color")))
      const pcolor = polystyles[0]
      const popacity = polystyles[1]
      const fill = nodeVal(get1(polyStyle, "fill"))
      const outline = nodeVal(get1(polyStyle, "outline"))
      if (pcolor) {
        properties.fill = pcolor
      }
      if (!isNaN(popacity)) {
        properties["fill-opacity"] = popacity
      }
      if (fill) {
        properties["fill-opacity"] = fill === "1" ? properties["fill-opacity"] || 1 : 0
      }
      if (outline) {
        properties["stroke-opacity"] = outline === "1" ? properties["stroke-opacity"] || 1 : 0
      }
    }
    if (extendedData) {
      const datas = get(extendedData, "Data")
      const simpleDatas = get(extendedData, "SimpleData")

      for (i = 0; i < datas.length; i++) {
        const name = datas[i].getAttribute("name")
        let val = nodeVal(get1(datas[i], "value"))
        try {
          val = JSON.parse(val)
        } catch (e) {}
        properties[name] = val
      }
      for (i = 0; i < simpleDatas.length; i++) {
        const name = simpleDatas[i].getAttribute("name")
        let val = nodeVal(simpleDatas[i])
        try {
          val = JSON.parse(val)
        } catch (e) {}
        properties[name] = val
      }
    }
    if (visibility) {
      properties.visibility = nodeVal(visibility)
    }
    if (geomsAndTimes.coordTimes.length) {
      properties.coordTimes = geomsAndTimes.coordTimes.length === 1 ? geomsAndTimes.coordTimes[0] : geomsAndTimes.coordTimes
    }
    const feature = {
      type: "Feature",
      geometry:
        geomsAndTimes.geoms.length === 1
          ? geomsAndTimes.geoms[0]
          : {
              type: "GeometryCollection",
              geometries: geomsAndTimes.geoms
            },
      properties: properties
    }
    if (attr(root, "id")) {
      feature.id = attr(root, "id")
    }
    return [feature]
  }
  return gj
}
