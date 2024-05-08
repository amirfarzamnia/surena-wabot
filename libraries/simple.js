const { default: makeWASocket, makeInMemoryStore, proto, getDevice, jidDecode, areJidsSameUser, WAMessageStubType } = require('@adiwajshing/baileys')
const { toAudio, toPTT } = require('./converter')
const fetch = require('node-fetch')
const FileType = require('file-type')
const fs = require('fs')
const path = require('path')
const pino = require('pino')
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

exports.makeWASocket = (connectionOptions, options = {}) => {
    const sock = makeWASocket(connectionOptions)

    sock.loadMessage = (messageID) => {
        return Object.entries(sock.chats).filter(([_, { messages }]) => typeof messages == 'object').find(([_, { messages }]) => Object.entries(messages).find(([key, value]) => (key == messageID || value.key?.id == messageID)))?.[1].messages?.[messageID]
    }

    sock.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        }
        else return jid
    }

    if (sock.user && sock.user.id) sock.user.jid = sock.decodeJid(sock.user.id)

    sock.chats = {}
    sock.contacts = {}

    function updateNameToDb(contacts) {
        if (!contacts) return
        for (const contact of contacts) {
            const id = sock.decodeJid(contact.id)
            if (!id) continue
            let chats = sock.contacts[id]
            if (!chats) chats = { id }
            sock.contacts[id] = {
                ...chats,
                ...({ ...contact, id, ...(id.endsWith('@g.us') ? { subject: contact.subject || chats.subject || '' } : { name: contact.notify || chats.name || chats.notify || '' })} || {})
            }
        }
    }

    sock.ev.on('contacts.upsert', updateNameToDb)
    sock.ev.on('groups.update', updateNameToDb)
    sock.ev.on('group-participants.update', async function updateParticipantsToDb({ id, participants, action }) {
        id = sock.decodeJid(id)
        if (!(id in sock.contacts)) sock.contacts[id] = { id }
        const groupMetadata = Object.assign((sock.contacts[id].metadata || {}), await sock.groupMetadata(id))
        for (let participant of participants) {
            participant = sock.decodeJid(participant)
            switch (action) {
                case 'add': {
                    if (participant == sock.user.jid) groupMetadata.readOnly = false
                    let same = (groupMetadata.participants || []).find(user => user && user.id == participant)
                    if (!same) groupMetadata.participants.push({ id, admin: null })
                }
                break
                case 'remove': {
                    if (participant == sock.user.jid) groupMetadata.readOnly = true
                    let same = (groupMetadata.participants || []).find(user => user && user.id == participant)
                    if (same) {
                        let index = groupMetadata.participants.indexOf(same)
                        if (index !== -1) groupMetadata.participants.splice(index, 1)
                    }
                }
                break
            }
        }
        sock.contacts[id] = {
            ...sock.contacts[id],
            subject: groupMetadata.subject,
            desc: groupMetadata.desc,
            metadata: groupMetadata
        }
    })
    sock.ev.on('groups.update', function groupUpdatePushToDb(groupsUpdates) {
        for (const update of groupsUpdates) {
            const id = sock.decodeJid(update.id)
            if (!id) continue
            if (!(id in sock.contacts)) sock.contacts[id] = { id }
            if (!sock.contacts[id].metadata) sock.contacts[id].metadata = {}
            const subject = update.subject
            if (subject) sock.contacts[id].subject = subject
            const announce = update.announce
            if (announce) sock.contacts[id].metadata.announce = announce
        }
    })
    sock.ev.on('presence.update', function presenceUpdatePushToDb({ id, presences }) {
        let sender = Object.keys(presences)[0] || id
        let _sender = sock.decodeJid(sender)
        let presence = presences[sender]['lastKnownPresence'] || 'composing'
        if (!(_sender in sock.contacts)) sock.contacts[_sender] = {}
        sock.contacts[_sender].presences = presence
    })

    sock.getFile = async (input) => {
        let res, filename
        const data = Buffer.isBuffer(input.path) ? input.path : /^data:.*?\/.*?;base64,/i.test(input.path) ? Buffer.from(input.path.split`,`[1], 'base64') : /^https?:\/\//.test(input.path) ? await (res = await fetch(input.path)).buffer() : fs.existsSync(input.path) ? (filename = input.path, fs.readFileSync(input.path)) : typeof input.path == 'string' ? input.path : Buffer.alloc(0)
        if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
        const type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' }
        if (data && input.asFileName && !filename) {
            filename = path.join(__dirname, `../tmp/${1 * new Date}.${type.ext}`)
            await fs.promises.writeFile(filename, data)
        }
        return { res, filename, ...type, data }
    }

    sock.sendFile = async (input) => {
        const type = await sock.getFile({ path: input.file, asFileName: true })
        let { res, data: file, filename: pathFile } = type
        if (res?.status != 200 || file.length <= 65536) try { throw { json: JSON.parse(file.toString()) }} catch(e) { if (e.json) throw e.json }
        let mtype = '', mimetype = type.mime
        if (/webp/.test(type.mime)) mtype = 'sticker'
        else if (/image/.test(type.mime)) mtype = 'image'
        else if (/video/.test(type.mime)) mtype = 'video'
        else if (/audio/.test(type.mime)) {
            convert = await (input.ptt ? toPTT : toAudio)(file, type.ext)
            file = convert.data
            pathFile = convert.filename
            mtype = 'audio'
            mimetype = 'audio/ogg; codecs=opus'
        }
        else mtype = 'document'
        return await sock.sendMessage(input.chat, {
            contextInfo: global.contextInfo || null,
            caption: input.caption || null,
            ptt: input.ptt || false,
            [mtype]: { url: pathFile },
            mimetype
        }, {
            ephemeralExpiration: input.ephemeral || null,
            filename: input.filename || null,
            quoted: input.quoted || null
        })
    }

    sock.reply = async (input) => {
        return sock.sendMessage(input.chat, {
            text: input.caption || '',
            mentions: await sock.parseMention(input.caption || ''),
        }, {
            quoted: input.quoted || null,
            ephemeralExpiration: input.ephemeral || null
        })
    }

    sock.sendText = async (input) => {
        return sock.sendMessage(input.chat, {
            text: input.text || '',
            mentions: await sock.parseMention(input.text || '')
        }, {
            quoted: input.quoted || null,
            ephemeralExpiration: input.ephemeral || null
        })
    }

    sock.react = async (input) => {
        return sock.sendMessage(input.chat, {
            react: {
                text: input.text,
                key: input.key
            }
        })
    }

    sock.sendSticker = async (input) => {
        sock.sendMessage(input.chat, {
            sticker: input.sticker
        }, {
            quoted: input.quoted || null,
            ephemeralExpiration: input.ephemeral || null,
            mimetype: 'image/webp'
        })
    }

    sock.cMod = async (jid, message, text = '', sender = sock.user.jid, options = {}) => {
        if (options.mentions && !Array.isArray(options.mentions)) options.mentions = [options.mentions]
        let copy = message.toJSON()
        delete copy.message.messageContextInfo
        delete copy.message.senderKeyDistributionMessage
        let mtype = Object.keys(copy.message)[0]
        let msg = copy.message
        let content = msg[mtype]
        if (typeof content === 'string') msg[mtype] = text || content
        else if (content.caption) content.caption = text || content.caption
        else if (content.text) content.text = text || content.text
        if (typeof content !== 'string') {
            msg[mtype] = { ...content, ...options }
            msg[mtype].contextInfo = {
                ...(content.contextInfo || {}),
                mentionedJid: options.mentions || content.contextInfo?.mentionedJid || []
            }
        }
        if (copy.participant) sender = copy.participant = sender || copy.participant
        else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
        if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
        else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
        copy.key.remoteJid = jid
        copy.key.fromMe = areJidsSameUser(sender, sock.user.id) || false
        return proto.WebMessageInfo.fromObject(copy)
    }

    sock.parseMention = async (text = '') => {
        return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(contact => contact[1] + '@s.whatsapp.net')
    }

    sock.saveName = async (id, name = '') => {
        const isGroup = id.endsWith('@g.us')
        if (id in sock.contacts && sock.contacts[id][isGroup ? 'subject' : 'name'] && id in sock.chats) return
        let metadata = {}
        if (isGroup) metadata = await sock.groupMetadata(id)
        const chat = { ...(sock.contacts[id] || {}), id, ...(isGroup ? { subject: metadata.subject, desc: metadata.desc } : { name }) }
        sock.contacts[id] = chat
        sock.chats[id] = chat
    }

    sock.getName = (jid) => {
        if (jid.endsWith('@g.us')) return new Promise(async (resolve) => {
            resolve((await sock.groupMetadata(jid)).subject)
        })
        else return areJidsSameUser(jid, sock.user.id) ? sock.user.name : (sock.chats[jid]?.name || jid.split('@')[0])
    }

    sock.processMessageStubType = async(m) => {
        if (!m.messageStubType) return
        const chat = sock.decodeJid(m.key.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || '')
        if (!chat || chat === 'status@broadcast') return
        const emitGroupUpdate = (update) => {
            sock.ev.emit('groups.update', [{ id: chat, ...update }])
        }
        switch (m.messageStubType) {
            case WAMessageStubType.REVOKE:
            case WAMessageStubType.GROUP_CHANGE_INVITE_LINK:
            emitGroupUpdate({ revoke: m.messageStubParameters[0] })
            break
            case WAMessageStubType.GROUP_CHANGE_ICON:
            emitGroupUpdate({ icon: m.messageStubParameters[0] })
            break
        }
        const isGroup = chat.endsWith('@g.us')
        if (!isGroup) return
        const chats = sock.chats[chat]
        if (!chats) chats = sock.chats[chat] = { id: chat }
        chats.isChats = true
        const metadata = await sock.groupMetadata(chat).catch(() => null)
        if (!metadata) return
        chats.subject = metadata.subject
        chats.metadata = metadata
    }

    sock.insertAllGroup = async () => {
        const groups = await sock.groupFetchAllParticipating().catch(() => null) || {}
        for (const group in groups) sock.chats[group] = { ...(sock.chats[group] || {}), id: group, subject: groups[group].subject, isChats: true, metadata: groups[group] }
        return sock.chats
    }

    sock.pushMessage = async (m) => {
        if (!Array.isArray(m)) m = [m]
        for (const message of m) {
            try {
                if (!message) continue
                if (message.messageStubType && message.messageStubType != WAMessageStubType.CIPHERTEXT) sock.processMessageStubType(message).catch((e) => console.error(e))
                const _mtype = Object.keys(message.message || {})
                const mtype = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(_mtype[0]) && _mtype[0]) ||
                (_mtype.length >= 3 && _mtype[1] !== 'messageContextInfo' && _mtype[1]) ||
                _mtype[_mtype.length - 1]
                const chat = sock.decodeJid(message.key.remoteJid || message.message?.senderKeyDistributionMessage?.groupId || '')
                if (message.message?.[mtype]?.contextInfo?.quotedMessage) {
                    let context = message.message[mtype].contextInfo
                    let participant = sock.decodeJid(context.participant)
                    const remoteJid = sock.decodeJid(context.remoteJid || participant)
                    let quoted = message.message[mtype].contextInfo.quotedMessage
                    if ((remoteJid && remoteJid !== 'status@broadcast') && quoted) {
                        let qMtype = Object.keys(quoted)[0]
                        if (qMtype == 'conversation') {
                            quoted.extendedTextMessage = { text: quoted[qMtype] }
                            delete quoted.conversation
                            qMtype = 'extendedTextMessage'
                        }
                        if (!quoted[qMtype].contextInfo) quoted[qMtype].contextInfo = {}
                        quoted[qMtype].contextInfo.mentionedJid = context.mentionedJid || quoted[qMtype].contextInfo.mentionedJid || []
                        const isGroup = remoteJid.endsWith('g.us')
                        if (isGroup && !participant) participant = remoteJid
                        const qM = {
                            key: {
                                remoteJid,
                                fromMe: areJidsSameUser(sock.user.jid, remoteJid),
                                id: context.stanzaId,
                                participant,
                            }, message: JSON.parse(JSON.stringify(quoted)), ...(isGroup ? { participant } : {})
                        }
                        let qChats = sock.chats[participant]
                        if (!qChats) qChats = sock.chats[participant] = { id: participant, isChats: !isGroup }
                        if (!qChats.messages) qChats.messages = {}
                        if (!qChats.messages[context.stanzaId] && !qM.key.fromMe) qChats.messages[context.stanzaId] = qM
                        let qChatsMessages
                        if ((qChatsMessages = Object.entries(qChats.messages)).length > 40) qChats.messages = Object.fromEntries(qChatsMessages.slice(30, qChatsMessages.length))
                    }
                }
                if (!chat || chat === 'status@broadcast') continue
                const isGroup = chat.endsWith('@g.us')
                let chats = sock.chats[chat]
                if (!chats) {
                    if (isGroup) await sock.insertAllGroup().catch((e) => console.error(e))
                    chats = sock.chats[chat] = { id: chat, isChats: true, ...(sock.chats[chat] || {}) }
                }
                let metadata, sender
                if (isGroup) {
                    if (!chats.subject || !chats.metadata) {
                        metadata = await sock.groupMetadata(chat).catch(() => {}) || {}
                        if (!chats.subject) chats.subject = metadata.subject || ''
                        if (!chats.metadata) chats.metadata = metadata
                    }
                    sender = sock.decodeJid(message.key?.fromMe && sock.user.id || message.participant || message.key?.participant || chat || '')
                    if (sender !== chat) {
                        let chats = sock.chats[sender]
                        if (!chats) chats = sock.chats[sender] = { id: sender }
                        if (!chats.name) chats.name = message.pushName || chats.name || ''
                    }
                } else if (!chats.name) chats.name = message.pushName || chats.name || ''
                if (['senderKeyDistributionMessage', 'messageContextInfo'].includes(mtype)) continue
                chats.isChats = true
                if (!chats.messages) chats.messages = {}
                const fromMe = message.key.fromMe || areJidsSameUser(sender || chat, sock.user.id)
                if (!['protocolMessage'].includes(mtype) && !fromMe && message.messageStubType != WAMessageStubType.CIPHERTEXT && message.message) {
                    delete message.message.messageContextInfo
                    delete message.message.senderKeyDistributionMessage
                    chats.messages[message.key.id] = JSON.parse(JSON.stringify(message, null, 2))
                    let chatsMessages
                    if ((chatsMessages = Object.entries(chats.messages)).length > 40) chats.messages = Object.fromEntries(chatsMessages.slice(30, chatsMessages.length))
                }
            } catch {}
        }
    }

    sock.textSwitch = async (text, m, send) => {
        text = text
        .replace(/{tag}/g, '@' + m.sender.split('@')[0])
        .replace(/{sender}/g, m.sender.split('@')[0])
        .replace(/{sendername}/g, await sock.getName(m.sender))
        .replace(/{senderstat}/g, (await sock.fetchStatus(m.sender)).status)
        .replace(/{senderstat date}/g, (await sock.fetchStatus(m.sender)).setAt)
        .replace(/{gname}/g, await sock.getName(m.chat))
        .replace(/{gdesc}/g, m.isGroup ? (await sock.groupMetadata(m.chat)).desc : '')
        .replace(/{glink}/g, m.isGroup ? 'https://chat.whatsapp.com/' + await sock.groupInviteCode(m.chat) : '')
        .replace(/{date}/g, (new Date).toLocaleDateString('us', { day: 'numeric', month: 'numeric', year: 'numeric' }))
        .replace(/{readmore}/g, String.fromCharCode(8206).repeat(3075))
        if (send) {
            const image = /{image (.*?)}/.exec(text)
            const video = /{video (.*?)}/.exec(text)
            const react = /{react (.*?)}/.exec(text)
            text = text
            .replace(/{image (.*?)}/g, '')
            .replace(/{video (.*?)}/g, '')
            .replace(/{react (.*?)}/g, '')
            if (react) sock.react({ chat: m.chat, text: react[1], key: m.key })
            if (image || video) {
                let file = image ? image[1] : video[1]
                if (file == 'pp') file = await sock.profilePictureUrl(m.sender, 'image').catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png')
                sock.sendFile({ chat: m.chat, file, caption: text, quoted: m }).catch(() => {
                    m.reply(`${image ? 'Image' : 'Video'} URL (${file}) is invalid!`)
                })
            }
            else m.reply(text)
        }
        else return text
    }

    sock.failMsg = async (type, m) => {
        const msg = {
            owner: 'Sorry, this feature is only available to owners.',
            group: 'This feature can only be used in groups.',
            private: 'This feature can only be used in private chats.',
            admin: 'Sorry, this feature is only available to administrators.',
            botAdmin: 'To use this feature, the bot must be an admin.'
        }[type]
        return m.reply(`\`\`\`Restricted: ${msg}\`\`\``)
    }

    sock.clockString = (ms) => {
        let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
        let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
        let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
        return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
    }

    sock.getDevice = (id) => {
        return getDevice(id)
    }

    sock.serializeM = (m) => {
        return exports.smsg(sock, m)
    }

    Object.defineProperty(sock, 'name', {
        value: { ...(options.chats || {}) },
        configurable: true,
    })

    if (sock.user?.id) sock.user.jid = sock.decodeJid(sock.user.id)
    store.bind(sock.ev)
    return sock
}

