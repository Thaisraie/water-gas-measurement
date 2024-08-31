import express, { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import Measure from "./models/Measure";
import sequelize from "./database";

require("dotenv").config();

const app = express();
const port = 3000;

enum MeasureType {
  Water = "WATER",
  Gas = "GAS",
}

interface UploadRequestBody {
  image: string;
  customer_code: string;
  measure_datetime: Date;
  measure_type: MeasureType;
}

interface ConfirmRequestParams {
  measure_uuid: string;
  confirmed_value: number;
}

sequelize.sync({ force: true }).then(() => {
  console.log("Banco de dados sincronizado");
});

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.post(
  "/upload",
  async (req: Request<{}, {}, UploadRequestBody>, res: Response) => {
    const { image, customer_code, measure_datetime, measure_type } = req.body;

    if (!image || !customer_code || !measure_datetime || !measure_type) {
      return res.status(400).json({
        error_code: "INVALID_DATA",
        error_description:
          "Os dados fornecidos no corpo da requisição são inválidos",
      });
    }

    try {
      const genAI = new GoogleGenerativeAI(`${process.env.GEMINI_API_KEY}`);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt =
        "Você é um especialista em leitura de medidores. Extraia o valor numérico inteiro da leitura de um medidor de gás ou água a partir desta imagem em base64. Retorne explicitamente apenas o valor numérico inteiro.";

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: image,
            mimeType: "image/png",
          },
        },
      ]);
      const response = result.response;
      const leitura = parseInt(response.text(), 10);
      const uuid = uuidv4();
      const { image_file, measure_value, measure_uuid } = await Measure.create({
        image_file: image,
        measure_value: leitura,
        measure_uuid: uuid,
        customer_code,
        measure_datetime,
        measure_type,
        has_confirmed: false,
      });

      if (!image_file) {
        return res.status(400).json({
          error_code: "INVALID_DATA",
          error_description:
            "Os dados fornecidos no corpo da requisição são inválidos",
        });
      }

      return res.status(200).json({
        image_url: `${req.protocol}://${req.get(
          "host"
        )}/images/${measure_uuid}`,
        measure_value,
        measure_uuid,
      });
    } catch {
      return res.status(400).json({
        error_code: "INVALID_DATA",
        error_description:
          "Os dados fornecidos no corpo da requisição são inválidos",
      });
    }
  }
);

app.patch(
  "/confirm",
  async (req: Request<{}, {}, ConfirmRequestParams>, res: Response) => {
    const { measure_uuid, confirmed_value } = req.body;

    if (!measure_uuid || !confirmed_value) {
      return res.status(400).json({
        error_code: "INVALID_DATA",
        error_description:
          "Os dados fornecidos no corpo da requisição são inválidos",
      });
    }

    const measures = await Measure.findOne({
      where: { measure_uuid },
      attributes: ["has_confirmed"],
    });

    if (!measures) {
      return res.status(404).json({
        error_code: "MEASURE_NOT_FOUND",
        error_description: "Leitura não encontrada",
      });
    }

    if (measures && measures.has_confirmed) {
      return res.status(409).json({
        error_code: "CONFIRMATION_DUPLICATE",
        error_description: "Leitura já confirmada",
      });
    }

    const [measure] = await Measure.update(
      { measure_value: confirmed_value, has_confirmed: true },
      { where: { measure_uuid } }
    );

    if (measure === 0) {
      return res.status(400).json({
        error_code: "INVALID_DATA",
        error_description:
          "Os dados fornecidos no corpo da requisição são inválidos",
      });
    }

    res.status(200).json({ success: true });
  }
);

app.get("/:customer_code/list", async (req: Request, res: Response) => {
  let measures = null;
  const customerCode = req.params.customer_code;
  const measureType = req.query.measure_type as MeasureType;

  if (measureType) {
    measures = await Measure.findAll({
      where: { customer_code: customerCode, measure_type: measureType },
      attributes: [
        "measure_uuid",
        "measure_datetime",
        "measure_type",
        "has_confirmed",
        "image_url",
      ],
    });
  } else {
    measures = await Measure.findAll({
      where: { customer_code: customerCode },
      attributes: [
        "measure_uuid",
        "measure_datetime",
        "measure_type",
        "has_confirmed",
        "image_url",
      ],
    });
  }

  if (!measures.length) {
    return res.status(404).json({
      error_code: "MEASURES_NOT_FOUND",
      error_description: "Nenhuma leitura encontrada",
    });
  }

  res.status(200).json({ customer_code: customerCode, measures });
});

app.get("/images/:id", async (req, res) => {
  try {
    const image = await Measure.findOne({
      where: { measure_uuid: req.params.id },
    });

    if (image) {
      const imageBuffer = Buffer.from(image.image_file, "base64");

      res.setHeader("Content-Type", "image/jpeg");
      res
        .status(200)
        .json(imageBuffer);
    } else {
      return res.status(404).json({
        error_code: "MEASURES_NOT_FOUND",
        error_description: "Nenhuma leitura encontrada",
      });
    }
  } catch (error) {
    return res.status(404).json({
      error_code: "MEASURES_NOT_FOUND",
      error_description: "Nenhuma leitura encontrada",
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor funcionando http://localhost:${port}`);
});
