//geojson =>  kml

export function geoJSONToKml(geojson, options) {
  options = options || {
    documentName: undefined,
    documentDescription: undefined,
    name: 'name',
    description: 'description',
    simplestyle: false,
    timestamp: 'timestamp',
  }

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    tag('kml', tag('Document', documentName(options) + documentDescription(options) + root(geojson, options)), [
      ['xmlns', 'http://www.opengis.net/kml/2.2'],
    ])
  )
}

function feature(options, styleHashesArray) {
  return function (attr) {
    if (!attr.properties || !geometry.valid(attr.geometry)) return ''
    var geometryString = geometry.any(attr.geometry)
    if (!geometryString) return ''

    var styleDefinition = '',
      styleReference = ''
    if (options.simplestyle) {
      var styleHash = hashStyle(attr.properties)
      if (styleHash) {
        if (geometry.isPoint(attr.geometry) && hasMarkerStyle(attr.properties)) {
          if (styleHashesArray.indexOf(styleHash) === -1) {
            styleDefinition = markerStyle(attr.properties, styleHash)
            styleHashesArray.push(styleHash)
          }
          styleReference = tag('styleUrl', '#' + styleHash)
        } else if ((geometry.isPolygon(attr.geometry) || geometry.isLine(attr.geometry)) && hasPolygonAndLineStyle(attr.properties)) {
          if (styleHashesArray.indexOf(styleHash) === -1) {
            styleDefinition = polygonAndLineStyle(attr.properties, styleHash)
            styleHashesArray.push(styleHash)
          }
          styleReference = tag('styleUrl', '#' + styleHash)
        }
        // Note that style of GeometryCollection / MultiGeometry is not supported
      }
    }

    return (
      styleDefinition +
      tag(
        'Placemark',
        name(attr.properties, options) +
          description(attr.properties, options) +
          extendeddata(attr.properties) +
          timestamp(attr.properties, options) +
          geometryString +
          styleReference
      )
    )
  }
}

function root(attr, options) {
  if (!attr.type) return ''
  var styleHashesArray = []

  switch (attr.type) {
    case 'FeatureCollection':
      if (!attr.features) return ''
      return attr.features.map(feature(options, styleHashesArray)).join('')
    case 'Feature':
      return feature(options, styleHashesArray)(attr)
    default:
      return feature(
        options,
        styleHashesArray
      )({
        type: 'Feature',
        geometry: attr,
        properties: {},
      })
  }
}

function documentName(options) {
  return options.documentName !== undefined ? tag('name', options.documentName) : ''
}

function documentDescription(options) {
  return options.documentDescription !== undefined ? tag('description', options.documentDescription) : ''
}

function name(attr, options) {
  return attr[options.name] ? tag('name', encode(attr[options.name])) : ''
}

function description(attr, options) {
  return attr[options.description] ? tag('description', encode(attr[options.description])) : ''
}

function timestamp(attr, options) {
  return attr[options.timestamp] ? tag('TimeStamp', tag('when', encode(attr[options.timestamp]))) : ''
}

