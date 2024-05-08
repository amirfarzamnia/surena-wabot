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

const { extensions, options } = require('./extensions')
const util = require('util')
const isNumber = (number) => typeof number == 'number' && !isNaN(number)

module.exports = {
    async handler(chatUpdate) {
        const m = this.serializeM(chatUpdate.messages[chatUpdate.messages.length - 1])
        if (!global.db.data[this.user.jid]) {
            global.db.data[this.user.jid] = {
                users: {},
                chats: {},
                stats: {},
                settings: {}
            }
        }
        try {

            /**
             * Database Settings
             *
             * This section of the code sets the values for the database configuration.
             * It is important to configure the database correctly to ensure the bot can
             * store and retrieve data as needed.
             */

            const user = global.db.data[this.user.jid].users[m.sender]
            if (typeof user != 'object') global.db.data[this.user.jid].users[m.sender] = {}
            if (user) {}
            else global.db.data[this.user.jid].users[m.sender] = {}

            if (m.isGroup) {
                const chat = global.db.data[this.user.jid].chats[m.chat]
                if (typeof chat != 'object') global.db.data[this.user.jid].chats[m.chat] = {}
                if (chat) {
                    if (!('welcome' in chat)) chat.welcome = false
                    if (!('detect' in chat)) chat.detect = false
                    if (!('numban' in chat)) chat.numban = false
                    if (!('antiLink' in chat)) chat.antiLink = false
                    if (!('autoread' in chat)) chat.autoread = false
                    if (!('users' in chat)) chat.users = {}
                    if (!('values' in chat)) chat.values = {}
                }
                else global.db.data[this.user.jid].chats[m.chat] = {
                    welcome: false,
                    detect: false,
                    numban: false,
                    antiLink: false,
                    autoread: false,
                    users: {},
                    values: {}
                }
                if (Object.keys(chat.users).length == 0) {
                    const metadata = await this.groupMetadata(m.chat)
                    metadata.participants.forEach(participant => {
                        chat.users[participant.id] = {
                            warning: 0
                        }
                    })
                }
                if (m.sender in chat.users) {
                    if (!('warning' in chat.users[m.sender])) chat.users[m.sender].warning = 0
                }
                else chat.users[m.sender] = {
                    warning: 0
                }
            }

            const settings = global.db.data[this.user.jid].settings
            if (typeof settings != 'object') global.db.data[this.user.jid].settings = {}
            if (settings) {
                if (!('public' in settings)) settings.public = false
                if (!('groupOnly' in settings)) settings.groupOnly = false
                if (!('values' in settings)) settings.values = {}
            }
            else global.db.data[this.user.jid].settings = {
                public: false,
                groupOnly: false,
                values: {}
            }

            /**
             * Definitions
             *
             * This section of the code defines various variables and data structures that will
             * be used throughout the bot. This includes owners, group metadata, and other important
             * data that needs to be accessible to the bot in order to function properly.
             */

            const owners = global.db.data[this.user.jid].settings?.values?.owners ?? [this.user.jid]
            const groupMetadata = m.isGroup ? await this.groupMetadata(m.chat) : null
            const participants = m.isGroup ? groupMetadata.participants : null
            const isAdmin = m.isGroup ? participants.find((participant) => this.decodeJid(participant.id) == m.sender).admin : false
            const isBotAdmin = m.isGroup ? participants.find((participant) => this.decodeJid(participant.id) == this.user.jid).admin : false
            const isOwner = owners.includes(m.sender) || m.fromMe

            /**
             * Systems
             *
             * This section of the code contains various systems that the bot uses to manage
             * its behavior. This includes systems such as anti-link protection, automatic read
             * receipts, and other important features that help the bot operate smoothly.
             */

            if (m.isGroup && global.db.data[this.user.jid].chats[m.chat].antiLink && /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i.exec(m.text) && !isAdmin && !m.fromMe) {
                for (const link of m.text.match(/chat.whatsapp.com\/([0-9A-Za-z]{20,24})/gi)) {
                    if (link.includes(await this.groupInviteCode(m.chat))) continue
                    const GroupInfo = await this.groupGetInviteInfo(link.split('chat.whatsapp.com/')[1]).catch(() => null)
                    if (!GroupInfo) continue
                    if (!isBotAdmin) throw '*「 ANTI LINK 」*\n\nGroup link detected, but I am not an admin, so the action has been rejected.'
                    await this.sendMessage(m.chat, { text: '*「 ANTI LINK 」*\n\nGroup link detected! You will be removed from this group.' }, {
                        quoted: { key: { participant: m.sender }, message: { conversation: '🚫 Group Link' }}
                    })
                    await this.sendMessage(m.chat, { delete: m.key })
                    await this.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
                    break
                }
            }

            if (!m.isGroup && global.db.data[this.user.jid].settings.groupOnly && !m.fromMe) return

            if (m.isGroup && global.db.data[this.user.jid].chats[m.chat].autoread) {
                await this.readMessages([{ remoteJid: m.chat, id: m.key.id, participant: m.sender }])
            }

            if (!global.db.data[this.user.jid].settings.public && !isOwner) return

            /**
             * Extension Check
             *
             * This section of the code checks whether a message is attempting to call an
             * extension. If an extension is called, the bot will execute the requested
             * extension and perform the desired action.
             */

            for (const extension of Object.values(extensions)) {
                const data = options[extension.name]
                const prefixes = new RegExp(`^[${(global.db.data[this.user.jid].settings?.values?.prefixes ?? '/!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&')}]`)
                const usedPrefix = prefixes.exec(m.text)

                let [command, ...args] = m.text.replace(usedPrefix, '').split(' ')
                command = command.toLowerCase()

                if (!data.command.some((cmd) => cmd == command)) continue
                m.extension = extension.name
                const text = args.join(' ')

                if (data.owner && !isOwner) {
                    this.failMsg('owner', m)
                    continue
                }
                if (data.group && !m.isGroup) {
                    this.failMsg('group', m)
                    continue
                }
                if (data.private && m.isGroup) {
                    this.failMsg('private', m)
                    continue
                }
                if (data.admin && !isAdmin) {
                    this.failMsg('admin', m)
                    continue
                }
                if (data.botAdmin && !isBotAdmin) {
                    this.failMsg('botAdmin', m)
                    continue
                }

                try {
                    await extension.call(this, m, {
                        owners,
                        groupMetadata,
                        participants,
                        isAdmin,
                        isBotAdmin,
                        isOwner,
                        usedPrefix,
                        command,
                        args,
                        text,
                        sock: this,
                        extensions: Object.values(extensions),
                        extensionsdata: options
                    })
                } catch(e) {
                    m.error = e
                    const message = util.format(e)
                    if (e.name) {
                        m.bug = true
                        for (const jid of owners.filter((owner) => owner != m.sender)) {
                            const owner = (await this.onWhatsApp(jid))[0]
                            if (owner) m.reply(`*Extension:* ${m.extension}\n*Sender:* @${m.sender.split('@')[0]}\n*Chat:* ${m.chat}\n*Chat Name:* ${await this.getName(m.chat)}\n*Command:* ${usedPrefix}${command} ${text}\n\n\`\`\`${message}\`\`\``, owner.jid, { mentions: [m.sender] })
                        }
                    }
                    m.reply(`\`\`\`${message}\`\`\``)
                }
            }
        } catch {} finally {

            /**
             * Extension History
             *
             * This section of the code sets a history of the extensions that have been used
             * by the bot. This allows the bot to keep track of which extensions have been
             * executed and when, and can be useful for debugging purposes or for monitoring
             * the bot's activity.
             */

            if (m.extension) {
                const stats = global.db.data[this.user.jid].stats
                const now = + new Date
                if (m.extension in stats) {
                    const stat = stats[m.extension]
                    if (!isNumber(stat.total)) stat.total = 1
                    else stat.total ++
                    if (!isNumber(stat.last)) stat.last = now
                    else stat.last = now
                    if (!isNumber(stat.success)) stat.success = m.error ? 0 : 1
                    else if (!m.error) stat.success ++
                    if (!isNumber(stat.lastSuccess)) stat.lastSuccess = m.error ? 0 : now
                    else if (!m.error) stat.lastSuccess = now
                    if (!isNumber(stat.bugs)) stat.bugs = m.bug ? 1 : 0
                    else if (m.bug) stat.bugs ++
                    if (!isNumber(stat.lastbug)) stat.lastbug = m.bug ? now : 0
                    else if (m.bug) stat.lastbug = now
                }
                else stats[m.extension] = {
                    total: 1,
                    last: now,
                    success: m.error ? 0 : 1,
                    lastSuccess: m.error ? 0 : now,
                    bugs: m.bug ? 1 : 0,
                    lastbug: m.bug ? now : 0
                }
            }

            /**
             * Global Variables
             *
             * This section of the code contains all of the editable global variables.
             * Any variables that can be modified to change the behavior of the bot are
             * included here.
             *
             * @note - Rest of the global variables do not need to be changed.
             */

            global.contextInfo = {
                // forwardingScore: 9999,
                // isForwarded: true,
                externalAdReply: {
                    title: 'Surena WhatsApp bot',
                    // body: global.db.data[this.user.jid].settings?.values?.botname ?? 'Surena',
                    // previewType: 'PHOTO',
                    sourceUrl: m.sender.startsWith('98') ? 'https://chat.whatsapp.com/CSXb2AMYk2xJFunWneaiMa' : 'https://chat.whatsapp.com/JlPeRbssqcdILgreqcYBR8',
                    // thumbnail: await (await fetch(pp)).buffer(),
                }
            }
        }
        global.db.write()
    },

    /**
     * Participants Update
     *
     * This section of the code handles events related to changes in participants of a group,
     * such as when a user is added or removed, or when a user is promoted or demoted in the group.
     */

    async participantsUpdate({ id, participants, action }) {
        const chat = global.db.data[this.user.jid].chats[id] || {}
        switch (action) {
            case 'add':
                if (chat.numban) {
                    for (const participant of participants) {
                        const bannedNumbers = chat?.values?.numban ?? null
                        if (bannedNumbers) {
                            for (const number of bannedNumbers) {
                                if (participant.startsWith(number) || (number.startsWith('!') && !participant.startsWith(number.slice(1)))) {
                                    await this.sendText({ chat: id, text: `*${participant.split`@`[0]}!*\n\nYour phone number is not allowed in this group because the admin has enabled the numban feature and added your phone number to the banned list. As a result, you will be removed from this group.` })
                                    await this.groupParticipantsUpdate(id, [participant], 'remove')
                                    break
                                }
                            }
                        }
                        else break
                    }
                }
            case 'remove':
                if (chat.welcome) {
                    for (const participant of participants) {
                        let text = (action == 'add' ? (chat?.values?.msgWelcome ?? 'Hi {tag}! Welcome to {gname}. {image pp}') : (chat?.values?.msgBye ?? 'Goodbye {tag}! {image pp}'))
                        const image = /{image (.*?)}/.exec(text)
                        const video = /{video (.*?)}/.exec(text)

                        text = text
                        .replace(/{tag}/g, '@' + participant.split('@')[0])
                        .replace(/{user}/g, await this.getName(participant))
                        .replace(/{userstat}/g, (await this.fetchStatus(participant)).status)
                        .replace(/{gname}/g, await this.getName(id))
                        .replace(/{gdesc}/g, (await this.groupMetadata(id)).desc)
                        .replace(/{glink}/g, 'https://chat.whatsapp.com/' + await this.groupInviteCode(id))
                        .replace(/{date}/g, (new Date).toLocaleDateString('us', { day: 'numeric', month: 'numeric', year: 'numeric' }))
                        .replace(/{readmore}/g, String.fromCharCode(8206).repeat(3075))
                        .replace(/{image (.*?)}/g, '')
                        .replace(/{video (.*?)}/g, '')

                        if (image || video) {
                            let file = image ? image[1] : video[1]
                            if (file == 'pp') file = await this.profilePictureUrl(participant, 'image').catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png')
                            this.sendFile({ chat: id, file, caption: text }).catch(() => {
                                this.sendText({ chat: id, text: `${image ? 'Image' : 'Video'} URL (${file}) is invalid!` })
                            })
                        }
                        else this.sendText({ chat: id, text: text })
                    }
                }
            break
            case 'promote':
            case 'demote':
                if (chat.detect) {
                    for (const participant of participants) {
                        const groupParticipant = (await this.groupMetadata(id)).participants
                        this.sendMessage(id, { text: action == 'promote' ? `*@${participant.split('@')[0]} Promoted to admin!*` : `*@${participant.split('@')[0]} Demoted to participant!*` }, {
                            mentions: groupParticipant.filter(participant => participant.admin).map(participant => participant.id)
                        })
                    }
                }
            break
        }
    },

    /**
     * Groups Update
     *
     * This section of the code activates when a group is updated.
     * For example, when the subject changes or group restrictions are activated.
     */

    async groupsUpdate(groupsUpdate) {
        for (const group of groupsUpdate) {
            const chat = global.db.data[this.user.jid].chats[group.id] || {}
            if (chat.detect) {
                let text
                if (group.subject) text = `*Group's subject has been changed to ${group.subject}.*`
                if (group.announce == true) text = '*Only admins can send messages now.*'
                if (group.announce == false) text = '*All participants can now send messages.*'
                if (group.restrict == true) text = '*Now only admins can edit group information.*'
                if (group.restrict == false) text = '*All participants can now edit group information.*'
                const groupParticipant = (await this.groupMetadata(group.id)).participants
                this.sendMessage(group.id, { text: text }, {
                    mentions: groupParticipant.filter(participant => participant.admin).map(participant => participant.id)
                })
            }
        }
    }
}