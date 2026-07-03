require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const chatsConAsesor = new Set();

async function enviarMensaje(to, text) {
  await axios.post(
    `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text }
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

async function enviarLista(to) {
  await axios.post(
    `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: "Barbacoa Alex 🍖"
        },
        body: {
          text: "👋 ¡Hola! Bienvenido a Barbacoa Alex.\n\nSelecciona una opción:"
        },
        footer: {
          text: "Gracias por preferirnos ❤️"
        },
        action: {
          button: "Ver opciones",
          sections: [
            {
              title: "Opciones",
              rows: [
                { id: "menu", title: "🍖 Menú" },
                { id: "horarios", title: "🕒 Horarios" },
                { id: "ubicacion", title: "📍 Ubicación" },
                { id: "cotizacion", title: "👥 Cotización" },
                { id: "pedido", title: "📝 Hacer pedido" }
              ]
            }
          ]
        }
      }
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from;

    if (chatsConAsesor.has(from)) {
      return res.sendStatus(200);
    }

    const text = message.text?.body?.toLowerCase().trim();
    const option = message.interactive?.list_reply?.id;

    if (text === "hola" || text === "buenas" || text === "menu" || text === "menú") {
      await enviarLista(from);
    }

    else if (option === "menu" || text === "1") {
      await enviarMensaje(from, "🍖 Te compartimos nuestro menú. En un momento enviaremos la imagen del menú.");
    }

    else if (option === "horarios" || text === "2") {
      await enviarMensaje(from,
`🕒 Horario de atención

📅 Domingos
🕗 8:00 a.m. a 3:00 p.m.

📌 Envíanos mensaje para confirmar si aún tenemos barbacoa disponible.`
      );
    }

    else if (option === "ubicacion" || text === "3") {
      await enviarMensaje(from,
`📍 Nuestra ubicación:

https://www.google.com.mx/maps/place/Barbacoa+Alex/@19.6732768,-99.222316,17z`
      );
    }

    else if (option === "cotizacion" || text === "4") {
      await enviarMensaje(from, "👥 ¡Gracias por contactarnos! En un momento estaremos contigo para brindarte una cotización personalizada. 🍖");
      chatsConAsesor.add(from);
    }

    else if (option === "pedido" || text === "5") {
      await enviarMensaje(from, "📝 ¡Gracias por comunicarte con Barbacoa Alex! En un momento estaremos contigo para tomar tu pedido. 🍖");
      chatsConAsesor.add(from);
    }

    else {
      await enviarLista(from);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`🍖 Bot Barbacoa Alex corriendo en puerto ${process.env.PORT}`);
});