// ## Geometry Types
//
// https://developers.google.com/kml/documentation/kmlreference#geometry
var geometry = {
  Point: function (attr) {
    return tag('Point', tag('coordinates', attr.coordinates.join(',')))
  },
  LineString: function (attr) {
    return tag('LineString', tag('coordinates', linearring(attr.coordinates)))
  },
  Polygon: function (attr) {
    if (!attr.coordinates.length) return ''
    var outer = attr.coordinates[0],
      inner = attr.coordinates.slice(1),
      outerRing = tag('outerBoundaryIs', tag('LinearRing', tag('coordinates', linearring(outer)))),
      innerRings = inner
        .map(function (i) {
          return tag('innerBoundaryIs', tag('LinearRing', tag('coordinates', linearring(i))))
        })
        .join('')
    return tag('Polygon', outerRing + innerRings)
  },
  MultiPoint: function (attr) {
    if (!attr.coordinates.length) return ''
    return tag(
      'MultiGeometry',
      attr.coordinates
        .map(function (c) {
          return geometry.Point({ coordinates: c })
        })
        .join('')
    )
  },
  MultiPolygon: function (attr) {
    if (!attr.coordinates.length) return ''
    return tag(
      'MultiGeometry',
      attr.coordinates
        .map(function (c) {
          return geometry.Polygon({ coordinates: c })
        })
        .join('')
    )
  },
  MultiLineString: function (attr) {
    if (!attr.coordinates.length) return ''
    return tag(
      'MultiGeometry',
      attr.coordinates
        .map(function (c) {
          return geometry.LineString({ coordinates: c })
        })
        .join('')
    )
  },
  GeometryCollection: function (attr) {
    return tag('MultiGeometry', attr.geometries.map(geometry.any).join(''))
  },
  valid: function (attr) {
    return attr && attr.type && (attr.coordinates || (attr.type === 'GeometryCollection' && attr.geometries && attr.geometries.every(geometry.valid)))
  },
  any: function (attr) {
    if (geometry[attr.type]) {
      return geometry[attr.type](attr)
    } else {
      return ''
    }
  },
  isPoint: function (attr) {
    return attr.type === 'Point' || attr.type === 'MultiPoint'
  },
  isPolygon: function (attr) {
    return attr.type === 'Polygon' || attr.type === 'MultiPolygon'
  },
  isLine: function (attr) {
    return attr.type === 'LineString' || attr.type === 'MultiLineString'
  },
}

function linearring(attr) {
  return attr.map(function (cds) {
    return cds.join(',')
  }).join(' ')
}

// ## Data
function extendeddata(attr) {
  let arr =[]
  for (var i in attr) {
    let val =  attr[i]
    if(isObject(val)){
      arr.push(`<Data name ="${i}"><value>${JSON.stringify(val)}</value></Data>`)
    }else{
      arr.push(`<Data name ="${i}"><value>${val}</value></Data>`)
    }
  }
  return tag('ExtendedData', arr.join(''))
}

function data(attr) {
  return tag('Data', tag('value', encode(attr[1])), [['name', encode(attr[0])]])
}

// ## Marker style
function hasMarkerStyle(attr) {
  return !!(attr['marker-size'] || attr['marker-symbol'] || attr['marker-color'])
}

function markerStyle(attr, styleHash) {
  return tag('Style', tag('IconStyle', tag('Icon', tag('href', iconUrl(attr)))) + iconSize(attr), [['id', styleHash]])
}

function iconUrl(attr) {
  return attr['marker-symbol']
  // var size = attr['marker-size'] || 'medium',
  //   symbol = attr['marker-symbol'] ? '-' + attr['marker-symbol'] : '',
  //   color = (attr['marker-color'] || '7e7e7e').replace('#', '')
  // return 'https://api.tiles.mapbox.com/v3/marker/' + 'pin-' + size.charAt(0) + symbol + '+' + color + '.png'
}

function iconSize(attr) {
  return tag('hotSpot', '', [
    ['xunits', 'fraction'],
    ['yunits', 'fraction'],
    ['x', 0.5],
    ['y', 0.5],
  ])
}

// ## Polygon and Line style
function hasPolygonAndLineStyle(attr) {
  for (var key in attr) {
    if (
      {
        stroke: true,
        'stroke-opacity': true,
        'stroke-width': true,
        fill: true,
        'fill-opacity': true,
      }[key]
    )
      return true
  }
}

