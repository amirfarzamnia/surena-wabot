const translate_1 = require("./modules/translate/translate")

function translate(value, tfromlang, lang) {
  let text
  if (typeof value == 'string') text = [value]
  else text = value
  return translate_1.default(text, {
    tfromlang, 
    to: lang
  })
}

module.exports = translate