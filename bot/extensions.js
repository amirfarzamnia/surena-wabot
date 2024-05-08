/**
 * Surena WhatsApp Bot
 *
 * @requires baileys npm
 * @author amirfarzamnia
 * @github https://github.com/amirfarzamnia/surenawabot
 *
 * @description
 * This is a WhatsApp bot built with Node.js that created using baileys library
 * to send and receive messages. The bot can respond to messages with pre-defined
 * text responses or perform various tasks, such as fetching the weather or
 * looking up information on Wikipedia.
 *
 * @license MIT
 * This code is licensed under the MIT License: https://opensource.org/licenses/MIT
 *
 * Feel free to modify and use this code as you see fit. If you have any questions
 * or issues, please contact the author.
 */

const { Sticker, StickerTypes } = require('./lib/sticker')
const { textpro, effects } = require('./lib/textpro')
const { topng, tomp4 } = require('./lib/sconverter')
const { gtts, languages } = require('./lib/tts')
const translate = require('./lib/translate')
const upload = require('./lib/upload')
const axios = require('axios')

/**
 * Extensions
 *
 * This section of the code contains various extensions.
 * When a user requests a specific extension, the extension will be activated,
 * perform certain processes such as requesting data from an API,
 * and then provide an answer to the user's request.
 */

