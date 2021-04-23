
require('dotenv').config()

const Discord = require('discord.js')
const emojiFlags = require('emoji-flags')

const client = new Discord.Client()

const google = require('./translators/google-translator.js')
const papago = require('./translators/papago-translator.js')

const modes = {
    "google": google,
    "papago": papago,
}

let history = {}

client.on('ready', () => {
    console.log('Logged in as ' + client.user.tag)
})

client.on('message', (msg) => {
    if(msg.author === client.user) return
    if(msg.cleanContent.startsWith('^')) return
    translateMessage(msg).then((result) => {
        sendEditableMessage(msg, result)
    })
})

client.on('messageUpdate', (oldMsg, newMsg) => {
    const key = getHistoryKey(oldMsg)
    if(history[key]) {
        translateMessage(newMsg).then((result) => {
            oldMsg.channel.fetchMessage(history[key]).then(msg => msg.edit(result))
        })
    }
})

client.on('messageDelete', (msg) => {
    const key = getHistoryKey(msg)
    if(history[key]) {
        msg.channel.fetchMessage(history[key]).then(msg => msg.delete())
    }
})

client.login(process.env.TOKEN)

const parseConfig = (configText) => (configText || '').split('\n').filter((line) => line.startsWith('@tr ')).map((line) => line.slice(4).split(' '))

const translateMessage = async (msg) => {
    const configs = parseConfig(msg.channel.topic)
    const content = msg.cleanContent
    const translatedMessages = await Promise.all(configs.map(async ([target, mode]) => {
        return [target, await modes[mode](content, 'auto', target)]
    }))
    const filtered = translatedMessages.filter((entry) => entry && entry[1] && entry[1] != content)
    if(!filtered.length) return ''
    return formatMessage(filtered)
}

const formatMessage = (translatedMessages) => {
    return translatedMessages.map((entry) => emojiFlags.countryCode(entry[0].split('_')[1]).emoji + ' ' + entry[1]).join(' ')
}

const sendEditableMessage = (msg, text) => {
    if(!text) return
    msg.channel.send(text).then(sent => {
        const key = getHistoryKey(msg)
        history[key] = sent.id
        setTimeout(() => {
            delete history[key]
        }, 5*60*1000)
    })
}

const getHistoryKey = (msg) => msg.guild.id + '/' + msg.channel.id + '/' + msg.id