exports.smsg = (sock, m) => {
    if (!m) return m
    let M = proto.WebMessageInfo
    m = M.fromObject(m)
    if (m.key) {
        m.id = m.key.id
        m.isRobot = m.id && m.id.length === 16 || m.id.startsWith('3EB0') && m.id.length === 12 || false
        m.chat = sock.decodeJid(m.key.remoteJid || message.message?.senderKeyDistributionMessage?.groupId || '')
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = sock.decodeJid(m.key.fromMe && sock.user.id || m.participant || m.key.participant || m.chat || '')
        m.fromMe = m.key.fromMe || areJidsSameUser(m.sender, sock.user.id)
    }
    if (m.message) {
        let mtype = Object.keys(m.message)
        m.mtype = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(mtype[0]) && mtype[0]) || (mtype.length >= 3 && mtype[1] !== 'messageContextInfo' && mtype[1]) || mtype[mtype.length - 1]
        m.msg = m.message[m.mtype]
        if (m.chat == 'status@broadcast' && ['protocolMessage', 'senderKeyDistributionMessage'].includes(m.mtype)) m.chat = (m.key.remoteJid !== 'status@broadcast' && m.key.remoteJid) || m.sender
        if (m.mtype == 'protocolMessage' && m.msg.key) {
            if (m.msg.key.remoteJid == 'status@broadcast') m.msg.key.remoteJid = m.chat
            if (!m.msg.key.participant || m.msg.key.participant == 'status_me') m.msg.key.participant = m.sender
            m.msg.key.fromMe = sock.decodeJid(m.msg.key.participant) === sock.decodeJid(sock.user.id)
            if (!m.msg.key.fromMe && m.msg.key.remoteJid === sock.decodeJid(sock.user.id)) m.msg.key.remoteJid = m.sender
        }
        m.text = m.msg.text || m.msg.caption || m.msg.contentText || m.msg || ''
        if (typeof m.text !== 'string') {
            if (['protocolMessage', 'messageContextInfo', 'stickerMessage', 'audioMessage', 'senderKeyDistributionMessage'].includes(m.mtype)) m.text = ''
            else m.text = m.text.selectedDisplayText || m.text.hydratedTemplate?.hydratedContentText || m.text
        }
        m.mentionedJid = m.msg?.contextInfo?.mentionedJid?.length && m.msg.contextInfo.mentionedJid || []
        let quoted = m.quoted = m.msg?.contextInfo?.quotedMessage ? m.msg.contextInfo.quotedMessage : null
        if (m.quoted) {
            let type = Object.keys(m.quoted)[0]
            m.quoted = m.quoted[type]
            if (typeof m.quoted == 'string') m.quoted = { text: m.quoted }
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
            m.quoted.chat = sock.decodeJid(m.msg.contextInfo.remoteJid || m.chat || m.sender)
            m.quoted.isRobot = m.quoted.id && m.quoted.id.length == 16 || false
            m.quoted.sender = sock.decodeJid(m.msg.contextInfo.participant)
            m.quoted.fromMe = m.quoted.sender == sock.user.jid
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.contentText || ''
            m.quoted.name = sock.getName(m.quoted.sender)
            m.quoted.mentionedJid = m.quoted.contextInfo?.mentionedJid?.length && m.quoted.contextInfo.mentionedJid || []
            let vM = m.quoted.obj = M.fromObject({
                key: {
                    fromMe: m.quoted.fromMe,
                    remoteJid: m.quoted.chat,
                    id: m.quoted.id
                }, message: quoted, ...(m.isGroup ? { participant: m.quoted.sender } : {})
            })
            m.QuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) return null
                let q = M.fromObject(await sock.loadMessage(m.quoted.id) || vM)
                return exports.smsg(sock, q)
            }
            m.quoted.reply = (text) => sock.reply({ chat: m.chat, caption: text, quoted: vM })
        }
    }
    m.name = !nullish(m.pushName) && m.pushName || sock.getName(m.sender)

    m.reply = (text) => sock.reply({ chat: m.chat, caption: text, quoted: m })

    try {
        sock.saveName(m.sender, m.name)
        sock.pushMessage(m)
        if (m.isGroup) sock.saveName(m.chat)
        if (m.msg && m.mtype == 'protocolMessage') sock.ev.emit('message.delete', m.msg.key)
    } catch (e) { console.error(e) }
    return m
}

function nullish(args) {
    return !(args !== null && args !== undefined)
}