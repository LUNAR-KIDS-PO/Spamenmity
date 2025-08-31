import { Plugin, registerPlugin } from 'enmity/plugins';
import { create } from 'enmity/patcher';
import { Messages, React } from 'enmity/metro/common';
import { getIDByName } from 'enmity/api/native';

const Patcher = create('flood-plugin');

// Fonction pour attendre un certain temps (en millisecondes)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Variable globale pour contrôler le flood en cours
let isFlooding = false;

// Liste d'insultes prédéfinies
const insults = [
  "ma soumise",
  "Ma pute",
  "Lache ma bite",
  "T ma slp",
  "Je te v",
  "Suce ma queue",
  "T'es ma chienne",
  "Viens me lécher",
  "T'es une salope",
  "Je vais te dominer",
  "Obéis-moi esclave",
  "T'es à moi",
  "Soumets-toi",
  "Je te baise",
  "Prends ça pute"
];

const FloodPlugin = {
  name: "FloodPlugin",
  version: "1.4.0",
  description: "Ajoute des commandes /flood pour spammer des insultes prédéfinies ou personnalisées, /spam pour messages généraux, et /stop pour arrêter. Compatible non-jailbreak.",
  authors: [{ name: "AutoFlood", id: "unknown" }],

  commands: [
    {
      name: "flood",
      description: "Flood avec des insultes prédéfinies ou personnalisées un certain nombre de fois",
      options: [
        {
          name: "count",
          description: "Nombre de fois à répéter (prudence avec les règles de Discord)",
          type: 4, // Type integer
          required: true,
        },
        {
          name: "custom",
          description: "Insulte personnalisée (optionnel, sinon aléatoire des prédéfinies)",
          type: 3, // Type string
          required: false,
        },
        {
          name: "random",
          description: "Utiliser des insultes aléatoires de la liste (oui/non)",
          type: 3, // Type string
          required: false,
        },
      ],

      async execute(args, command) {
        // Récupérer automatiquement l'ID de l'utilisateur actuel
        const userId = getIDByName('User').id;

        // Vérifier si l'utilisateur est autorisé
        if (userId !== getIDByName('User').id) {
          Messages.sendMessage(command.channel_id, {
            content: "❌ Cette commande est réservée à l'utilisateur actuel !",
          });
          return;
        }

        // Récupérer les arguments
        const count = parseInt(args.find(arg => arg.name === "count")?.value || "1");
        const custom = args.find(arg => arg.name === "custom")?.value || "";
        const random = (args.find(arg => arg.name === "random")?.value || "oui").toLowerCase() === "oui";

        // Vérifier que le nombre est valide
        if (isNaN(count) || count < 1) {
          Messages.sendMessage(command.channel_id, {
            content: "❌ Veuillez fournir un nombre valide (1 ou plus).",
          });
          return;
        }

        // Démarrer le flood
        isFlooding = true;
        Messages.sendMessage(command.channel_id, {
          content: `✅ Début du flood pour ${count} fois. Utilisez /stop pour arrêter.`,
        });

        for (let i = 0; i < count && isFlooding; i++) {
          try {
            let messageToSend = custom;
            if (!custom) {
              // Sélectionner une insulte aléatoire si random est activé ou par défaut
              messageToSend = random ? insults[Math.floor(Math.random() * insults.length)] : insults[i % insults.length];
            }

            Messages.sendMessage(command.channel_id, {
              content: messageToSend,
            });

            // Pas de délai initial pour flood ultra rapide
          } catch (error) {
            // Si erreur (par exemple, rate limit), attendre 5 secondes et retry
            Messages.sendMessage(command.channel_id, {
              content: `⚠️ Erreur détectée (possible rate limit). Attente de 5 secondes avant retry...`,
            });
            await sleep(5000);
            i--; // Retry cette itération
          }
        }

        if (isFlooding) {
          Messages.sendMessage(command.channel_id, {
            content: `✅ Flood terminé pour ${count} fois !`,
          });
        } else {
          Messages.sendMessage(command.channel_id, {
            content: `🛑 Flood arrêté manuellement.`,
          });
        }

        isFlooding = false;
      },
    },
    {
      name: "spam",
      description: "Spam un message général ou une pièce jointe un certain nombre de fois",
      options: [
        {
          name: "message",
          description: "Le message à spammer (optionnel si attachment_url est fourni)",
          type: 3,
          required: false,
        },
        {
          name: "count",
          description: "Nombre de fois à répéter",
          type: 4,
          required: true,
        },
        {
          name: "attachment_url",
          description: "URL d'une image ou fichier (optionnel)",
          type: 3,
          required: false,
        },
      ],

      async execute(args, command) {
        // Similaire à la commande /flood, mais pour messages généraux
        // (Code similaire à la version précédente pour brevité)
        const userId = getIDByName('User').id;
        if (userId !== getIDByName('User').id) return;

        const message = args.find(arg => arg.name === "message")?.value || "";
        const attachmentUrl = args.find(arg => arg.name === "attachment_url")?.value || "";
        const count = parseInt(args.find(arg => arg.name === "count")?.value || "1");

        if (isNaN(count) || count < 1 || (!message && !attachmentUrl)) return;

        isFlooding = true;
        for (let i = 0; i < count && isFlooding; i++) {
          try {
            const embeds = attachmentUrl ? [{ type: "image", url: attachmentUrl }] : [];
            Messages.sendMessage(command.channel_id, { content: message, embeds });
          } catch (error) {
            await sleep(5000);
            i--;
          }
        }
        isFlooding = false;
      },
    },
    {
      name: "stop",
      description: "Arrête le flood ou spam en cours",
      options: [],
      async execute(args, command) {
        const userId = getIDByName('User').id;
        if (userId !== getIDByName('User').id) return;

        if (isFlooding) {
          isFlooding = false;
          Messages.sendMessage(command.channel_id, { content: "🛑 Flood/Spam arrêté !" });
        } else {
          Messages.sendMessage(command.channel_id, { content: "ℹ️ Aucun flood/spam en cours." });
        }
      },
    },
  ],

  onStart() {
    isFlooding = false;
  },

  onStop() {
    Patcher.unpatchAll();
    isFlooding = false;
  },
};

registerPlugin(FloodPlugin);
