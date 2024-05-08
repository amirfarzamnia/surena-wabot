/**
 * Surena WhatsApp Bot Main Code
 *
 * @requires baileys npm
 * @author amirfarzamnia
 * @github https://github.com/amirfarzamnia/surenawabot
 *
 * @description
 * This is the main code used to run each bot, create bot sessions, and handle incoming and outgoing messages.
 * It also uses Express to serve web pages and respond to API requests. This code is contained in the main.js file
 * and is not accessible to anyone else. It is used solely for running the bots and is not intended for modification
 * or redistribution.
 */

const { default: makeWASocket, useMultiFileAuthState } = require('@adiwajshing/baileys')
const { Low, JSONFile } = require('./libraries/lowdb')
const { toBuffer } = require('qrcode')
const simple = require('./libraries/simple')
const handler = require('./bot/handler')
const express = require('express')
const CFonts = require('cfonts')
const chalk = require('chalk')
const path = require('path')
const P = require('pino')
const fs = require('fs')
const app = express()

// Function callers for processing user input and generating bot responses

loadBotsDB()

fs.readdir('sessions', (error, files) => {
    files.forEach((file) => {
       startBot(file.split('.')[0])
    })
})

/**
 * Express App Code
 *
 * This section of the code contains the implementation of an Express app, which is used to serve web pages
 * and respond to API requests. It defines the routes, middleware, and controllers needed to handle incoming
 * requests and send back responses. The app is used to handle authentication, data storage, and other features
 * required by the bots that run on this platform.
 */

app.listen(3060, () => {
    CFonts.say('SURENA', {
        colors: ['#1FD02C'],
        font: 'tiny',
        align: 'left'
    })
})

app.use(express.static('webpages'))
app.get('/qrcode', async (req, res) => {
    const id = makeID()
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${id}`)

    console.log(chalk.yellow(`○ Created ${id} session`))
    botRegister()

    function botRegister() {
        const sock = makeWASocket({
            printQRInTerminal: false,
            auth: state,
            logger: P({ level: 'silent'}),
            browser: ['Surena OS', 'Desktop', '3.0.1'],
            shouldSyncHistoryMessage: false,
            syncFullHistory: false,
            downloadHistory: false,
            generateHighQualityLinkPreview: true
        })

        const onUpdate = async (status) => {
            const { connection, lastDisconnect } = status
            if (status.qr) res.end(await toBuffer(status.qr))
            if (connection == 'open') {
                console.log(chalk.cyan(`○ Connected ${id} session`))
                sock.ev.off('connection.update', onUpdate)
                sock.ev.off('creds.update', saveCreds)
                sock.end()
                startBot(id)
            }
            if (connection == 'close' && lastDisconnect?.error?.output?.statusCode != (401 || 500)) {
                sock.ev.off('connection.update', onUpdate)
                botRegister()
            }
        }

        sock.ev.on('connection.update', onUpdate)
        sock.ev.on('creds.update', saveCreds)
    }
})

app.use('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'webpages/qrcode.html'))
})

// This section contains all of the functions used by the bots. No additional code is included.

async function startBot(id) {
    const directory = `sessions/${id}`
    const { state, saveCreds } = await useMultiFileAuthState(directory)
    const sock = simple.makeWASocket({
        auth: state,
        logger: P({ level: 'silent'}),
        shouldSyncHistoryMessage: false,
        syncFullHistory: false,
        downloadHistory: false,
        generateHighQualityLinkPreview: true
    })

    if (!sock.user) return rmBot(directory)
    else reloadHandler()

    async function connectionUpdate(status) {
        const { connection, lastDisconnect } = status
        if (connection == 'open') {
            console.log(chalk.green(`○ Started ${id} session:`), `(${sock.user.jid})`)

            const privacy = await this.fetchPrivacySettings()
            const file = await this.profilePictureUrl(this.user.jid, 'image').catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png')
            const readMore = String.fromCharCode(8206).repeat(3075)

            sock.bot = { id }

            fs.readdir('sessions', async (error, files) => {
                const caption = `*○ Surena Activated*\n\n┌─( *👤 Account Information* )\n│\n│ ○ *Group Chats:* ${Object.keys(await this.groupFetchAllParticipating()).length || 'Uncountable'}\n│ ○ *User Name:* ${this.user.name || 'Unknown'}\n│ ○ *Bot Version:* ${process.env.VERSION || 'Unknown'}\n└───•\n\n┌─( *🔒 Account Privacy* )\n│\n│ ○ *Read Receipts:* ${privacy.readreceipts}\n│ ○ *Profile Photo:* ${privacy.profile}\n│ ○ *Status:* ${privacy.status}\n│ ○ *Online:* ${privacy.online}\n│ ○ *Last Seen:* ${privacy.last}\n│ ○ *Groups:* ${privacy.groupadd}\n└───•\n\n┌─( *⚙️ Server Status* )\n│\n│ ○ *Server Port:* 10GB/s\n│ ○ *Server RAM:* 4GB\n│ ○ *Server CPU:* Intel Xeon\n│ ○ *Server Version:* Windows 2019\n│ ○ *Total Robots:* ${files.length}\n└───•\n${readMore}\n*○ GitHub:*\ngithub.com/amirfarzamnia/surenawabot\n*○ Tutorials:*\ngithub.com/amirfarzamnia/surenawabot/wiki\n\nYou can use commands to start using Surena. To use a command, you must first enter the selected prefix and then enter the desired command after that and send the message. For example, here are some commands and custom prefixes:\n\n*○ 👉 /menu*\n*○ 👉 !alive*\n*○ 👉 ?say hello world*\n*○ 👉 .tts en hello world*`
                this.sendFile({ chat: this.user.jid, file, caption })
            })
        }
        if (lastDisconnect?.error?.output) {
            if (lastDisconnect.error.output.statusCode == (401 || 500)) return rmBot(directory)
            else reloadHandler()
        }
    }

    function rmBot(directory) {
        fs.rm(directory, { recursive: true }, () => {
            console.log(chalk.red(`○ Removed ${id} session`))
        })
    }

    function reloadHandler() {
        sock.ev.on('messages.upsert', handler.handler.bind(sock))
        sock.ev.on('group-participants.update', handler.participantsUpdate.bind(sock))
        sock.ev.on('groups.update', handler.groupsUpdate.bind(sock))
        sock.ev.on('connection.update', connectionUpdate.bind(sock))
        sock.ev.on('creds.update', saveCreds)
    }
}

function makeID() {
    let result = ''
    for (let i = 0; i < 15; i++) result += ('abcdefghijklmnopqrstuvwxyz').charAt(Math.floor(Math.random() * 26))
    if (fs.existsSync(`sessions/${result}`)) return makeID()
    return result
}

async function loadBotsDB() {
    global.db = new Low(new JSONFile('databases/botsDB.json'))
    await global.db.read()
    if (!global.db.data) {
        global.db.data = {}
        global.db.write()
    }
}