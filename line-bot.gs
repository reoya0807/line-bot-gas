// 参考にした記事
// GASでとりあえずLINE Botを動かす方法
// https://qiita.com/hakshu/items/55c2584cf82718f47464
// GASのトリガー設定
// https://qiita.com/rf_p/items/267a8d9daa8c9f1ef027
// JavaScriptの文法
// https://jsprimer.net/
// GASによるスプレッドシートの操作
// https://qiita.com/mitama/items/e5fbf8306384c26cf42f
// GASでプッシュメッセージを送る方法
// https://qiita.com/n_oshiumi/items/a1a02e03093825f41e01
// LINEにステータスコードを返す方法
// https://yacoleblog.com/172/
// Bearerの後の半角スペース
// https://teratail.com/questions/190173

const spreadsheet = SpreadsheetApp.getActiveSheet();

let users = spreadsheet.getRange('A2:A').getValues();

const ACCESS_TOKEN = 'アクセストークン';

const headers = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Authorization': 'Bearer ' + ACCESS_TOKEN,
}

let post;
let takenok = true;

const today = new Date();

// LINEに返すステータスコード
let response;

function doPost(e) {
  // ReplyToken取得
  let replyToken = JSON.parse(e.postData.contents).events[0].replyToken;

  // webhookイベントタイプ
  let type = JSON.parse(e.postData.contents).events[0].type;

  // ユーザーID、設定時間、フラグ
  let user_id = JSON.parse(e.postData.contents).events[0].source.userId;
  let settime = 22;
  let taken = 0;

  if (type == 'follow') {
    // ユーザーID、設定時間、フラグをスプレッドシート末尾行に書き込み
    let startday = new Date('2021/06/04');
    spreadsheet.appendRow([user_id, startday, settime, taken]);
  } else if (type == 'unfollow') {
    for (let i = 0; i < spreadsheet.getLastRow() - 1; i++) {
      if (users[i] == user_id) {
        spreadsheet.deleteRow(i + 2);
      }
    }
  } else if (type == 'message') {
    takenok = false;

    // webhookイベントタイプ
    let messageType = JSON.parse(e.postData.contents).events[0].message.type;
    // テキストメッセージ以外のときは何も返さず終了
    if (messageType != 'text') {
      return;
    }
    
    // メッセージ取得
    let text = JSON.parse(e.postData.contents).events[0].message.text;

    if ((text.indexOf('飲') != -1 || text.indexOf('のん') != -1 || text.indexOf('のみ') != -1) && text.indexOf('ない') == -1) {
      // POSTデータを設定
      post = JSON.stringify({
        'replyToken': replyToken,
        'messages': [{
          'type': 'text',
          'text': 'えらい！',
        }],
      });

      for (let i = 0; i < spreadsheet.getLastRow() - 1; i++) {
        if (users[i] == user_id) {
          spreadsheet.getRange(i + 2, 4).setValue(0);
        }
      }
    } else if (text.indexOf('start ') != -1) {
      let startday_text = text.slice(6);
      startday = new Date(startday_text);

      // POSTデータを設定
      let postText = '薬を飲み始めた日を' + startday_text + 'に設定しました';
      post = JSON.stringify({
        'replyToken': replyToken,
        'messages': [{
          'type': 'text',
          'text': postText,
        }],
      });
      for (let i = 0; i < spreadsheet.getLastRow() - 1; i++) {
        if (users[i] == user_id) {
          spreadsheet.getRange(i + 2, 2).setValue(startday);
        }
      }
    } else if (text.indexOf('set ') != -1) {
      settime = text.slice(4);

      // POSTデータを設定
      let postText = settime + '時に設定しました';
      post = JSON.stringify({
        'replyToken': replyToken,
        'messages': [{
          'type': 'text',
          'text': postText,
        }],
      });
      for (let i = 0; i < spreadsheet.getLastRow() - 1; i++) {
        if (users[i] == user_id) {
          spreadsheet.getRange(i + 2, 3).setValue(settime);
        }
      }
    } else if (text == 'help') {
      for (let i = 0; i < spreadsheet.getLastRow() - 1; i++) {
        if (users[i] == user_id) {
          startday = spreadsheet.getRange(i + 2, 2).getValue();
          settime = spreadsheet.getRange(i + 2, 3).getValue();
        }
      }
      // 元のstartdayを28日周期で直近にずらす処理
      startday.setDate(startday.getDate() + Math.floor((today.getTime() - startday.getTime()) / 86400000 / 28) * 28);

      // yyyy-mm-ddのフォーマットにする処理
      let startday_yyyy = String(startday.getFullYear());
      let startday_mm = String(startday.getMonth() + 1).padStart(2, '0');
      let startday_dd = String(startday.getDate()).padStart(2, '0');
      let startday_text = startday_yyyy + '/' + startday_mm + '/' + startday_dd;

      // POSTデータを設定
      let postText = '薬を飲み始めた日は' + startday_text + 'に設定されています。\n';
      postText += '薬を飲む時間は' + settime + '時に設定されています。\n\n';
      postText += '薬を飲み始めた日を変更したい場合は「start 2021/06/04」のようにしてメッセージで送信すると変更できます。\n';
      postText += 'startと日付の間に半角スペースが必要なので記入に注意してください。\n\n';
      postText += '薬を飲む時間を変更したい場合は「set 22」のようにメッセージで送信すると変更できます。\n';
      postText += 'setと時間の間に半角スペースが必要なので記入に注意してください。\n\n';
      postText += '設定の変更に成功すると、完了メッセージが送信されます。メッセージが送られてこない場合は、記入に誤りがある可能性があります。';
      post = JSON.stringify({
        'replyToken': replyToken,
        'messages': [{
          'type': 'text',
          'text': postText,
        }],
      });
    }
    // 応答メッセージ用のAPI URL
    let url_reply = 'https://api.line.me/v2/bot/message/reply';

    // 実行
    response = UrlFetchApp.fetch(url_reply, {
      'headers': headers,
      'method': 'post',
      'payload': post,
    });
  }
  // return response.getResponseCode();
  return;
}

function doGet() {
  // 設定時間だったらフラグをtrueにする
  for (let i = 0; i < spreadsheet.getLastRow() - 1; i++) {
    startday = spreadsheet.getRange(i + 2, 2).getValue();
    let settime = spreadsheet.getRange(i + 2, 3).getValue();

    if (Math.floor((today.getTime() - startday.getTime()) / 86400000) % 28 < 21) {
      if (today.getHours() == Number(settime) && takenok) {
        spreadsheet.getRange(i + 2, 4).setValue(1);
      }
    }
  }

  // 薬を飲んでいないユーザーにプッシュ
  for (let i = 0; i < spreadsheet.getLastRow() - 1; i++) {
    let user_id = spreadsheet.getRange(i + 2, 1).getValue();
    let taken = Number(spreadsheet.getRange(i + 2, 4).getValue());
    if (taken == 1 && takenok) {
      // POSTデータを設定
      post = JSON.stringify({
        'to': user_id,
        'messages': [{
          'type': 'text',
          'text': 'くすり飲んだー？',
        }],
      });
      // プッシュメッセージ用のAPI URL
      let url_push = 'https://api.line.me/v2/bot/message/push';

      // 実行
      response = UrlFetchApp.fetch(url_push, {
        'headers': headers,
        'method': 'post',
        'payload': post,
      });
    }
  }
  return;
}