function polygonAndLineStyle(attr, styleHash) {
  var lineStyle = tag('LineStyle', [
    tag('color', hexToKmlColor(attr['stroke'], attr['stroke-opacity']) || 'ff555555') +
      tag('width', attr['stroke-width'] === undefined ? 2 : attr['stroke-width']),
  ])

  var polyStyle = ''

  if (attr['fill'] || attr['fill-opacity']) {
    polyStyle = tag('PolyStyle', [tag('color', hexToKmlColor(attr['fill'], attr['fill-opacity']) || '88555555')])
  }

  return tag('Style', lineStyle + polyStyle, [['id', styleHash]])
}

// ## Style helpers
function hashStyle(attr) {
  var hash = ''

  if (attr['marker-symbol']) hash = hash + 'ms' + attr['marker-symbol']
  if (attr['marker-color']) hash = hash + 'mc' + attr['marker-color'].replace('#', '')
  if (attr['marker-size']) hash = hash + 'ms' + attr['marker-size']
  if (attr['stroke']) hash = hash + 's' + attr['stroke'].replace('#', '')
  if (attr['stroke-width']) hash = hash + 'sw' + attr['stroke-width'].toString().replace('.', '')
  if (attr['stroke-opacity']) hash = hash + 'mo' + attr['stroke-opacity'].toString().replace('.', '')
  if (attr['fill']) hash = hash + 'f' + attr['fill'].replace('#', '')
  if (attr['fill-opacity']) hash = hash + 'fo' + attr['fill-opacity'].toString().replace('.', '')

  return hash
}

function hexToKmlColor(hexColor, opacity) {
  if (typeof hexColor !== 'string') return ''

  hexColor = hexColor.replace('#', '').toLowerCase()

  if (hexColor.length === 3) {
    hexColor = hexColor[0] + hexColor[0] + hexColor[1] + hexColor[1] + hexColor[2] + hexColor[2]
  } else if (hexColor.length !== 6) {
    return ''
  }

  var r = hexColor[0] + hexColor[1]
  var g = hexColor[2] + hexColor[3]
  var b = hexColor[4] + hexColor[5]

  var o = 'ff'
  if (typeof opacity === 'number' && opacity >= 0.0 && opacity <= 1.0) {
    o = (opacity * 255).toString(16)
    if (o.indexOf('.') > -1) o = o.substr(0, o.indexOf('.'))
    if (o.length < 2) o = '0' + o
  }

  return o + b + g + r
}



/**
 * 判断对象是否为Object类型
 * @param {*} obj 对象
 * @returns {Boolean} 是否为Object类型
 */
 export function isObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

/**
 * @param {string} attr a string of attribute
 * @returns {string}
 */
function encode(attr) {
  if(!attr)return ''

  return attr.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * @param {array} attr an array of attributes
 * @returns {string}
 */
function attr(attributes) {
  if (!Object.keys(attributes).length) return ''
  return (
    ' ' +
    Object.keys(attributes)
      .map(function (key) {
        return key + '="' + escape(attributes[key]) + '"'
      })
      .join(' ')
  )
}

let escape_map = {
  '>': '&gt;',
  '<': '&lt;',
  "'": '&apos;',
  '"': '&quot;',
  '&': '&amp;',
}

function escape(string, ignore) {
  var pattern

  if (string === null || string === undefined) return

  ignore = (ignore || '').replace(/[^&"<>\']/g, '')
  pattern = '([&"<>\'])'.replace(new RegExp('[' + ignore + ']', 'g'), '')

  return string.replace(new RegExp(pattern, 'g'), function (str, item) {
    return escape_map[item]
  })
}


/**
 * @param {string} el element name
 * @param {string} contents innerXML
 * @param {array} attributes array of pairs
 * @returns {string}
 */
function tag(el, attributes, contents) {
  if (Array.isArray(attributes) || typeof attributes === 'string') {
    contents = attributes
    attributes = {}
  }
  if (Array.isArray(contents))
    contents =
      '\n' +
      contents
        .map(function (content) {
          return '  ' + content
        })
        .join('\n') +
      '\n'
  return '<' + el + attr(attributes) + '>' + contents + '</' + el + '>'
}
