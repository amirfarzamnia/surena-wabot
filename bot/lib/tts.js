const request = require('request')
const escapeStringRegexp = require('escape-string-regexp')
const async = require('async')
const fs = require('fs')
const fakeUa = require('fake-useragent')

const LANGUAGES = {
	'af': 'Afrikaans',
	'sq': 'Albanian',
	'ar': 'Arabic',
	'hy': 'Armenian',
	'ca': 'Catalan',
	'zh': 'Chinese',
	'zh-cn': 'Chinese (Mandarin/China)',
	'zh-tw': 'Chinese (Mandarin/Taiwan)',
	'zh-yue': 'Chinese (Cantonese)',
	'hr': 'Croatian',
	'cs': 'Czech',
	'da': 'Danish',
	'nl': 'Dutch',
	'en': 'English',
	'en-au': 'English (Australia)',
	'en-uk': 'English (United Kingdom)',
	'en-us': 'English (United States)',
	'eo': 'Esperanto',
	'fi': 'Finnish',
	'fr': 'French',
	'de': 'German',
	'el': 'Greek',
	'ht': 'Haitian Creole',
	'hi': 'Hindi',
	'hu': 'Hungarian',
	'is': 'Icelandic',
	'id': 'Indonesian',
	'it': 'Italian',
	'ja': 'Japanese',
	'ko': 'Korean',
	'la': 'Latin',
	'lv': 'Latvian',
	'mk': 'Macedonian',
	'no': 'Norwegian',
	'pl': 'Polish',
	'pt': 'Portuguese',
	'pt-br': 'Portuguese (Brazil)',
	'ro': 'Romanian',
	'ru': 'Russian',
	'sr': 'Serbian',
	'sk': 'Slovak',
	'es': 'Spanish',
	'es-es': 'Spanish (Spain)',
	'es-us': 'Spanish (United States)',
	'sw': 'Swahili',
	'sv': 'Swedish',
	'ta': 'Tamil',
	'th': 'Thai',
	'tr': 'Turkish',
	'vi': 'Vietnamese',
	'cy': 'Welsh'
}

function save(getArgs, filepath, text, callback) {
	const text_parts = tokenize(text)
	async.eachSeries(text_parts, function(part, cb) {
        const index = text_parts.indexOf(part)
        const writeStream = fs.createWriteStream(filepath, { flags: index > 0 ? 'a' : 'w' })
        request({
            uri: 'http://translate.google.com/translate_tts' + getArgs(part, index, text_parts.length),
            headers: getHeader(),
            method: 'GET'
		}).pipe(writeStream)
        writeStream.on('finish', cb)
        writeStream.on('error', cb)
	}, callback)
}

function getHeader() {
	return {
		'User-Agent': fakeUa()
	}
}

function getArgsFactory(lang) {
	return function (text, index, total) {
        return `?ie=UTF-8&tl=${lang || 'en'}&q=${encodeURIComponent(text)}&total=${total}&idx=${index}&client=tw-ob&textlen=${text.length}`
	}
}

function tokenize(text) {
	if (!text) throw new Error('No text to speak')
	let output = [], i = 0
	for (const p of text.split(new RegExp('¡!()[]¿?.,;:—«»\n '.split('').map(c => escapeStringRegexp(c)).join('|'))).filter(part => part.length > 0)) {
        if (!output[i]) output[i] = ''
        if (output[i].length + p.length < 100) output[i] += ` ${p}`
        else {
			i++;
			output[i] = p
        }
	}
	output[0] = output[0].substr(1)
	return output
}

exports.languages = () => {
	return LANGUAGES
}
exports.gtts = async (_lang, _debug) => {
	const lang = (_lang || 'en').toLowerCase()
    if (!LANGUAGES[lang]) throw new Error('Language not supported: ' + lang)
    return {
		save: (filepath, text, callback) => {
			save(getArgsFactory(lang), filepath, text, callback)
		}
	}
}