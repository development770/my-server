import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

// すべてのオリジンからのアクセスを許可（CORS対応）
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// テスト用GET
app.get('/', (req, res) => {
  res.send('✅ Kintone Bridge Server is running');
});

// POST用エンドポイント
app.post('/send-to-b', async (req, res) => {
  try {
    const { record } = req.body;
    if (!record) return res.status(400).json({ message: 'No record data received' });

    // 日付・時間・分を結合して ISO文字列に変換
    const makeDatetime = (date, hour, minute) => {
      if (!date || hour === undefined || minute === undefined) return null;
      return `${date}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00Z`;
    };

    const bRecord = {
      第１立会希望: { value: makeDatetime(record['第1希望日']?.value, record['時間']?.value, record['分']?.value) },
      第２立会希望: { value: makeDatetime(record['第2希望日']?.value, record['時間2']?.value, record['分2']?.value) },
      第３立会希望: { value: makeDatetime(record['第3希望日']?.value, record['時間3']?.value, record['分3']?.value) }
    };

    // B社kintoneへPUT（updateKey=契約NO）
    const response = await fetch(
      `https://${process.env.B_KINTONE_DOMAIN}/k/v1/records.json`,
      {
        method: 'PUT',
        headers: {
          'X-Cybozu-API-Token': process.env.B_KINTONE_API_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app: process.env.B_KINTONE_APP_ID,
          updateKey: { field: '契約NO', value: record['契約NO']?.value },
          record: bRecord
        })
      }
    );

    const result = await response.json();
    if (!response.ok) {
      return res.status(500).json(result);
    }

    res.json({ message: '✅ Data sent successfully', result });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
