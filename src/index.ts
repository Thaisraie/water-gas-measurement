import express, { Request, Response } from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import bodyParser from 'body-parser';

require('dotenv').config()

const app = express();
const port = 3000;

enum MeasureType {
  Water = 'WATER',
  Gas = 'GAS'
}

interface UploadRequestBody {
  image: string;
  customer_code: string;
  measure_datetime: Date;
  measure_type: MeasureType;
}

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.post('/upload', async (req: Request<{}, {}, UploadRequestBody>, res: Response) => {
  const { image, customer_code, measure_datetime, measure_type } = req.body;

  if (!image || !customer_code || !measure_datetime || !measure_type) {
    return res.status(400).json({
      error_code: 'INVALID_DATA',
      error_description: 'Os dados fornecidos no corpo da requisição são inválidos'
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(`${process.env.GEMINI_API_KEY}`);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash'});
    const prompt = `Você é um especialista em leitura de medidores. Extraia o valor numérico inteiro da leitura de um medidor de gás ou água a partir desta imagem em base64: ${image}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const leitura = response.text();
    
    res.status(200).json({
      image_url: '',
      measure_value: leitura,
      measure_uuid: ''
    });
  } catch {
    res.status(400).json({
      error_code: 'INVALID_DATA',
      error_description: 'Os dados fornecidos no corpo da requisição são inválidos'
    });
  }
});

app.post('/confirm', (req: Request, res: Response) => {
  const { measure_uuid, confirmed_value } = req.body;
  
  res.sendStatus(200);
  res.send(measure_uuid);
});

app.get('/:customerCode/list', (req: Request, res: Response) => {
  const customerCode = req.params.customerCode;

  res.send(`Listando informações para o cliente: ${customerCode}`);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

function base64ToBuffer(base64Data: string): Buffer {
  const base64DataClean = base64Data.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64DataClean, 'base64');
}