require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const BASE_URL = "https://barbacoa-alex-bot.onrender.com";

const chatsConAsesor = new Map();
const TIEMPO_ASESOR = 4 * 60 * 1000; // 4 minutos

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

async function enviarImagenMenu(to) {
  await axios.post(
    `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: {
        link: `${BASE_URL}/menu.png`,
        caption:
`*Menú Barbacoa Alex*

Para hacer un pedido, responde con la opción:

📝 *5. Hacer pedido*

O escribe: *pedido*`
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

async function enviarLista(to) {
  await axios.post(
    `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: "BARBACOA ALEX" },
        body: {
          text:
`👋 ¡Hola! Bienvenidos a *Barbacoa Alex*.

Gracias por comunicarte con nosotros. ¿En qué podemos ayudarte hoy?

Selecciona una opción para continuar:`
        },
        footer: { text: "¡Será un gusto atenderte!" },
        action: {
          button: "Ver opciones",
          sections: [
            {
              title: "Opciones",
              rows: [
                { id: "menu", title: "🌮 Menú" },
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
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from;

    if (chatsConAsesor.has(from)) {
      const horaInicio = chatsConAsesor.get(from);
      const tiempoTranscurrido = Date.now() - horaInicio;

      if (tiempoTranscurrido < TIEMPO_ASESOR) {
        return res.sendStatus(200);
      }

      chatsConAsesor.delete(from);
    }

    const text = message.text?.body?.toLowerCase().trim() || "";
    const option =
      message.interactive?.list_reply?.id ||
      message.interactive?.button_reply?.id ||
      "";

    if (
      text === "hola" ||
      text === "buenas" ||
      text === "menu" ||
      text === "menú"
    ) {
      await enviarLista(from);
    }

    else if (option === "menu" || text === "1") {
      await enviarImagenMenu(from);
    }

    else if (option === "horarios" || text === "2") {
      await enviarMensaje(from,
`🕒 *Horario de atención*

Te esperamos los domingos de:
🕗 8:00 a.m. a 3:00 p.m.

Te recomendamos escribirnos para consultar disponibilidad antes de tu visita.`
      );
    }

    else if (option === "ubicacion" || text === "3") {
      await enviarMensaje(from,
`📍 *Encuéntranos*

https://www.google.com.mx/maps/place/Barbacoa+Alex/@19.6732768,-99.222316,17z/data=!3m1!4b1!4m6!3m5!1s0x85d21f0a333a61f7:0xcc1e2a79dab1c2ca!8m2!3d19.6732768!4d-99.2197411!16s%2Fg%2F11tnm4dw3x`
      );
    }

    else if (
      option === "cotizacion" ||
      text === "4" ||
      text.includes("cotizacion") ||
      text.includes("cotización") ||
      text.includes("cotizar")
    ) {
      await enviarMensaje(from,
`👥 ¡Gracias por contactarnos!

En un momento te atenderemos para brindarte una cotización personalizada.`
      );

      chatsConAsesor.set(from, Date.now());
    }

    else if (
      option === "pedido" ||
      text === "5" ||
      text.includes("pedido") ||
      text.includes("pedir") ||
      text.includes("ordenar")
    ) {
      await enviarMensaje(from,
`📝 ¡Gracias por comunicarte con *Barbacoa Alex*!

En un momento te atenderemos.

Por favor, escribe tu pedido y con gusto te ayudaremos.`
      );

      chatsConAsesor.set(from, Date.now());
    }

    else {
      await enviarMensaje(from,
`😊 Gracias por tu mensaje.

En un momento te atenderemos.`
      );

      chatsConAsesor.set(from, Date.now());
    }

    res.sendStatus(200);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Bot Barbacoa Alex corriendo en puerto ${process.env.PORT}`);
});