const extensions = {
    add: async (m, { sock, args, participants, command }) => {
        const users = m.quoted ? [m.quoted.sender] : (m.mentionedJid?.length && m.mentionedJid || args.join(' ').split(' ')).filter(Boolean)
        if (users.length == 0) throw 'Please mention user(s)'

        let result = []
        for (const user of users) {
            const [userData] = await sock.onWhatsApp(user)
            if (userData.exists) result.push(userData.jid)
        }

        if (result.length == 0) throw 'You have not mentioned any valid WhatsApp users in your text'
        const members = participants.map(participant => participant.id)

        if (command == 'add') {
            const finalUsers = result.filter(jid => !members.includes(jid))
            if (finalUsers.length == 0) throw `Mentioned user(s) have already been added to the group`
            await sock.groupParticipantsUpdate(m.chat, finalUsers, 'add')
            await sock.react({ chat: m.chat, text: '✅', key: m.key })
        }
        else if (command == 'kick') {
            const finalUsers = result.filter(jid => members.includes(jid))
            if (finalUsers.length == 0) throw 'Mentioned user(s) are not member(s) of this group'
            await sock.groupParticipantsUpdate(m.chat, finalUsers, 'remove')
            await sock.react({ chat: m.chat, text: '✅', key: m.key })
        }
    },
    alive: async (m, { sock }) => {
        const text = global.db.data[sock.user.jid].settings?.values?.alive ?? 'Hi {tag}!\nToday is {date}. {image pp}'
        sock.textSwitch(text, m, true)
    },
    block: async (m, { sock, args, command }) => {
        let user = m.quoted?.sender || m.mentionedJid?.[0] || args?.[0] || (m.isGroup ? null : m.chat)
        if (!user) throw 'Please mention user'

        const [result] = await sock.onWhatsApp(user)
        if (result) user = result.jid
        else {
            if (!m.isGroup) user = m.chat
            else throw 'The user does not exist on WhatsApp'
        }

        const blocklist = await sock.fetchBlocklist()
        const isBlocked = blocklist.some(item => item.includes(user))

        if (command == 'block') {
            if (isBlocked) throw `You already blocked @${user.split`@`[0]}`
            await sock.updateBlockStatus(user, 'block')
            await sock.react({ chat: m.chat, text: '🔒', key: m.key })
        }
        else if (command == 'unblock') {
            if (!isBlocked) throw `You did not blocked @${user.split`@`[0]}`
            await sock.updateBlockStatus(user, 'unblock')
            await sock.react({ chat: m.chat, text: '🔓', key: m.key })
        }
    },
    blocklist: async (m, { sock }) => {
        const blocklist = await sock.fetchBlocklist()
        if (blocklist.length == 0) throw 'You have no blocked contacts'
        if (m.isGroup) m.reply('*Blocked contacts list has been sent to your private chat*')
        await sock.sendText({ chat: m.sender, text: `*Total blocked contacts: ${blocklist.length}*\n\n${blocklist.map(c => `○ wa.me/${c.split`@`[0]}`).join('\n')}`, quoted: m })
      },
    calculator: async (m, { text }) => {
        if (!text) throw 'Please enter a math equation to solve'

        text = text
        .replace(/[^0-9\-\/+*×÷πEe()piPI/]/g, '')
        .replace(/×/g, '*').replace(/÷/g, '/')
        .replace(/π|pi/gi, 'Math.PI')
        .replace(/e/gi, 'Math.E')
        .replace(/\/+/g, '/')
        .replace(/\++/g, '+')
        .replace(/-+/g, '-')

        const format = text
        .replace(/Math\.PI/g, 'π')
        .replace(/Math\.E/g, 'e')
        .replace(/\//g, '÷')
        .replace(/\*/g, '×')

        m.reply(`${format} *=* ${new Function('return ' + text)()}`).catch(() => {
            throw 'Invalid format. Please use only the following symbols: -, +, *, /, ×, ÷, π, e'
        })
    },
    contact: async (m, { sock, args }) => {
        let users = m.quoted ? [m.quoted.sender] : (m.mentionedJid?.length && m.mentionedJid || args.join(' ').split(' ')).filter(Boolean)
        if (users.length == 0) users = [m.sender]

        let result = []
        for (const user of users) {
            const [userData] = await sock.onWhatsApp(user)
            if (userData) result.push(userData.jid)
        }

        if (result.length == 0) throw 'You have not mentioned any valid WhatsApp users in your text'

        let contacts = []
        for (const user of result) {
            const phone = user.replace(/[^0-9]/g, '')
            const displayName = await sock.getName(user)
            const status = await sock.fetchStatus(user)
            const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${displayName}\nORG:${global.db.data[this.user.jid].settings?.values?.botname ?? 'Surena'}\nTEL;type=CELL;type=VOICE;waid=${phone}:${phone}\nEMAIL;type=Status:${status.status}\nEND:VCARD`
            contacts.push({ vcard, displayName })
        }

        await sock.sendMessage(m.chat, { contacts: { contacts }}, { quoted: m })
    },
    device: async (m, { sock }) => {
        const q = m.quoted || m
        const device = sock.getDevice(q.id)
        await q.reply(`Message was sent from *${device}* WhatsApp version.`)
        await sock.react({ chat: m.chat, text: { android: '📱', ios: '🍎', web: '🖥' }[device], key: (m.quoted?.obj?.key || m.key) })
    },
    enable: async (m, { sock, usedPrefix, command, args, isOwner, isAdmin }) => {
        const isEnable = /enable/i.test(command)
        const chat = global.db.data[sock.user.jid].chats[m.chat]
        const settings = global.db.data[sock.user.jid].settings
        const type = (args[0] || '').toLowerCase()

        let isRobot = false
        switch (type) {
            case 'antilink':
                if (!m.isGroup) return sock.failMsg('group', m)
                if (!isAdmin) return sock.failMsg('admin', m)
                chat.antiLink = isEnable
                break
            case 'grouponly':
                if (!isOwner) return sock.failMsg('owner', m)
                isRobot = true
                settings.groupOnly = isEnable
                break
            case 'public':
                if (!isOwner) return sock.failMsg('owner', m)
                isRobot = true
                settings.public = isEnable
                break
            case 'autoread':
                if (!m.isGroup) return sock.failMsg('group', m)
                if (!isOwner) return sock.failMsg('owner', m)
                chat.autoread = isEnable
                break
            case 'detect':
                if (!m.isGroup) return sock.failMsg('group', m)
                if (!isAdmin) return sock.failMsg('admin', m)
                chat.detect = isEnable
                break
            case 'numban':
                if (!m.isGroup) return sock.failMsg('group', m)
                if (!isAdmin) return sock.failMsg('admin', m)
                chat.numban = isEnable
                 break
            case 'welcome':
                if (!m.isGroup) return sock.failMsg('group', m)
                if (!isAdmin) return sock.failMsg('admin', m)
                chat.welcome = isEnable
                break
            default: return m.reply(`┌〔 Options 〕\n│ ${isOwner ? '\n├□ *OWNER ↴*\n│\n├○ autoread\n├○ grouponly\n├○ public\n│\n├□ *ADMIN ↴*\n│' : ''}\n├○ antilink\n├○ detect\n├○ numban\n├○ welcome\n└───────\n\nFor example:\n\n${usedPrefix}enable antilink\n${usedPrefix}disable antilink`)
        }

        m.reply(`*${type}* successfully *${isEnable ? 'enabled' : 'disabled'}* for ${isRobot ? 'robot' : 'this chat'}.`)
    },
    extensions: async(m, { extensions, extensionsdata }) => {
        m.reply(`*Total Extensions:* ${extensions.length}\n──────────•\n\n${extensions.map(extension => {
            const { help, tags, desc, command } = extensionsdata[extension.name]
            return `「 *${extension.name}* 」\n${help ? `\n(❔) *Help:* ${help.join(', ')}` : ''}${tags ? `\n(🏷️) *Tag(s):* ${tags.join(', ')}` : ''}${command ? `\n(🤖) *Command(s):* ${command.join(', ')}${desc ? `\n(💬) *Description:* ${desc}` : ''}` : ''}`
        }).join('\n\n')}`)
    },
    extnstat: async(m, { sock }) => {
        m.reply(Object.entries(global.db.data[sock.user.jid].stats).map(([extn, data]) => `「 *${extn}* 」\n\n(👁‍🗨) *Total Used:* ${data.total}\n(✔️) *Total Success:* ${data.success}\n(✖️) *Total Fails:* ${data.total - data.success}\n(🕰) *Last Used:* ${sock.clockString((+ new Date) - data.last)} ago${data.bugs ? `\n(👾) *Total Bugs:* ${data.bugs}\n(👾) *Last Bug:* ${sock.clockString((+ new Date) - data.lastbug)} ago` : ''}`).join('\n\n'))
    },
    invite: async (m, { sock, args }) => {
        let user = m.quoted?.sender || m.mentionedJid?.[0] || args?.[0] || null
        if (!user) throw 'Please mention user'

        let [result] = await sock.onWhatsApp(user)
        if (!result) throw 'The user does not exist on WhatsApp'
        else user = result.jid

        const maincap = 'Follow this link to join my WhatsApp group: {glink}'
        const caption = m.quoted ? args.length > 0 ? args.join(' ') : maincap : args[1] ? args.slice(1).join(' ') : maincap
        const text = await sock.textSwitch(caption, m, false)

        await sock.sendText({ chat: user, text: text })
        await m.reply(`The group invitation link with ${caption == maincap ? 'default' : 'customized'} caption has been sent to *@${user.split`@`[0]}*.`)
    },
    leave: async (m, { sock }) => {
        await sock.groupLeave(m.chat)
    },
    logout: async (m, { sock, args, usedPrefix, command }) => {
        if (args[0] != sock.bot.id) throw `If you use this command, you will be logged out from Surena WhatsApp bot and will no longer have access to its features. However, your database will remain on the server until you return. To logout from account use:\n\n${usedPrefix + command} ${sock.bot.id}`
        await sock.react({ chat: m.chat, text: '✅', key: m.key })
        await sock.logout()
    },
    menu: async (m, { sock, extensions, extensionsdata }) => {
        const help = extensions.map(extension => ({ help: extensionsdata[extension.name].help, tags: extensionsdata[extension.name].tags }))
        const text = [`\n● *User Name:* ${sock.getName(m.sender)}\n● *Bot Name:* ${global.db.data[sock.user.jid].settings?.values?.botname ?? 'Surena'}\n● *Total Extensions:* ${extensions.length}\n● *Date:* ${(new Date).toLocaleDateString()}\n● *Version:* ${process.env.VERSION || 'Unknown'}\n● *Bot ID:* ${sock.bot.id}\n`]
        const tags = ['main', 'sticker', 'administrator', 'group', 'internet', 'logo', 'downloader', 'tools', 'fun', 'database', 'audio', 'info', 'owner']

        tags.forEach((tag) => {
            const category = help.filter(menu => menu.tags && menu.tags.includes(tag) && menu.help).map(menu => menu.help).map(cmdHelp => `│ ○ ${cmdHelp.join(', ')}`).join('\n')
            text.push(`${`┌─( *${tag.charAt(0).toUpperCase() + tag.slice(1)}* )`}\n${category ? category + '\n' : ''}└──•\n`)
        })

        sock.sendFile({ chat: m.chat, file: 'https://telegra.ph/file/749306811321804b33055.jpg', caption: text.join('\n'), quoted: m })
    },
    pin: async (m, { sock, command }) => {
        await sock.chatModify({ pin: command == 'pin' ? true : false }, m.chat)
        await sock.react({ chat: m.chat, text: '📌', key: m.key })
    },
    profile: async (m, { sock, args }) => {
        let user = m.quoted?.sender || m.mentionedJid?.[0] || args?.[0] || m.sender
        let [result] = await sock.onWhatsApp(user)
        if (!result) throw 'The user does not exist on WhatsApp'
        else user = result.jid

        const file = await sock.profilePictureUrl(user, 'image').catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png')
        const status = await sock.fetchStatus(user)

        const caption =`○ *Name:* ${await sock.getName(user)}\n○ *Phone number:* ${user.split`@`[0]}\n○ *Link:* wa.me/${user.split`@`[0]}\n\n○ *Status:*\n${status.status}\n\n○ *Status SetAt:*\n${status.setAt}`
        sock.sendFile({ chat: m.chat, file, caption, quoted: m })
    },
    promote: async (m, { sock, args, participants, command }) => {
        const users = m.quoted ? [m.quoted.sender] : (m.mentionedJid?.length && m.mentionedJid || args.join(' ').split(' ')).filter(Boolean)
        if (!users.length) throw 'Please mention user(s)'

        let result = [], adminUsers = []
        for (const user of users) {
            const [userData] = await sock.onWhatsApp(user)
            if (userData) {
                result.push(userData.jid)
                const participant = participants.find(participant => participant.id == userData.jid)
                if (participant.admin) adminUsers.push(participant.id)
            }
        }

        if (!result.length) throw 'You have not mentioned any valid WhatsApp users in your text'

        const finalUsers = result.filter(jid => participants.map(participant => participant.id).includes(jid))
        if (!finalUsers.length) throw 'Mentioned user(s) are not member(s) of this group'

        if (command == 'promote') {
            if (JSON.stringify(adminUsers) == JSON.stringify(finalUsers)) throw 'Mentioned user(s) are admin(s)'
            await sock.groupParticipantsUpdate(m.chat, finalUsers, 'promote')
        }
        else if (command == 'demote') {
            if (!adminUsers.length) throw 'Mentioned user(s) are not admin(s)'
            await sock.groupParticipantsUpdate(m.chat, adminUsers, 'demote')
        }

        await sock.react({ chat: m.chat, text: command == 'promote' ? '🔺' : '🔻', key: m.key })
    },
    readmore: async (m, { text }) => {
        const readMore = String.fromCharCode(8206).repeat(3075)
        m.reply(text ? text.replace(/\+/g, readMore) : readMore)
    },
    say: async (m, { sock, text }) => {
        const user = /{user (.*?)}/.exec(text)
        const chat = /{chat (.*?)}/.exec(text)
        const message = /{message (.*?)}/.exec(text)

        text = (await sock.textSwitch(text, m, false))
        .replace(/{user (.*?)}/g, '')
        .replace(/{chat (.*?)}/g, '')
        .replace(/{message (.*?)}/g, '')

        const conversationMsg = (message?.[1] || m.text)
        .replace(/{user (.*?)}/g, '')
        .replace(/{chat (.*?)}/g, '')
        .replace(/{message (.*?)}/g, '')

        sock.sendMessage(m.chat, { text: text}, {
            quoted: {
                key: { participant: user?.[1] + '@s.whatsapp.net' || m.sender, remoteJid: chat?.[1] || m.chat },
                message: { conversation: conversationMsg }
            }
        })
    },
    set: async (m, { sock, args, isOwner, isAdmin }) => {
        const chat = global.db.data[sock.user.jid].chats[m.chat]
        const settings = global.db.data[sock.user.jid].settings
        const type = (args[0] || '').toLowerCase()
        const value = args.slice(1).join(' ')

        let isRobot = false
        if (type && !value) throw 'Please enter the value of ' + type

        switch (type) {
            case 'alive':
                if (!isOwner) return sock.failMsg('owner', m)
                isRobot = true
                settings.values.alive = value
                break
            case 'botname':
                if (!isOwner) return sock.failMsg('owner', m)
                isRobot = true
                settings.values.botname = value
                break
            case 'numban':
                if (!m.isGroup) return sock.failMsg('group', m)
                if (!isAdmin) return sock.failMsg('admin', m)
                chat.values.numban = JSON.parse(JSON.stringify(value.split(' ')))
                break
            case 'msgwelcome':
                if (!m.isGroup) return sock.failMsg('group', m)
                if (!isAdmin) return sock.failMsg('admin', m)
                chat.values.msgWelcome = value
                break
            case 'msgbye':
                if (!m.isGroup) return sock.failMsg('group', m)
                if (!isAdmin) return sock.failMsg('admin', m)
                chat.values.msgBye = value
                break
            default: return m.reply(`┌〔 Options 〕\n│ ${isOwner ? '\n├□ *OWNER ↴*\n│\n├○ alive\n├○ botname\n│\n├□ *ADMIN ↴*\n│' : ''}\n├○ numban\n├○ msgwelcome\n├○ msgbye\n└───────`)
        }

        m.reply(`*${type}* successfully set for ${isRobot ? 'robot' : 'this chat'} to:\n${value}`)
    },
    setgpp: async (m, { sock }) => {
        const q = m.quoted || m
        if (!/image\/(png|jpe?g|gif|webp)/.test((q.msg || q).mimetype)) throw 'Reply to the image/sticker/gif that you want to set as the group profile picture'
        await sock.updateProfilePicture(m.chat, await q.download())
    },
    sticker: async (m, { sock }) => {
        /**
         * @todo Support animated stickers
         */
        const q = m.quoted || m
        const mime = (q.msg || q).mimetype

        if (!/image|webp|video/.test(mime)) throw 'Reply to the image file to create new sticker'
        if (/video/.test(mime)) throw 'Creating animated stickers is currently not supported'
        // if (/video/.test(mime) && (q.msg || q).seconds > 11) throw 'Maximum video duration is 11 seconds!'

        const sticker = new Sticker(await q.download(), { pack: global.db.data[this.user.jid].settings?.values?.botname ?? 'Surena', author: 'github: surenabot', type: StickerTypes.DEFAULT })
        await sock.sendSticker({ chat: m.chat, sticker: await sticker.build(), quoted: m })
    },
    tag: async (m, { sock, text, participants, isAdmin }) => {
        if (m.isGroup && !isAdmin) throw 'You are not an admin'

        const { generateWAMessageFromContent } = require('@adiwajshing/baileys')
        const users = participants.map(participant => participant.id)
        const c = m.quoted || m.msg
        const msg = await sock.cMod(m.chat, generateWAMessageFromContent(m.chat, {
            [c.toJSON ? (m.quoted || m).mtype : 'extendedTextMessage']: c.toJSON ? c.toJSON() : { text: await c || '' },
            mentions: await users
        }, { quoted: null, userJid: sock.user.id }), await sock.textSwitch(text, m) || ' ', sock.user.jid, { mentions: await users })

        await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    },
    textpro: async (m, { sock, args, usedPrefix, command }) => {
        const errorText = `For example:\n\n${usedPrefix + command} space surena\n${usedPrefix + command} blue-metal surena\n\nEffects List:${String.fromCharCode(8206).repeat(3075)}\n\n${effects().map((effect, i) => `${i+++1}. ${effect.title}`).join('\n')}`
        if (!args[0]) throw `Enter effect and text to create logo!\n\n${errorText}`

        const content = args.slice(1).join(' ')
        if (!content) throw 'Please insert content of textpro\'s logo'

        const textPro = await textpro(args[0], content)
        if (textPro == 404) throw `${args[0]} is an invalid effect!\n\n${errorText}`

        const response = await axios.get(textPro, { responseType: 'arraybuffer' })
        sock.sendFile({ chat: m.chat, file: response.data, caption: `*● TEXTPRO LOGO*\n\n(✨) *Effect:* ${args[0].toLowerCase()}\n(✏️) *Text:* ${content}`, quoted: m })
    },
    tomedia: async (m, { sock }) => {
        if (!/webp/.test(m.quoted?.mimetype)) throw 'Reply to sticker'
        sock.sendFile({ chat: m.chat, file: await (m.quoted.isAnimated ? tomp4 : topng)(await m.quoted.download()), quoted: m })
    },
    translate: async (m, { args, usedPrefix, command }) => {
        let lang = args[0]
        let content = args.slice(1).join(' ')
        if ((args[0] || '').length != 2) {
            lang = 'en'
            content = args.join(' ')
        }

        if (!content && m.quoted && m.quoted.text) content = m.quoted.text
        if (!content && !m.quoted) throw `Enter the language and text to translate!\n\nFor example:\n\n${usedPrefix + command} ar Hello world!\n\n${usedPrefix + command} en مرحبا بالعالم`

        m.reply(`${await translate(content, 'cn', lang)}`)
    },
    tts: async (m, { sock, args, usedPrefix, command }) => {
        let lang = args[0]
        let content = args.slice(1).join(' ')
        if ((args[0] || '').length != 2) {
            lang = 'en'
            content = args.join(' ')
        }

        if (!content && m.quoted && m.quoted.text) content = m.quoted.text
        if (!content && !m.quoted) {
            const langs = Object.entries(languages()).map(([key, value], i) => `${i + 1}. ${key} ○ ${value}` ).join('\n')
            throw `Enter language and text to speech!\n\nFor example:\n\n${usedPrefix + command} en Hello world!\n${usedPrefix + command} ar مرحبا بالعالم\n\nLanguages:${String.fromCharCode(8206).repeat(3075)}\n\n${langs}`
        }

        const filePath = './tmp/' + 1 * new Date
        gtts(lang).then((data) => {
            data.save(filePath, content, () => {
                sock.sendFile({ chat: m.chat, file: filePath, filename: 'tts.opus', quoted: m, ptt: true })
            })
        })
    },
    upload: async (m) => {
        const q = m.quoted || m
        const mime = (q.msg || q).mimetype

        if (!mime) throw 'Reply to the media file you want to upload'

        const media = await q.download()
        const isMedia = /image\/(png|jpe?g|gif)|video\/mp4/.test(mime)
        const i = parseInt(Math.floor(Math.log(media.length) / Math.log(1024)))

        m.reply(`*File uploaded to telegra.ph:*\n\n${await (isMedia ? upload.image : upload.file)(media)}\n\n○ *Size:* ${(media.length / Math.pow(1024, i)).toFixed(1) + [' Bytes', ' KB', ' MB'][i]}\n○ *Expire:* ${isMedia ? 'none' : '24 hours'}`)
    },
    warn: async (m, { sock, args, participants }) => {
        let user = m.quoted?.sender || m.mentionedJid?.[0] || args?.[0] || null
        if (!user) throw 'Please mention user'

        const [result] = await sock.onWhatsApp(user)
        if (!result) throw 'The user does not exist on WhatsApp'
        else user = result.jid

        if (!participants.some(participant => participant.id.includes(user))) throw `@${user.split`@`[0]} does not exist in group`
        const thisUser = global.db.data[sock.user.jid].chats[m.chat].users[user]

        if (args[1] && !isNaN(args[1])) thisUser.warning = args[1]
        else thisUser.warning ++

        if (thisUser.warning >= 10) {
            await m.reply(`*@${user.split('@')[0]} Recieved warning(s)*\n\nNow they have ${thisUser.warning}/10 warnings and will be removed from this group.`)
            await sock.groupParticipantsUpdate(m.chat, [user], 'remove')
            thisUser.warning = 0
        }

        else m.reply(`*@${user.split('@')[0]} Recieved warning(s)*\n\nThey have ${10 - thisUser.warning}/10 warnings left before being removed from this group.`)
    }
}

/**
 * Extensions data
 *
 * This section of the code contains information about the extensions, including access restrictions
 * for users like admins, the command for invoking each extension, and a description of its purpose.
 * Each extension must have its own data set in order for handler.js to find and activate the correct
 * extension when a user makes a request.
 */

const options = {
    add: {
        help: ['add', 'kick'].map(cmd => cmd + ' [user]'),
        tags: ['administrator'],
        desc: ['Add or kick participants from group using this command.'],
        command: ['add', 'kick'],
        group: true,
        admin: true
    },
    alive: {
        help: ['alive'],
        tags: ['main'],
        command: ['alive']
    },
    block: {
        help: ['block', 'unblock'].map(cmd => cmd + ' [user]'),
        tags: ['main'],
        desc: ['Block/Unblock a user.'],
        command: ['block', 'unblock'],
        owner: true
    },
    blocklist: {
        help: ['blocklist'],
        tags: ['main'],
        desc: ['Check your block list.'],
        command: ['blocklist', 'bl'],
        owner: true
    },
    calculator: {
        help: ['calculate [math equation]'],
        tags: ['tools'],
        command: ['calculator', 'calculate', 'calc', 'c']
    },
    contact: {
        help: ['contact [user]'],
        tags: ['tools'],
        desc: ['Create contact from phone number.'],
        command: ['contact']
    },
    device: {
        help: ['device (message)'],
        tags: ['tools'],
        desc: ['Get WhatsApp version from a message.'],
        command: ['device', 'd']
    },
    enable: {
        help: ['enable', 'disable'].map(cmd => cmd + ' [option]'),
        tags: ['administrator', 'owner'],
        desc: ['Toggle your robot systems.'],
        command: ['enable', 'disable']
    },
    extensions: {
        help: ['extensions'],
        tags: ['info'],
        desc: ['It will give you a list of all extensions.'],
        command: ['extensions', 'extn']
    },
    extnstat: {
        help: ['extnstat'],
        tags: ['info'],
        desc: ['Get status of extensions.'],
        command: ['extnstat', 'es']
    },
    invite: {
        help: ['invite [user]'],
        tags: ['administrator'],
        desc: ['Bring more people into your group by sending invites.'],
        command: ['invite', 'i'],
        group: true,
        admin: true,
        botAdmin: true
    },
    leave: {
        help: ['leave'],
        tags: ['main'],
        desc: ['Leave the group.'],
        command: ['leave'],
        group: true,
        owner: true
    },
    logout: {
        help: ['logout'],
        tags: ['main'],
        desc: ['Logout from surena bot.'],
        command: ['logout'],
        owner: true
    },
    menu: {
        help: ['menu'],
        tags: ['main'],
        command: ['menu', 'm']
    },
    pin: {
        help: ['pin', 'unpin'],
        tags: ['main'],
        desc: ['Pin or unpin chat for easy access.'],
        command: ['pin', 'unpin'],
        owner: true
    },
    profile: {
        help: ['profile [user]'],
        tags: ['tools'],
        desc: ['Get mentioned user\'s WhatsApp profile information.'],
        command: ['profile']
    },
    promote: {
        help: ['promote', 'demote'].map(cmd => cmd + ' [user]'),
        tags: ['administrator'],
        desc: ['This command allows you to promote or demote participants in your group.'],
        command: ['promote', 'demote'],
        group: true,
        admin: true,
        botAdmin: true
    },
    readmore: {
        help: ['readmore [text1] + [text2]'],
        tags: ['tools'],
        desc: ['Generate ReadMore texts.'],
        command: ['readmore']
    },
    say: {
        help: ['say [text]'],
        tags: ['tools'],
        desc: ['Robot say\'s your text.'],
        command: ['say']
    },
    set: {
        help: ['set [item] [value(s)]'],
        tags: ['administrator', 'owner'],
        desc: ['Set values of robot.'],
        command: ['set']
    },
    setgpp: {
        help: ['setgpp (media)'],
        tags: ['group'],
        desc: ['Update group\'s profile picture.'],
        command: ['setgpp', 'sgp'],
        group: true,
        admin: true,
        botAdmin: true
    },
    sticker: {
        help: ['sticker (media)'],
        tags: ['sticker'],
        desc: ['Create your own WhatsApp stickers using Surena.'],
        command: ['sticker', 's']
    },
    tag: {
        help: ['tag [text]'],
        tags: ['main'],
        desc: ['Create a message that mentions all of group participants at once.'],
        command: ['tag']
    },
    textpro: {
        help: ['textpro [effect] [text]'],
        tags: ['logo'],
        desc: ['Create beautiful logos.'],
        command: ['textpro', 'tp']
    },
    tomedia: {
        help: ['tomedia (sticker)'],
        tags: ['sticker'],
        desc: ['Convert sticker into image or video.'],
        command: ['tomedia', 'tm']
    },
    translate: {
        help: ['translate [lang] [text]'],
        tags: ['tools'],
        command: ['translate', 'tr']
    },
    tts: {
        help: ['tts [lang] [text]'],
        tags: ['tools'],
        desc: ['Use Google\'s text-to-speech feature to listen to your messages instead of reading them.'],
        command: ['tts']
    },
    upload: {
        help: ['upload (media)'],
        tags: ['internet'],
        desc: ['Quickly share files with this uploader.'],
        command: ['upload', 'u']
    },
    warn: {
        help: ['warn [user]'],
        tags: ['administrator'],
        desc: ['Give warning to your group members.'],
        command: ['warn', 'w'],
        group: true,
        admin: true
    }
}

module.exports = {
    extensions,
    options
}