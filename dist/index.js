"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const generative_ai_1 = require("@google/generative-ai");
const body_parser_1 = __importDefault(require("body-parser"));
const uuid_1 = require("uuid");
const Measure_1 = __importDefault(require("./models/Measure"));
const database_1 = __importDefault(require("./database"));
require("dotenv").config();
const app = (0, express_1.default)();
const port = 3000;
var MeasureType;
(function (MeasureType) {
    MeasureType["Water"] = "WATER";
    MeasureType["Gas"] = "GAS";
})(MeasureType || (MeasureType = {}));
database_1.default.sync({ force: true }).then(() => {
    console.log("Banco de dados sincronizado");
});
app.use(body_parser_1.default.json({ limit: "50mb" }));
app.use(body_parser_1.default.urlencoded({ limit: "50mb", extended: true }));
app.post("/upload", async (req, res) => {
    const { image, customer_code, measure_datetime, measure_type } = req.body;
    if (!image || !customer_code || !measure_datetime || !measure_type) {
        return res.status(400).json({
            error_code: "INVALID_DATA",
            error_description: "Os dados fornecidos no corpo da requisição são inválidos",
        });
    }
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(`${process.env.GEMINI_API_KEY}`);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = "Você é um especialista em leitura de medidores. Extraia o valor numérico inteiro da leitura de um medidor de gás ou água a partir desta imagem em base64. Retorne explicitamente apenas o valor numérico inteiro.";
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
        const uuid = (0, uuid_1.v4)();
        const { image_file, measure_value, measure_uuid } = await Measure_1.default.create({
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
                error_description: "Os dados fornecidos no corpo da requisição são inválidos",
            });
        }
        return res.status(200).json({
            image_url: `${req.protocol}://${req.get("host")}/images/${measure_uuid}`,
            measure_value,
            measure_uuid,
        });
    }
    catch {
        return res.status(400).json({
            error_code: "INVALID_DATA",
            error_description: "Os dados fornecidos no corpo da requisição são inválidos",
        });
    }
});
app.patch("/confirm", async (req, res) => {
    const { measure_uuid, confirmed_value } = req.body;
    if (!measure_uuid || !confirmed_value) {
        return res.status(400).json({
            error_code: "INVALID_DATA",
            error_description: "Os dados fornecidos no corpo da requisição são inválidos",
        });
    }
    const measures = await Measure_1.default.findOne({
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
    const [measure] = await Measure_1.default.update({ measure_value: confirmed_value, has_confirmed: true }, { where: { measure_uuid } });
    if (measure === 0) {
        return res.status(400).json({
            error_code: "INVALID_DATA",
            error_description: "Os dados fornecidos no corpo da requisição são inválidos",
        });
    }
    res.status(200).json({ success: true });
});
app.get("/:customer_code/list", async (req, res) => {
    let measures = null;
    const customerCode = req.params.customer_code;
    const measureType = req.query.measure_type;
    if (measureType) {
        measures = await Measure_1.default.findAll({
            where: { customer_code: customerCode, measure_type: measureType },
            attributes: [
                "measure_uuid",
                "measure_datetime",
                "measure_type",
                "has_confirmed",
                "image_url",
            ],
        });
    }
    else {
        measures = await Measure_1.default.findAll({
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
        const image = await Measure_1.default.findOne({
            where: { measure_uuid: req.params.id },
        });
        if (image) {
            const imageBuffer = Buffer.from(image.image_file, "base64");
            res.setHeader("Content-Type", "image/jpeg");
            res
                .status(200)
                .json(imageBuffer);
        }
        else {
            return res.status(404).json({
                error_code: "MEASURES_NOT_FOUND",
                error_description: "Nenhuma leitura encontrada",
            });
        }
    }
    catch (error) {
        return res.status(404).json({
            error_code: "MEASURES_NOT_FOUND",
            error_description: "Nenhuma leitura encontrada",
        });
    }
});
app.listen(port, () => {
    console.log(`Servidor funcionando http://localhost:${port}`);
});
