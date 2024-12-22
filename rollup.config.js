import { nodeResolve } from "@rollup/plugin-node-resolve"
import terser from "@rollup/plugin-terser"
import commonjs from "@rollup/plugin-commonjs"

export default [
  {
    input: "./src/index.js",
    plugins: [
      commonjs(), // 加载非esm资源
      nodeResolve({ browser: true })
    ],
    output: [
      {
        name: "kgUtil",
        file: "./dist/kml-geojson-src.js",
        format: "umd",
        banner: renderBanner()
      },
      {
        name: "kgUtil",
        file: "./dist/kml-geojson.js",
        format: "umd",
        banner: renderBanner(),
        plugins: [terser()]
      }
    ]
  }
]
function renderBanner() {
  const update = getTime()

  return `/**
 * kml与geojson互转工具类
 * 编译日期：${update}
 * 版权所有：Copyright by 木遥
 */`
}
function getTime() {
  const now = new Date()
  let m = now.getMonth() + 1
  m = m < 10 ? "0" + m : m
  let d = now.getDate()
  d = d < 10 ? "0" + d : d
  let h = now.getHours()
  h = h < 10 ? "0" + h : h
  let min = now.getMinutes()
  min = min < 10 ? "0" + min : min
  return `${now.getFullYear()}-${m}-${d} ${h}:${min}`
}
