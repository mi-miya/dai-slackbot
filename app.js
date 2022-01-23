require('dotenv').config()
const { TextFixEngine } = require('textlint')
const path = require('path')
const { App } = require('@slack/bolt')

const formatResults = (results) => {
  const messages = results[0].messages
  let output = ''

  messages.forEach((message) => {
    let severity = ''
    if (message.fatal || message.severity === 2) {
      severity = 'error'
    } else {
      severity = 'warning'
    }
    output += `[${message.line}:${message.column} ${severity}] ${message.message}\n`
  })
  return '```\n' + `${output}` + '```\n'
}

// アプリ初期化
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
})

// textlint初期化
const engine = new TextFixEngine({
  configFile: path.join(__dirname, 'config/.textlintrc'),
})

app.event('app_mention', async ({ event, say }) => {
  let blocks = []
  blocks.push(
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '文書チェックが完了しました:tada:',
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*文書のチェック結果:*',
      }
    }
  )
  try {
    const regex = /^<@(.+?)>/g // メンションの削除
    const replaceText = event.text.replace(regex, '')
    const fixResults = await engine.executeOnText(replaceText)

    if (replaceText.length === 0) {
      blocks.push(
        {
          type: 'section',
          text: { type: 'mrkdwn', text: 'おや？テキストの指定が無いですね。' }
        }
      )
    } else if (engine.isErrorResults(fixResults)) {
      blocks.push(
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*文章に不備が見つかりました:*smiling_face_with_tear:',
          },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: formatResults(fixResults) },
        },
        // {
        //   type: 'section',
        //   text: {
        //     type: 'mrkdwn',
        //     text: '*自動修正文書の提案:*',
        //   },
        // },
        // {
        //   type: 'section',
        //   text: {
        //     type: 'mrkdwn',
        //     text: fixResults[0].output,
        //   },
        // }
      )
    } else {
      blocks.push(
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '入力された文書にエラーは見つかりませんでした:+1:' },
        }
      )
    }
    await say({
      blocks
    })
  } catch (error) {
    throw console.log(error)
  }
})

;(async () => {
  await app.start(process.env.PORT || 3000)
  console.log('⚡️ Bolt app is running!')
})()
