
const p = require('phin')

const crypto = require('crypto')
const {v4: uuidv4} = require('uuid')

let uuid = null
let key = ''

const updateKey = () => {
    key = process.env.PAPAGO_VERSION || 'v1.5.9_33e53be80f'
    uuid = uuidv4()
}

const generateAuthorization = (baseUrl) => {
    const timestamp = new Date().getTime()
    const hmac = crypto.createHmac('md5', key)
    hmac.update(`${uuid}\n${baseUrl}\n${timestamp}`)
    const token = hmac.digest('base64')
    const authorization = `PPG ${uuid}:${token}`
    return {timestamp, authorization}
}

const translate = (text, source, target) => new Promise((resolve, reject) => {
    source = source === 'zh_CN' ? 'zh-CN' : source === 'zh_TW' || source === 'zh_HK' ? 'zh-TW' : source.split('_')[0]
    target = target === 'zh_CN' ? 'zh-CN' : target === 'zh_TW' || target === 'zh_HK' ? 'zh-TW' : target.split('_')[0]
    
    const baseUrl = 'https://papago.naver.com/apis/n2mt/translate'
    
    const generateOptions = () => {
        const {timestamp, authorization} = generateAuthorization(baseUrl)
        return {
            url: baseUrl,
            method: 'POST',
            timeout: 1000,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Authorization': authorization,
                'Timestamp': timestamp,
            },
            form: {
                source, target, text,
                dict: false,
            },
        }
    }
    p(generateOptions()).then((res) => {
        if(res.statusCode === 403) {
            updateKey()
            p(generateOptions()).then(r => JSON.parse(r.body.toString()).translatedText).catch(reject)
        } else {
            resolve(JSON.parse(res.body.toString()).translatedText)
        }
    }).catch(reject)
})

updateKey()

module.exports = translate
