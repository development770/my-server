const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const B_DOMAIN = 'https://good-fudousan.cybozu.com';
const B_APP_ID = 1129;
const API_TOKEN = process.env.B_API_TOKEN; // 環境変数で管理

app.post('/send-to-b', async (req, res) => {
  const data = req.body;
  if (!data.contractNo) return res.status(400).json({ error: '契約NOがありません' });

  try {
    // B側レコード検索
    const searchResp = await fetch(`${B_DOMAIN}/k/v1/records.json`, {
      method: 'POST',
      headers: {
        'X-Cybozu-API-Token': API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ app: B_APP_ID, query: `契約NO = "${data.contractNo}" limit 1` })
    });
    const searchData = await searchResp.json();

    if (!searchData.records || searchData.records.length === 0) {
      return res.status(404).json({ error: 'B社に契約NOが見つかりません' });
    }

    const recId = searchData.records[0].$id.value;

    const updateBody = {
      app: B_APP_ID,
      id: recId,
      record: {
        受付方法: { value: data.受付方法 || '' },
        解約日: { value: data.解約日 || '' },
        契約者解約時連絡先: { value: data.電話番号_個人 || '' },
        契約者メールアドレス: { value: data.メールアドレス_個人 || '' },
        立会担当者: { value: data.立会担当者 || '' },
        立会担当者名: { value: data.立会担当者名 || '' },
        立会連絡先: { value: data.立会担当者電話番号 || '' },
        '引っ越し予定日': { value: data.引越予定日 || '' },
        第１立会希望: { value: data.第1希望日時 || null },
        第２立会希望: { value: data.第2希望日時 || null },
        第３立会希望: { value: data.第3希望日時 || null },
        解約理由: { value: data.解約理由 || '' }
      }
    };

    const updateResp = await fetch(`${B_DOMAIN}/k/v1/record.json`, {
      method: 'PUT',
      headers: { 'X-Cybozu-API-Token': API_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(updateBody)
    });

    if (!updateResp.ok) {
      const text = await updateResp.text();
      return res.status(500).json({ error: text });
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '通信エラー' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
