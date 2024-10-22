"use strict"

const JOIN_WITH = "[]"
Object.defineProperty(exports, "__esModule", { value: true })
function arrayStringify(data) {
    return data.join(`${JOIN_WITH}\n`)
}

exports.arrayStringify = arrayStringify
function parseMultiple(list) {
    var translateMap = list.map(function (item) {
        var text = item[0]
        return text.trim()
    })
    var result = translateMap.join(' ').split(JOIN_WITH).map(item => item.trim())
    return result
}

exports.parseMultiple = parseMultiple